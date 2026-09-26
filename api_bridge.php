<?php
/**
 * Universal PHP API Bridge for cPanel / Shared Hosting
 * รองรับการทำงานของ API เมื่อรันผ่าน Apache / PHP Direct Routing
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax']);
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. โหลดข้อมูลการเชื่อมต่อฐานข้อมูลจาก .env
function ensurePhotoIntegrationsTable($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS school_photo_integrations (school_id INT UNSIGNED NOT NULL PRIMARY KEY, web_app_url VARCHAR(500) NOT NULL, bridge_secret VARCHAR(255) NOT NULL, folder_id VARCHAR(255) NOT NULL DEFAULT '', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!$pdo->query("SHOW COLUMNS FROM school_photo_integrations LIKE 'folder_id'")->fetch()) {
        $pdo->exec("ALTER TABLE school_photo_integrations ADD COLUMN folder_id VARCHAR(255) NOT NULL DEFAULT ''");
    }
}
function photoUserCanAccessProject($pdo, $user, $schoolId, $projectId) {
    if (intval($user['schoolId'] ?? 0) !== $schoolId) return false;
    $stmt = $pdo->prepare('SELECT responsible_person, details_json FROM projects WHERE id = ? AND school_id = ? LIMIT 1');
    $stmt->execute([$projectId, $schoolId]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$project) return false;
    if (in_array($user['role'] ?? '', ['admin', 'director'], true) || preg_match('/เจ้าหน้าที่แผน|งานแผนปฏิบัติการ/u', $user['position'] ?? '')) return true;
    $details = json_decode($project['details_json'] ?? '', true) ?: [];
    if (!empty($details['responsibleId']) && intval($details['responsibleId']) === intval($user['id'])) return true;
    if (!empty($details['proposerCitizenId']) && !empty($user['citizenId']) && preg_replace('/\D/', '', $details['proposerCitizenId']) === preg_replace('/\D/', '', $user['citizenId'])) return true;
    $name = preg_replace('/\s+/u', '', $user['fullName'] ?? '');
    foreach ([$project['responsible_person'], $details['proposerName'] ?? ''] as $owner) {
        if ($name !== '' && $name === preg_replace('/\s+/u', '', $owner)) return true;
    }
    return false;
}

function loadEnvConfig() {
    $envFile = __DIR__ . '/.env';
    $config = [
        'DB_HOST' => '127.0.0.1',
        'DB_PORT' => 3306,
        'DB_NAME' => 'school_budget_db',
        'DB_USER' => 'root',
        'DB_PASS' => '',
    ];

    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $val = trim($parts[1], " \t\n\r\0\x0B\"'");
                if (isset($config[$key]) || strpos($key, 'DB_') === 0 || in_array($key, ['GEMINI_API_KEY', 'PROJECT_PHOTO_SCRIPT_URL', 'PROJECT_PHOTO_SECRET'], true)) {
                    $config[$key] = $val;
                }
            }
        }
    }

    // ตรวจสอบ config/db_config.json เพิ่มเติม
    $jsonConfig = __DIR__ . '/config/db_config.json';
    if (file_exists($jsonConfig)) {
        $jsonData = json_decode(file_get_contents($jsonConfig), true);
        if (is_array($jsonData)) {
            if (!empty($jsonData['host'])) $config['DB_HOST'] = $jsonData['host'];
            if (!empty($jsonData['port'])) $config['DB_PORT'] = intval($jsonData['port']);
            if (!empty($jsonData['dbname'])) $config['DB_NAME'] = $jsonData['dbname'];
            if (!empty($jsonData['database'])) $config['DB_NAME'] = $jsonData['database'];
            if (!empty($jsonData['user'])) $config['DB_USER'] = $jsonData['user'];
            if (isset($jsonData['pass'])) $config['DB_PASS'] = $jsonData['pass'];
            if (isset($jsonData['password'])) $config['DB_PASS'] = $jsonData['password'];
        }
    }

    return $config;
}

$lastDbError = '';

// 2. ฟังก์ชันเชื่อมต่อ MySQL PDO พร้อม Fallback อัตโนมัติ (TCP / cPanel Socket)
function getDbPDO($customConfig = null) {
    global $lastDbError;
    static $cachedPdo = null;
    if ($customConfig === null && $cachedPdo !== null) return $cachedPdo;

    $cfg = $customConfig ?: loadEnvConfig();
    $host = !empty($cfg['DB_HOST']) ? $cfg['DB_HOST'] : (!empty($cfg['host']) ? $cfg['host'] : 'localhost');
    $port = !empty($cfg['DB_PORT']) ? intval($cfg['DB_PORT']) : (!empty($cfg['port']) ? intval($cfg['port']) : 3306);
    $dbname = !empty($cfg['DB_NAME']) ? $cfg['DB_NAME'] : (!empty($cfg['dbname']) ? $cfg['dbname'] : (!empty($cfg['database']) ? $cfg['database'] : ''));
    $user = !empty($cfg['DB_USER']) ? $cfg['DB_USER'] : (!empty($cfg['user']) ? $cfg['user'] : 'root');
    $pass = isset($cfg['DB_PASS']) ? $cfg['DB_PASS'] : (isset($cfg['pass']) ? $cfg['pass'] : (isset($cfg['password']) ? $cfg['password'] : ''));

    // หากรหัสผ่านว่างใน customConfig ให้ลองดึงจาก config ที่เคยบันทึกไว้ในเครื่อง
    if ($pass === '') {
        $saved = loadEnvConfig();
        if (!empty($saved['DB_PASS'])) {
            $pass = $saved['DB_PASS'];
        }
    }

    // รูปแบบ DSN สำหรับ cPanel / Localhost / TCP / Unix Socket
    $attempts = [
        "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
        "mysql:host=" . ($host === 'localhost' ? '127.0.0.1' : 'localhost') . ";port={$port};dbname={$dbname};charset=utf8mb4",
        "mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname={$dbname};charset=utf8mb4",
        "mysql:unix_socket=/tmp/mysql.sock;dbname={$dbname};charset=utf8mb4",
        "mysql:unix_socket=/var/run/mysqld/mysqld.sock;dbname={$dbname};charset=utf8mb4",
    ];

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 4,
    ];

    foreach ($attempts as $dsn) {
        try {
            $pdoInstance = new PDO($dsn, $user, $pass, $options);
            if ($customConfig === null) {
                $cachedPdo = $pdoInstance;
            }
            return $pdoInstance;
        } catch (PDOException $e) {
            $lastDbError = $e->getMessage();
            // ลองต่อด้วย trim(pass) เผื่อมี space ติดมา
            if ($pass !== trim($pass)) {
                try {
                    $pdoInstance = new PDO($dsn, $user, trim($pass), $options);
                    if ($customConfig === null) {
                        $cachedPdo = $pdoInstance;
                    }
                    return $pdoInstance;
                } catch (PDOException $e2) {
                    $lastDbError = $e2->getMessage();
                }
            }
        }
    }
    return null;
}

// 3. ฟังก์ชันจัดการไฟล์ Config ต่างๆ
function getSuperAdminPath() {
    $dir = __DIR__ . '/config';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir . '/super_admin.json';
}

function loadSuperAdminData() {
    $file = getSuperAdminPath();
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if (is_array($data)) return $data;
    }
    return [
        'username' => 'peyarm',
        'password' => '1-6',
        'isPasswordChanged' => false,
        'fullName' => 'ผู้ดูแลระบบส่วนกลาง (Super Admin)',
        'role' => 'superadmin',
    ];
}

function saveSuperAdminData($data) {
    file_put_contents(getSuperAdminPath(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function getUsersPath() {
    $dir = __DIR__ . '/config';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir . '/users.json';
}

function loadUsersData() {
    $pdo = getDbPDO();
    if ($pdo) {
        try {
            ensureUsersTableAndAdmins($pdo);
            $stmt = $pdo->query("SELECT id, school_id as schoolId, username, citizen_id as citizenId, password_hash as password, full_name as fullName, email, role, department, position, phone, avatar, is_active as isActive, is_password_changed as isPasswordChanged, status, created_at as registeredAt FROM `users` ORDER BY id ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (is_array($rows) && count($rows) > 0) {
                return array_map(function($u) {
                    $u['id'] = intval($u['id']);
                    $u['schoolId'] = intval($u['schoolId']);
                    $u['isActive'] = ($u['isActive'] == 1 || $u['isActive'] === true || $u['isActive'] === '1');
                    $u['isPasswordChanged'] = ($u['isPasswordChanged'] == 1 || $u['isPasswordChanged'] === true || $u['isPasswordChanged'] === '1');
                    return $u;
                }, $rows);
            }
        } catch (Exception $e) {
            error_log("loadUsersData MySQL error: " . $e->getMessage());
        }
    }

    $file = getUsersPath();
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveUsersData($data) {
    // 1. บันทึกลง JSON เป็น Cache สำรอง
    file_put_contents(getUsersPath(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // 2. ซิงค์ลง MySQL users table ด้วยเสมอ
    $pdo = getDbPDO();
    if ($pdo && is_array($data)) {
        try {
            ensureUsersTableAndAdmins($pdo);
            $stmt = $pdo->prepare("INSERT INTO `users` 
                (`id`, `school_id`, `username`, `citizen_id`, `password_hash`, `full_name`, `email`, `role`, `department`, `position`, `phone`, `is_active`, `is_password_changed`, `status`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  school_id = VALUES(school_id),
                  username = VALUES(username),
                  citizen_id = VALUES(citizen_id),
                  password_hash = VALUES(password_hash),
                  full_name = VALUES(full_name),
                  email = VALUES(email),
                  role = VALUES(role),
                  department = VALUES(department),
                  position = VALUES(position),
                  phone = VALUES(phone),
                  is_active = VALUES(is_active),
                  is_password_changed = VALUES(is_password_changed),
                  status = VALUES(status)");

            foreach ($data as $u) {
                if (empty($u['username']) || empty($u['fullName'])) continue;
                $uId = !empty($u['id']) ? intval($u['id']) : null;
                $schId = !empty($u['schoolId']) ? intval($u['schoolId']) : 1;
                $stmt->execute([
                    $uId,
                    $schId,
                    trim($u['username']),
                    trim($u['citizenId'] ?? ''),
                    trim($u['password'] ?? $u['password_hash'] ?? '123456'),
                    trim($u['fullName']),
                    trim($u['email'] ?? ''),
                    trim($u['role'] ?? 'teacher'),
                    trim($u['department'] ?? ''),
                    trim($u['position'] ?? ''),
                    trim($u['phone'] ?? ''),
                    isset($u['isActive']) ? ($u['isActive'] ? 1 : 0) : 1,
                    !empty($u['isPasswordChanged']) ? 1 : 0,
                    trim($u['status'] ?? 'approved')
                ]);
            }
        } catch (Exception $e) {
            error_log("saveUsersData MySQL sync error: " . $e->getMessage());
        }
    }
}

function getSchoolsPath() {
    $dir = __DIR__ . '/config';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir . '/schools_data.json';
}

function ensureSchoolsTable($pdo) {
    if (!$pdo) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `schools` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_code` VARCHAR(50) NOT NULL,
            `smis_code` VARCHAR(20) NOT NULL,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `school_key` VARCHAR(50) NOT NULL,
            `admin_username` VARCHAR(50) NOT NULL DEFAULT 'admin',
            `admin_password_plain` VARCHAR(100) DEFAULT '123456',
            `name` VARCHAR(255) NOT NULL,
            `province` VARCHAR(100) DEFAULT NULL,
            `education_area` VARCHAR(255) DEFAULT NULL,
            `director_name` VARCHAR(150) DEFAULT NULL,
            `phone` VARCHAR(50) DEFAULT NULL,
            `email` VARCHAR(100) DEFAULT NULL,
            `student_count` INT UNSIGNED DEFAULT 0,
            `project_count` INT UNSIGNED DEFAULT 0,
            `total_budget` DECIMAL(15,2) DEFAULT 0,
            `notes` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_smis` (`smis_code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // ตรวจสอบและเพิ่มคอลัมน์ student_count, project_count, total_budget อัตโนมัติหากตาราง schools ถูกสร้างไว้ก่อนหน้า
        $columns = $pdo->query("SHOW COLUMNS FROM `schools`")->fetchAll(PDO::FETCH_COLUMN);
        if ($columns && is_array($columns)) {
            foreach (['address' => 'VARCHAR(255) NULL', 'subdistrict' => 'VARCHAR(100) NULL', 'district' => 'VARCHAR(100) NULL', 'zipcode' => 'VARCHAR(10) NULL', 'affiliation' => 'VARCHAR(255) NULL', 'fiscal_year' => 'INT UNSIGNED NULL', 'logo_url' => 'LONGTEXT NULL'] as $column => $definition) {
                if (!in_array($column, $columns, true)) $pdo->exec("ALTER TABLE `schools` ADD COLUMN `$column` $definition");
            }
            $logoType = $pdo->query("SHOW COLUMNS FROM `schools` LIKE 'logo_url'")->fetch(PDO::FETCH_ASSOC);
            if ($logoType && strtolower($logoType['Type']) !== 'longtext') $pdo->exec("ALTER TABLE `schools` MODIFY COLUMN `logo_url` LONGTEXT NULL");
            if (!in_array('student_count', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `student_count` INT UNSIGNED DEFAULT 0 AFTER `email`");
            }
            if (!in_array('project_count', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `project_count` INT UNSIGNED DEFAULT 0 AFTER `student_count`");
            }
            if (!in_array('total_budget', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `total_budget` DECIMAL(15,2) DEFAULT 0 AFTER `project_count`");
            }
            if (!in_array('admin_password_plain', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `admin_password_plain` VARCHAR(100) DEFAULT '123456' AFTER `admin_username`");
            }
            if (!in_array('admin_username', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `admin_username` VARCHAR(50) NOT NULL DEFAULT 'admin' AFTER `school_key`");
            }
            if (!in_array('school_key', $columns)) {
                $pdo->exec("ALTER TABLE `schools` ADD COLUMN `school_key` VARCHAR(50) NOT NULL AFTER `is_active`");
            }
        }
    } catch (Exception $e) {
        error_log("Failed to ensure schools table: " . $e->getMessage());
        throw $e;
    }
}

function ensureUsersTableAndAdmins($pdo) {
    if (!$pdo) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `username` VARCHAR(100) NOT NULL,
            `password_hash` VARCHAR(255) DEFAULT '123456',
            `citizen_id` VARCHAR(20) DEFAULT NULL,
            `full_name` VARCHAR(150) NOT NULL,
            `email` VARCHAR(150) DEFAULT NULL,
            `role` VARCHAR(50) NOT NULL DEFAULT 'teacher',
            `department` VARCHAR(100) DEFAULT NULL,
            `position` VARCHAR(150) DEFAULT NULL,
            `phone` VARCHAR(50) DEFAULT NULL,
            `is_active` TINYINT(1) DEFAULT 1,
            `status` VARCHAR(20) DEFAULT 'approved',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $cols = $pdo->query("SHOW COLUMNS FROM `users`")->fetchAll(PDO::FETCH_COLUMN);
        if ($cols && is_array($cols)) {
            if (!in_array('password_hash', $cols)) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) DEFAULT '123456' AFTER `username`");
            }
            if (!in_array('status', $cols)) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `status` VARCHAR(20) DEFAULT 'approved' AFTER `is_active`");
            }
            if (!in_array('is_password_changed', $cols)) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `is_password_changed` TINYINT(1) DEFAULT 0 AFTER `is_active`");
            }
            if (!in_array('avatar', $cols)) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `avatar` VARCHAR(255) DEFAULT NULL AFTER `phone`");
            }
        }

        // ซิงค์ Admin จากตาราง schools เข้าสู่ตาราง users สำหรับทุกโรงเรียนที่ยังไม่มี Admin ใน users หรืออัปเดตรหัสผ่านให้ตรงกัน
        $schoolsStmt = $pdo->query("SELECT id, name, smis_code, admin_username, admin_password_plain, phone, email FROM `schools`");
        $allSchools = $schoolsStmt ? $schoolsStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        if (is_array($allSchools)) {
            foreach ($allSchools as $s) {
                if (empty($s['id'])) continue;
                $adminUser = trim($s['admin_username'] ?? ('admin_' . ($s['smis_code'] ?? $s['id'])));
                if (empty($adminUser)) $adminUser = 'admin';
                $adminPass = trim($s['admin_password_plain'] ?? '123456');
                if (empty($adminPass)) $adminPass = '123456';
                $schoolName = trim($s['name'] ?? ('โรงเรียนรหัส ' . ($s['smis_code'] ?? $s['id'])));

                $checkUserStmt = $pdo->prepare("SELECT id, password_hash FROM `users` WHERE `school_id` = ? AND (`role` = 'admin' OR `username` = ?) LIMIT 1");
                $checkUserStmt->execute([$s['id'], $adminUser]);
                $existingUser = $checkUserStmt->fetch(PDO::FETCH_ASSOC);

                if (!$existingUser) {
                    $insertUserStmt = $pdo->prepare("INSERT INTO `users` 
                        (`school_id`, `username`, `password_hash`, `full_name`, `citizen_id`, `email`, `role`, `department`, `position`, `phone`, `is_active`, `status`)
                        VALUES (?, ?, ?, ?, ?, ?, 'admin', 'กลุ่มบริหารงานงบประมาณ', 'เจ้าหน้าที่แผนงานและงบประมาณ', ?, 1, 'approved')");
                    $insertUserStmt->execute([
                        $s['id'],
                        $adminUser,
                        $adminPass,
                        "ผู้ดูแลระบบ ({$schoolName})",
                        $s['smis_code'] ?: $adminUser,
                        $s['email'] ?? '',
                        $s['phone'] ?? ''
                    ]);
                } else {
                    // หากมีอยู่แล้วแต่ password_hash ว่าง ให้เติมรหัสผ่านจาก schools
                    if (empty($existingUser['password_hash'])) {
                        $updStmt = $pdo->prepare("UPDATE `users` SET `password_hash` = ? WHERE `id` = ?");
                        $updStmt->execute([$adminPass, $existingUser['id']]);
                    }
                }
            }
        }
    } catch (Exception $e) {
        error_log("Failed to ensure users table & admins: " . $e->getMessage());
    }
}

function loadSchoolsData() {
    global $lastDbError;
    $pdo = getDbPDO();
    if (!$pdo) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: " . ($lastDbError ?: "โปรดตรวจสอบการตั้งค่า Host, Database, User, Password"));
    }
    ensureSchoolsTable($pdo);
    ensureUsersTableAndAdmins($pdo);
    $stmt = $pdo->query("SELECT id, school_code as schoolCode, smis_code as smisCode, is_active as isActive, school_key as schoolKey, admin_username as adminUsername, admin_password_plain as adminPasswordPlain, name, province, education_area as educationArea, director_name as directorName, phone, email, student_count as studentCount, project_count as projectCount, total_budget as totalBudget, notes FROM `schools` ORDER BY id ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!is_array($rows)) return [];
    return array_map(function($r) {
        $r['id'] = intval($r['id']);
        $r['isActive'] = ($r['isActive'] == 1 || $r['isActive'] === true || $r['isActive'] === '1');
        $r['studentCount'] = intval($r['studentCount'] ?? 0);
        $r['projectCount'] = intval($r['projectCount'] ?? 0);
        $r['totalBudget'] = floatval($r['totalBudget'] ?? 0);
        return $r;
    }, $rows);
}

function insertSchoolToDatabase($newSchool) {
    global $lastDbError;
    $pdo = getDbPDO();
    if (!$pdo) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: " . ($lastDbError ?: "โปรดตรวจสอบการตั้งค่า Host, Database, User, Password"));
    }
    ensureSchoolsTable($pdo);
    ensureUsersTableAndAdmins($pdo);
    $stmt = $pdo->prepare("INSERT INTO `schools` 
        (`school_code`, `smis_code`, `is_active`, `school_key`, `admin_username`, `admin_password_plain`, `name`, `province`, `education_area`, `director_name`, `phone`, `email`, `student_count`, `project_count`, `total_budget`, `notes`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          province = VALUES(province),
          education_area = VALUES(education_area),
          director_name = VALUES(director_name),
          phone = VALUES(phone),
          email = VALUES(email),
          is_active = VALUES(is_active)");
    $stmt->execute([
        $newSchool['schoolCode'] ?? ($newSchool['smisCode'] . '00'),
        $newSchool['smisCode'],
        !empty($newSchool['isActive']) ? 1 : 0,
        $newSchool['schoolKey'] ?? ('SCH-' . $newSchool['smisCode']),
        $newSchool['adminUsername'] ?? ('admin_' . $newSchool['smisCode']),
        $newSchool['adminPasswordPlain'] ?? '123456',
        $newSchool['name'],
        $newSchool['province'] ?? '',
        $newSchool['educationArea'] ?? '',
        $newSchool['directorName'] ?? '',
        $newSchool['phone'] ?? '',
        $newSchool['email'] ?? '',
        intval($newSchool['studentCount'] ?? 0),
        intval($newSchool['projectCount'] ?? 0),
        floatval($newSchool['totalBudget'] ?? 0),
        $newSchool['notes'] ?? 'บันทึกลงใน MySQL ตาราง schools สำเร็จ',
    ]);
    $insertedId = $pdo->lastInsertId();
    if ($insertedId) {
        $newSchool['id'] = intval($insertedId);
    } else {
        $stmtFind = $pdo->prepare("SELECT id FROM `schools` WHERE `smis_code` = ? LIMIT 1");
        $stmtFind->execute([$newSchool['smisCode']]);
        $foundId = $stmtFind->fetchColumn();
        if ($foundId) $newSchool['id'] = intval($foundId);
    }

    // บันทึกหรืออัปเดตบัญชี Admin ลงในตาราง users ของ MySQL โดยตรง
    try {
        $adminUser = trim($newSchool['adminUsername'] ?? ('admin_' . $newSchool['smisCode']));
        $adminPass = trim($newSchool['adminPasswordPlain'] ?? '123456');
        $schoolName = trim($newSchool['name'] ?? '');
        $schoolId = $newSchool['id'];

        $checkAdminStmt = $pdo->prepare("SELECT id FROM `users` WHERE `school_id` = ? AND (`username` = ? OR `role` = 'admin') LIMIT 1");
        $checkAdminStmt->execute([$schoolId, $adminUser]);
        $existingAdminId = $checkAdminStmt->fetchColumn();

        if ($existingAdminId) {
            $updAdmin = $pdo->prepare("UPDATE `users` SET `username` = ?, `password_hash` = ?, `full_name` = ?, `phone` = ?, `email` = ?, `is_active` = 1, `status` = 'approved' WHERE `id` = ?");
            $updAdmin->execute([$adminUser, $adminPass, "ผู้ดูแลระบบ ({$schoolName})", $newSchool['phone'] ?? '', $newSchool['email'] ?? '', $existingAdminId]);
        } else {
            $insAdmin = $pdo->prepare("INSERT INTO `users` 
                (`school_id`, `username`, `password_hash`, `full_name`, `citizen_id`, `email`, `role`, `department`, `position`, `phone`, `is_active`, `status`)
                VALUES (?, ?, ?, ?, ?, ?, 'admin', 'กลุ่มบริหารงานงบประมาณ', 'เจ้าหน้าที่แผนงานและงบประมาณ', ?, 1, 'approved')");
            $insAdmin->execute([
                $schoolId,
                $adminUser,
                $adminPass,
                "ผู้ดูแลระบบ ({$schoolName})",
                $newSchool['smisCode'] ?: $adminUser,
                $newSchool['email'] ?? '',
                $newSchool['phone'] ?? ''
            ]);
        }
    } catch (Exception $e) {
        error_log("Failed to insert admin into users: " . $e->getMessage());
    }

    return $newSchool;
}

function deleteSchoolFromDatabase($schoolId) {
    global $lastDbError;
    $pdo = getDbPDO();
    if (!$pdo) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: " . ($lastDbError ?: "โปรดตรวจสอบการตั้งค่า Host, Database, User, Password"));
    }
    ensureSchoolsTable($pdo);
    $stmt = $pdo->prepare("DELETE FROM `schools` WHERE `id` = ?");
    $stmt->execute([$schoolId]);
    return true;
}

function toggleSchoolInDatabase($schoolId) {
    global $lastDbError;
    $pdo = getDbPDO();
    if (!$pdo) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: " . ($lastDbError ?: "โปรดตรวจสอบการตั้งค่า Host, Database, User, Password"));
    }
    ensureSchoolsTable($pdo);
    $stmt = $pdo->prepare("SELECT is_active FROM `schools` WHERE `id` = ?");
    $stmt->execute([$schoolId]);
    $current = $stmt->fetchColumn();
    $newStatus = !($current == 1);
    $update = $pdo->prepare("UPDATE `schools` SET is_active = ? WHERE `id` = ?");
    $update->execute([$newStatus ? 1 : 0, $schoolId]);
    return $newStatus;
}

// 3. ฟังก์ชันบันทึกและอ่าน app_database.json
function getAppDatabasePath() {
    $dir = __DIR__ . '/config';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir . '/app_database.json';
}

function loadAppDataFile() {
    $file = getAppDatabasePath();
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveAppDataFile($data) {
    $file = getAppDatabasePath();
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function ensureAllAppTables($pdo) {
    if (!$pdo) return;
    try {
        ensureSchoolsTable($pdo);

        $pdo->exec("CREATE TABLE IF NOT EXISTS `fiscal_years` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `year` INT UNSIGNED NOT NULL DEFAULT 2568,
            `is_active` TINYINT(1) DEFAULT 1,
            `start_date` DATE DEFAULT NULL,
            `end_date` DATE DEFAULT NULL,
            `total_students` INT UNSIGNED DEFAULT 0,
            `teacher_count` INT UNSIGNED DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $fyColumns = $pdo->query('SHOW COLUMNS FROM fiscal_years')->fetchAll(PDO::FETCH_COLUMN);
        foreach (['is_proposal_open' => 'TINYINT(1) DEFAULT 1', 'proposal_open_date' => 'DATE NULL', 'proposal_close_date' => 'DATE NULL', 'proposal_notice' => 'TEXT NULL'] as $column => $definition) {
            if (!in_array($column, $fyColumns, true)) $pdo->exec("ALTER TABLE `fiscal_years` ADD COLUMN `$column` $definition");
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS `projects` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `project_code` VARCHAR(50) NOT NULL,
            `project_name` VARCHAR(255) NOT NULL,
            `rationale` TEXT DEFAULT NULL,
            `objectives` TEXT DEFAULT NULL,
            `quantitative_goals` TEXT DEFAULT NULL,
            `qualitative_goals` TEXT DEFAULT NULL,
            `kpis` TEXT DEFAULT NULL,
            `procedures` TEXT DEFAULT NULL,
            `duration_start` VARCHAR(50) DEFAULT NULL,
            `duration_end` VARCHAR(50) DEFAULT NULL,
            `location` VARCHAR(255) DEFAULT NULL,
            `target_group` VARCHAR(255) DEFAULT NULL,
            `responsible_person` VARCHAR(150) NOT NULL DEFAULT '',
            `responsible_id` INT UNSIGNED DEFAULT NULL,
            `department` VARCHAR(100) NOT NULL DEFAULT 'ฝ่ายวิชาการ',
            `budget_source` VARCHAR(150) NOT NULL DEFAULT 'เงินอุดหนุนรายหัว',
            `allocated_budget` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `spent_budget` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `remaining_budget` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `status` VARCHAR(50) NOT NULL DEFAULT 'not_started',
            `approval_status` VARCHAR(50) NOT NULL DEFAULT 'approved',
            `sort_order` INT UNSIGNED DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Preserve the approval workflow and itemized proposal across page reloads.
        $projectColumns = $pdo->query("SHOW COLUMNS FROM `projects`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('details_json', $projectColumns, true)) $pdo->exec("ALTER TABLE `projects` ADD COLUMN `details_json` LONGTEXT NULL");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `revenues` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `category` VARCHAR(50) NOT NULL DEFAULT 'subsidy',
            `item_name` VARCHAR(255) NOT NULL,
            `rate_per_head` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            `eligible_count` INT UNSIGNED NOT NULL DEFAULT 0,
            `calculated_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `is_custom_rate` TINYINT(1) NOT NULL DEFAULT 0,
            `note` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $revenueCategory = $pdo->query("SHOW COLUMNS FROM `revenues` LIKE 'category'")->fetch(PDO::FETCH_ASSOC);
        if ($revenueCategory && stripos($revenueCategory['Type'], 'enum(') === 0) {
            $pdo->exec("ALTER TABLE `revenues` MODIFY COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'subsidy'");
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS `budget_allocations` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `department_name` VARCHAR(150) NOT NULL,
            `percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            `allocated_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `spent_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `remaining_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `color_hex` VARCHAR(20) DEFAULT '#2563eb',
            `description` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $allocationColumns = $pdo->query('SHOW COLUMNS FROM budget_allocations')->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('reserve_type', $allocationColumns, true)) {
            $pdo->exec("ALTER TABLE budget_allocations ADD COLUMN reserve_type VARCHAR(20) NULL");
        }
        $pdo->exec("CREATE TABLE IF NOT EXISTS budget_settings (
            school_id INT UNSIGNED NOT NULL,
            fiscal_year_id INT UNSIGNED NOT NULL,
            carryover DECIMAL(14,2) NOT NULL DEFAULT 0,
            manual_total DECIMAL(14,2) NULL,
            PRIMARY KEY (school_id, fiscal_year_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $budgetColumns = $pdo->query('SHOW COLUMNS FROM budget_settings')->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('learner_initialized', $budgetColumns, true)) $pdo->exec('ALTER TABLE budget_settings ADD COLUMN learner_initialized TINYINT(1) NOT NULL DEFAULT 0');

        $pdo->exec("CREATE TABLE IF NOT EXISTS `budget_transactions` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `project_id` INT UNSIGNED NOT NULL DEFAULT 0,
            `doc_number` VARCHAR(50) NOT NULL,
            `transaction_date` VARCHAR(50) NOT NULL,
            `item_description` VARCHAR(255) NOT NULL,
            `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `payee` VARCHAR(150) NOT NULL,
            `receipt_number` VARCHAR(100) DEFAULT NULL,
            `approved_by` VARCHAR(150) NOT NULL,
            `status` VARCHAR(50) NOT NULL DEFAULT 'approved',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `students` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `grade_level` VARCHAR(50) NOT NULL,
            `stage` VARCHAR(50) NOT NULL DEFAULT 'ประถม',
            `male_count` INT UNSIGNED NOT NULL DEFAULT 0,
            `female_count` INT UNSIGNED NOT NULL DEFAULT 0,
            `total_count` INT UNSIGNED NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `username` VARCHAR(100) NOT NULL,
            `citizen_id` VARCHAR(20) DEFAULT NULL,
            `full_name` VARCHAR(150) NOT NULL,
            `email` VARCHAR(150) DEFAULT NULL,
            `role` VARCHAR(50) NOT NULL DEFAULT 'teacher',
            `department` VARCHAR(100) DEFAULT NULL,
            `position` VARCHAR(150) DEFAULT NULL,
            `phone` VARCHAR(50) DEFAULT NULL,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `learner_activities` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `activity_name` VARCHAR(255) NOT NULL,
            `percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            `allocated_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `spent_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `remaining_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            `note` TEXT DEFAULT NULL,
            `description` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $activityColumns = $pdo->query('SHOW COLUMNS FROM learner_activities')->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('description', $activityColumns, true)) $pdo->exec('ALTER TABLE learner_activities ADD COLUMN description TEXT NULL');

        $pdo->exec("CREATE TABLE IF NOT EXISTS `strategies` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `fiscal_year_id` INT UNSIGNED NOT NULL DEFAULT 1,
            `code` VARCHAR(50) NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `description` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } catch (Exception $e) {
        error_log("Failed to ensure app tables: " . $e->getMessage());
        throw $e;
    }
}

function syncAppDataToMySQL($pdo, $data, $schoolIdParam = 0) {
    if (!$pdo) return;

    $schoolId = intval($schoolIdParam > 0 ? $schoolIdParam : ($data['school']['id'] ?? 0));
    if ($schoolId < 1) throw new Exception('กรุณาระบุโรงเรียนก่อนบันทึกข้อมูล');
    $exists = $pdo->prepare('SELECT id FROM schools WHERE id = ?');
    $exists->execute([$schoolId]);
    if (!$exists->fetchColumn()) throw new Exception('ไม่พบโรงเรียนใน MySQL');

    // 1. Sync school
    if (!empty($data['school']) && is_array($data['school'])) {
        $school = $data['school'];
        $fields = ['name' => 'name', 'address' => 'address', 'subdistrict' => 'subdistrict', 'district' => 'district', 'province' => 'province', 'zipcode' => 'zipcode', 'affiliation' => 'affiliation', 'educationArea' => 'education_area', 'directorName' => 'director_name', 'phone' => 'phone', 'email' => 'email', 'logoUrl' => 'logo_url', 'fiscalYear' => 'fiscal_year'];
        $changes = []; $values = [];
        foreach ($fields as $key => $column) {
            if (array_key_exists($key, $school)) { $changes[] = "`$column` = ?"; $values[] = $school[$key]; }
        }
        if ($changes) { $values[] = $schoolId; $pdo->prepare('UPDATE schools SET ' . implode(', ', $changes) . ' WHERE id = ?')->execute($values); }
    }

    $year = intval($data['activeFiscalYear']['year'] ?? $data['fiscalYear']['year'] ?? 0);
    $fyId = null;
    if (isset($data['students']) || isset($data['revenues']) || isset($data['allocations']) || isset($data['budgetSettings']) || isset($data['activities'])) {
        if ($year < 2500 || $year > 2600) throw new Exception('ปีงบประมาณไม่ถูกต้อง');
        $queryYear = $pdo->prepare('SELECT id FROM fiscal_years WHERE school_id = ? AND year = ? LIMIT 1');
        $queryYear->execute([$schoolId, $year]);
        $fyId = $queryYear->fetchColumn();
        if (!$fyId) {
            $gregorian = $year - 543;
            $pdo->prepare('INSERT INTO fiscal_years (school_id, year, is_active, start_date, end_date) VALUES (?, ?, 1, ?, ?)')->execute([$schoolId, $year, ($gregorian - 1) . '-10-01', $gregorian . '-09-30']);
            $fyId = $pdo->lastInsertId();
        }
    }

    // 2. Sync students
    if (isset($data['students']) && is_array($data['students'])) {
        $kept = [];
        foreach ($data['students'] as $s) {
            $grade = trim($s['gradeLevel'] ?? '');
            if ($grade === '') continue;
            $find = $pdo->prepare('SELECT id FROM students WHERE school_id = ? AND fiscal_year_id = ? AND grade_level = ? LIMIT 1');
            $find->execute([$schoolId, $fyId, $grade]);
            $id = $find->fetchColumn();
            $male = max(0, intval($s['maleCount'] ?? 0)); $female = max(0, intval($s['femaleCount'] ?? 0));
            if ($id) $pdo->prepare('UPDATE students SET stage = ?, male_count = ?, female_count = ?, total_count = ? WHERE id = ? AND school_id = ?')->execute([$s['stage'] ?? 'ประถม', $male, $female, $male + $female, $id, $schoolId]);
            else { $pdo->prepare('INSERT INTO students (school_id, fiscal_year_id, grade_level, stage, male_count, female_count, total_count) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$schoolId, $fyId, $grade, $s['stage'] ?? 'ประถม', $male, $female, $male + $female]); $id = $pdo->lastInsertId(); }
            $kept[] = $id;
        }
        $delete = 'DELETE FROM students WHERE school_id = ? AND fiscal_year_id = ?';
        if ($kept) $delete .= ' AND id NOT IN (' . implode(',', array_fill(0, count($kept), '?')) . ')';
        $pdo->prepare($delete)->execute(array_merge([$schoolId, $fyId], $kept));
    }

    // 3. Sync revenues
    if (isset($data['revenues']) && is_array($data['revenues'])) {
        $kept = [];
        foreach ($data['revenues'] as $r) {
            $name = trim($r['itemName'] ?? '');
            if ($name === '') continue;
            $find = $pdo->prepare('SELECT id FROM revenues WHERE id = ? AND school_id = ? AND fiscal_year_id = ? LIMIT 1');
            $find->execute([intval($r['id'] ?? 0), $schoolId, $fyId]);
            $id = $find->fetchColumn();
            if (!$id) { $find = $pdo->prepare('SELECT id FROM revenues WHERE school_id = ? AND fiscal_year_id = ? AND item_name = ? LIMIT 1'); $find->execute([$schoolId, $fyId, $name]); $id = $find->fetchColumn(); }
            $values = [$r['category'] ?? 'subsidy', $name, floatval($r['ratePerHead'] ?? 0), max(0, intval($r['eligibleCount'] ?? 0)), floatval($r['calculatedAmount'] ?? 0), !empty($r['isCustomRate']) ? 1 : 0, $r['note'] ?? ''];
            if ($id) $pdo->prepare('UPDATE revenues SET category = ?, item_name = ?, rate_per_head = ?, eligible_count = ?, calculated_amount = ?, is_custom_rate = ?, note = ? WHERE id = ? AND school_id = ?')->execute(array_merge($values, [$id, $schoolId]));
            else { $pdo->prepare('INSERT INTO revenues (school_id, fiscal_year_id, category, item_name, rate_per_head, eligible_count, calculated_amount, is_custom_rate, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute(array_merge([$schoolId, $fyId], $values)); $id = $pdo->lastInsertId(); }
            $kept[] = $id;
        }
        $delete = 'DELETE FROM revenues WHERE school_id = ? AND fiscal_year_id = ?';
        if ($kept) $delete .= ' AND id NOT IN (' . implode(',', array_fill(0, count($kept), '?')) . ')';
        $pdo->prepare($delete)->execute(array_merge([$schoolId, $fyId], $kept));
    }

    // 4. Sync budget_allocations
    if (isset($data['allocations']) && is_array($data['allocations'])) {
        $kept = [];
        foreach ($data['allocations'] as $a) {
            $name = trim($a['departmentName'] ?? '');
            if ($name === '') continue;
            $type = in_array($a['reserveType'] ?? '', ['utility', 'other'], true) ? $a['reserveType'] : null;
            $id = null;
            if (intval($a['id'] ?? 0) > 0) {
                $owned = $pdo->prepare('SELECT id FROM budget_allocations WHERE id = ? AND school_id = ? AND fiscal_year_id = ?');
                $owned->execute([intval($a['id']), $schoolId, $fyId]); $id = $owned->fetchColumn();
            }
            if (!$id && $type) {
                $same = $pdo->prepare('SELECT id FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ? AND reserve_type = ? LIMIT 1');
                $same->execute([$schoolId, $fyId, $type]); $id = $same->fetchColumn();
            }
            $values = [$name, floatval($a['percentage'] ?? 0), floatval($a['allocatedAmount'] ?? 0), floatval($a['spentAmount'] ?? 0), floatval($a['remainingAmount'] ?? 0), $a['colorHex'] ?? '#2563eb', $a['description'] ?? '', $type];
            if ($id) $pdo->prepare('UPDATE budget_allocations SET department_name = ?, percentage = ?, allocated_amount = ?, spent_amount = ?, remaining_amount = ?, color_hex = ?, description = ?, reserve_type = ? WHERE id = ? AND school_id = ? AND fiscal_year_id = ?')->execute(array_merge($values, [$id, $schoolId, $fyId]));
            else { $pdo->prepare('INSERT INTO budget_allocations (school_id, fiscal_year_id, department_name, percentage, allocated_amount, spent_amount, remaining_amount, color_hex, description, reserve_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute(array_merge([$schoolId, $fyId], $values)); $id = $pdo->lastInsertId(); }
            $kept[] = $id;
        }
        $delete = 'DELETE FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ?';
        if ($kept) $delete .= ' AND id NOT IN (' . implode(',', array_fill(0, count($kept), '?')) . ')';
        $pdo->prepare($delete)->execute(array_merge([$schoolId, $fyId], $kept));
    }
    if (isset($data['budgetSettings']) && is_array($data['budgetSettings'])) {
        $settings = $data['budgetSettings'];
        $pdo->prepare('INSERT INTO budget_settings (school_id, fiscal_year_id, carryover, manual_total) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE carryover = VALUES(carryover), manual_total = VALUES(manual_total)')->execute([$schoolId, $fyId, floatval($settings['carryover'] ?? 0), isset($settings['manualTotal']) ? floatval($settings['manualTotal']) : null]);
    }

    // 5. Sync learner_activities
    if (isset($data['activities']) && is_array($data['activities'])) {
        $kept = [];
        foreach ($data['activities'] as $act) {
            $name = trim($act['activityName'] ?? '');
            if ($name === '') continue;
            $id = null;
            if (intval($act['id'] ?? 0) > 0) {
                $find = $pdo->prepare('SELECT id FROM learner_activities WHERE id = ? AND school_id = ? AND fiscal_year_id = ?');
                $find->execute([intval($act['id']), $schoolId, $fyId]); $id = $find->fetchColumn();
            }
            $values = [$name, floatval($act['percentage'] ?? 0), floatval($act['allocatedAmount'] ?? 0), floatval($act['spentAmount'] ?? 0), floatval($act['remainingAmount'] ?? 0), $act['note'] ?? '', $act['description'] ?? ''];
            if ($id) $pdo->prepare('UPDATE learner_activities SET activity_name = ?, percentage = ?, allocated_amount = ?, spent_amount = ?, remaining_amount = ?, note = ?, description = ? WHERE id = ? AND school_id = ? AND fiscal_year_id = ?')->execute(array_merge($values, [$id, $schoolId, $fyId]));
            else { $pdo->prepare('INSERT INTO learner_activities (school_id, fiscal_year_id, activity_name, percentage, allocated_amount, spent_amount, remaining_amount, note, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute(array_merge([$schoolId, $fyId], $values)); $id = $pdo->lastInsertId(); }
            $kept[] = $id;
        }
        $delete = 'DELETE FROM learner_activities WHERE school_id = ? AND fiscal_year_id = ?';
        if ($kept) $delete .= ' AND id NOT IN (' . implode(',', array_fill(0, count($kept), '?')) . ')';
        $pdo->prepare($delete)->execute(array_merge([$schoolId, $fyId], $kept));
        $pdo->prepare('INSERT INTO budget_settings (school_id, fiscal_year_id, learner_initialized) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE learner_initialized = 1')->execute([$schoolId, $fyId]);
    }

    // 6. Sync strategies
    if (isset($data['strategies']) && is_array($data['strategies'])) {
        if (count($data['strategies']) === 0) {
            $pdo->prepare("DELETE FROM `strategies` WHERE `school_id` = ?")->execute([$schoolId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO `strategies` (`id`, `school_id`, `fiscal_year_id`, `code`, `name`, `description`)
                VALUES (?, ?, 1, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  code = VALUES(code),
                  name = VALUES(name),
                  description = VALUES(description)");
            foreach ($data['strategies'] as $st) {
                if (empty($st['name'])) continue;
                $stmt->execute([
                    intval($st['id'] ?? 0),
                    $schoolId,
                    $st['code'] ?? '',
                    $st['name'],
                    $st['description'] ?? '',
                ]);
            }
        }
    }

    // 7. Sync projects
    if (isset($data['projects']) && is_array($data['projects'])) {
        if (count($data['projects']) === 0) {
            $pdo->prepare("DELETE FROM `projects` WHERE `school_id` = ?")->execute([$schoolId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO `projects` 
                (`id`, `school_id`, `fiscal_year_id`, `project_code`, `project_name`, `rationale`, `objectives`, `quantitative_goals`, `qualitative_goals`, `kpis`, `procedures`, `duration_start`, `duration_end`, `location`, `target_group`, `responsible_person`, `department`, `budget_source`, `allocated_budget`, `spent_budget`, `remaining_budget`, `status`, `approval_status`, `details_json`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  fiscal_year_id = VALUES(fiscal_year_id),
                  project_name = VALUES(project_name),
                  project_code = VALUES(project_code),
                  rationale = VALUES(rationale),
                  objectives = VALUES(objectives),
                  quantitative_goals = VALUES(quantitative_goals),
                  qualitative_goals = VALUES(qualitative_goals),
                  kpis = VALUES(kpis),
                  procedures = VALUES(procedures),
                  duration_start = VALUES(duration_start),
                  duration_end = VALUES(duration_end),
                  location = VALUES(location),
                  target_group = VALUES(target_group),
                  responsible_person = VALUES(responsible_person),
                  department = VALUES(department),
                  budget_source = VALUES(budget_source),
                  allocated_budget = VALUES(allocated_budget),
                  spent_budget = VALUES(spent_budget),
                  remaining_budget = VALUES(remaining_budget),
                  status = VALUES(status),
                  approval_status = VALUES(approval_status),
                  details_json = VALUES(details_json)");

            foreach ($data['projects'] as $p) {
                if (empty($p['projectName'])) continue;
                $projectId = intval($p['id'] ?? 0);
                if ($projectId < 1 || $projectId > 4294967295) throw new Exception('เลขโครงการไม่ถูกต้องสำหรับ MySQL');
                $ownerQuery = $pdo->prepare('SELECT school_id FROM projects WHERE id = ? LIMIT 1');
                $ownerQuery->execute([$projectId]);
                $existingSchool = $ownerQuery->fetchColumn();
                if ($existingSchool !== false && intval($existingSchool) !== $schoolId) throw new Exception('เลขโครงการซ้ำกับโรงเรียนอื่น กรุณาบันทึกอีกครั้ง');
                $allocated = floatval($p['allocatedBudget'] ?? 0);
                $spent = floatval($p['spentBudget'] ?? 0);
                $remaining = floatval($p['remainingBudget'] ?? ($allocated - $spent));

                $stmt->execute([
                    intval($p['id'] ?? 0),
                    $schoolId,
                    intval($p['fiscalYearId'] ?? $fyId),
                    $p['projectCode'] ?? ('PROJ-' . ($p['id'] ?? time())),
                    $p['projectName'],
                    $p['rationale'] ?? '',
                    $p['objectives'] ?? '',
                    $p['quantitativeGoals'] ?? '',
                    $p['qualitativeGoals'] ?? '',
                    $p['kpis'] ?? '',
                    $p['procedures'] ?? '',
                    $p['durationStart'] ?? '',
                    $p['durationEnd'] ?? '',
                    $p['location'] ?? '',
                    $p['targetGroup'] ?? '',
                    $p['responsiblePerson'] ?? ($p['proposerName'] ?? 'ครูผู้รับผิดชอบ'),
                    $p['department'] ?? 'ฝ่ายวิชาการ',
                    $p['budgetSource'] ?? 'เงินอุดหนุนรายหัว',
                    $allocated,
                    $spent,
                    $remaining,
                    $p['status'] ?? 'not_started',
                    $p['approvalStatus'] ?? 'pending',
                    json_encode($p, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                ]);
            }
        }
    }

    // 8. Sync budget_transactions
    if (isset($data['transactions']) && is_array($data['transactions'])) {
        if (count($data['transactions']) === 0) {
            $pdo->prepare("DELETE FROM `budget_transactions` WHERE `school_id` = ?")->execute([$schoolId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO `budget_transactions`
                (`id`, `school_id`, `fiscal_year_id`, `project_id`, `doc_number`, `transaction_date`, `item_description`, `amount`, `payee`, `receipt_number`, `approved_by`, `status`)
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  project_id = VALUES(project_id),
                  doc_number = VALUES(doc_number),
                  transaction_date = VALUES(transaction_date),
                  item_description = VALUES(item_description),
                  amount = VALUES(amount),
                  payee = VALUES(payee),
                  receipt_number = VALUES(receipt_number),
                  approved_by = VALUES(approved_by),
                  status = VALUES(status)");

            foreach ($data['transactions'] as $t) {
                if (empty($t['itemDescription'])) continue;
                $stmt->execute([
                    intval($t['id'] ?? 0),
                    $schoolId,
                    intval($t['projectId'] ?? 0),
                    $t['docNumber'] ?? ('DOC-' . ($t['id'] ?? time())),
                    $t['transactionDate'] ?? date('Y-m-d'),
                    $t['itemDescription'],
                    floatval($t['amount'] ?? 0),
                    $t['payee'] ?? '',
                    $t['receiptNumber'] ?? '',
                    $t['approvedBy'] ?? 'ผู้อำนวยการโรงเรียน',
                    $t['status'] ?? 'approved',
                ]);
            }
        }
    }
}

function loadAppDataFromMySQL($pdo, $schoolIdParam = 0) {
    if (!$pdo) return null;
    ensureAllAppTables($pdo);
    try {
        $result = [];

        // 1. School
        $schoolId = intval($schoolIdParam);
        if ($schoolId > 0) {
            $stmt = $pdo->prepare("SELECT id, school_code as schoolCode, smis_code as smisCode, is_active as isActive, school_key as schoolKey, admin_username as adminUsername, name, address, subdistrict, district, province, zipcode, affiliation, education_area as educationArea, fiscal_year as fiscalYear, director_name as directorName, phone, email, logo_url as logoUrl, student_count as studentCount, project_count as projectCount, total_budget as totalBudget, notes FROM `schools` WHERE id = ? LIMIT 1");
            $stmt->execute([$schoolId]);
            $school = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->query("SELECT id, school_code as schoolCode, smis_code as smisCode, is_active as isActive, school_key as schoolKey, admin_username as adminUsername, name, address, subdistrict, district, province, zipcode, affiliation, education_area as educationArea, fiscal_year as fiscalYear, director_name as directorName, phone, email, logo_url as logoUrl, student_count as studentCount, project_count as projectCount, total_budget as totalBudget, notes FROM `schools` WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
            $school = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($school) {
            $school['id'] = intval($school['id']);
            $school['isActive'] = true;
            $result['school'] = $school;
            $schoolId = $school['id'];
        } else {
            $schoolId = 1;
        }

        // 2. Fiscal Years
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, year, is_active as isActive, start_date as startDate, end_date as endDate, total_students as totalStudents, teacher_count as teacherCount, is_proposal_open as isProposalOpen, proposal_open_date as proposalOpenDate, proposal_close_date as proposalCloseDate, proposal_notice as proposalNotice FROM `fiscal_years` WHERE school_id = ? ORDER BY year DESC");
        $stmt->execute([$schoolId]);
        $fiscalYears = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['fiscalYears'] = array_map(function($fy) {
            $fy['id'] = intval($fy['id']);
            $fy['schoolId'] = intval($fy['schoolId']);
            $fy['year'] = intval($fy['year']);
            $fy['isActive'] = ($fy['isActive'] == 1);
            $fy['isProposalOpen'] = ($fy['isProposalOpen'] != 0);
            $fy['totalStudents'] = intval($fy['totalStudents']);
            $fy['teacherCount'] = intval($fy['teacherCount']);
            return $fy;
        }, $fiscalYears ?: []);
        $active = null;
        foreach ($result['fiscalYears'] as $fy) { if ($fy['isActive']) { $active = $fy; break; } }
        if (!$active && $result['fiscalYears']) $active = $result['fiscalYears'][0];
        if ($active) $result['activeFiscalYear'] = $active;
        $fiscalId = $active['id'] ?? 0;

        // 3. Users
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, username, citizen_id as citizenId, full_name as fullName, email, role, department, position, phone, is_active as isActive FROM `users` WHERE school_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['users'] = array_map(function($u) {
            $u['id'] = intval($u['id']);
            $u['schoolId'] = intval($u['schoolId']);
            $u['isActive'] = ($u['isActive'] == 1);
            return $u;
        }, $users ?: []);

        // 4. Students
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, fiscal_year_id as fiscalYearId, grade_level as gradeLevel, stage, male_count as maleCount, female_count as femaleCount, total_count as totalCount FROM `students` WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId, $fiscalId]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['students'] = array_map(function($st) {
            $st['id'] = intval($st['id']);
            $st['schoolId'] = intval($st['schoolId']);
            $st['maleCount'] = intval($st['maleCount']);
            $st['femaleCount'] = intval($st['femaleCount']);
            $st['totalCount'] = intval($st['totalCount']);
            return $st;
        }, $students ?: []);

        // 5. Revenues
        $stmt = $pdo->prepare("SELECT id, category, item_name as itemName, rate_per_head as ratePerHead, eligible_count as eligibleCount, calculated_amount as calculatedAmount, is_custom_rate as isCustomRate, note FROM `revenues` WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId, $fiscalId]);
        $revenues = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['revenues'] = array_map(function($r) {
            $r['id'] = intval($r['id']);
            $r['ratePerHead'] = floatval($r['ratePerHead']);
            $r['eligibleCount'] = intval($r['eligibleCount']);
            $r['calculatedAmount'] = floatval($r['calculatedAmount']);
            $r['isCustomRate'] = ($r['isCustomRate'] == 1);
            return $r;
        }, $revenues ?: []);

        // 6. Budget Allocations
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, fiscal_year_id as fiscalYearId, department_name as departmentName, percentage, allocated_amount as allocatedAmount, spent_amount as spentAmount, remaining_amount as remainingAmount, color_hex as colorHex, description, reserve_type as reserveType FROM `budget_allocations` WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId, $fiscalId]);
        $allocations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['allocations'] = array_map(function($a) {
            $a['id'] = intval($a['id']);
            $a['percentage'] = floatval($a['percentage']);
            $a['allocatedAmount'] = floatval($a['allocatedAmount']);
            $a['spentAmount'] = floatval($a['spentAmount']);
            $a['remainingAmount'] = floatval($a['remainingAmount']);
            return $a;
        }, $allocations ?: []);
        $stmt = $pdo->prepare('SELECT carryover, manual_total as manualTotal, learner_initialized as learnerInitialized FROM budget_settings WHERE school_id = ? AND fiscal_year_id = ? LIMIT 1');
        $stmt->execute([$schoolId, $fiscalId]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        $result['budgetSettings'] = ['carryover' => floatval($settings['carryover'] ?? 0), 'manualTotal' => isset($settings['manualTotal']) ? floatval($settings['manualTotal']) : null];
        $result['activitiesInitialized'] = !empty($settings['learnerInitialized']);

        // 7. Learner Activities
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, fiscal_year_id as fiscalYearId, activity_name as activityName, percentage, allocated_amount as allocatedAmount, spent_amount as spentAmount, remaining_amount as remainingAmount, note, description FROM `learner_activities` WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId, $fiscalId]);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['activities'] = array_map(function($act) {
            $act['id'] = intval($act['id']);
            $act['percentage'] = floatval($act['percentage']);
            $act['allocatedAmount'] = floatval($act['allocatedAmount']);
            $act['spentAmount'] = floatval($act['spentAmount']);
            $act['remainingAmount'] = floatval($act['remainingAmount']);
            return $act;
        }, $activities ?: []);

        // 8. Strategies
        $stmt = $pdo->prepare("SELECT id, code, name, description FROM `strategies` WHERE school_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId]);
        $strategies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['strategies'] = array_map(function($str) {
            $str['id'] = intval($str['id']);
            return $str;
        }, $strategies ?: []);

        // 9. Projects
        $stmt = $pdo->prepare("SELECT id, school_id as schoolId, fiscal_year_id as fiscalYearId, project_code as projectCode, project_name as projectName, rationale, objectives, quantitative_goals as quantitativeGoals, qualitative_goals as qualitativeGoals, kpis, procedures, duration_start as durationStart, duration_end as durationEnd, location, target_group as targetGroup, responsible_person as responsiblePerson, department, budget_source as budgetSource, allocated_budget as allocatedBudget, spent_budget as spentBudget, remaining_budget as remainingBudget, status, approval_status as approvalStatus, details_json FROM `projects` WHERE school_id = ? ORDER BY id ASC");
        $stmt->execute([$schoolId]);
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['projects'] = array_map(function($p) {
            $details = json_decode($p['details_json'] ?? '', true);
            unset($p['details_json']);
            if (is_array($details)) $p = array_merge($p, $details);
            if (!empty($p['approvalStatus']) && $p['approvalStatus'] === 'approved' && empty($p['approvedBy'])) $p['approvedBy'] = 'อนุมัติแล้ว';
            $p['id'] = intval($p['id']);
            $p['schoolId'] = intval($p['schoolId']);
            $p['fiscalYearId'] = intval($p['fiscalYearId']);
            $p['allocatedBudget'] = floatval($p['allocatedBudget']);
            $p['spentBudget'] = floatval($p['spentBudget']);
            $p['remainingBudget'] = floatval($p['remainingBudget']);
            return $p;
        }, $projects ?: []);

        // 10. Budget Transactions
        $stmt = $pdo->prepare("SELECT id, project_id as projectId, doc_number as docNumber, transaction_date as transactionDate, item_description as itemDescription, amount, payee, receipt_number as receiptNumber, approved_by as approvedBy, status FROM `budget_transactions` WHERE school_id = ? ORDER BY id DESC");
        $stmt->execute([$schoolId]);
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['transactions'] = array_map(function($t) {
            $t['id'] = intval($t['id']);
            $t['projectId'] = intval($t['projectId']);
            $t['amount'] = floatval($t['amount']);
            return $t;
        }, $transactions ?: []);

        return $result;
    } catch (Exception $e) {
        error_log("Failed to load app data from MySQL: " . $e->getMessage());
        return null;
    }
}

// 4. ฟังก์ชันเรียกใช้งาน Gemini AI API และ Template Engine สำหรับโครงการ สพฐ.
function callGeminiApiInPhp($apiKey, $prompt, $systemInstruction, &$failure = null, $timeout = 90) {
    $cleanKey = trim($apiKey);
    if (empty($cleanKey)) return null;

    // Gemini 2.5 Flash is unavailable to newly created API projects.
    $models = ['gemini-3.8-flash'];
    $payload = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [['text' => $prompt]]
            ]
        ],
        'systemInstruction' => [
            'parts' => [['text' => $systemInstruction]]
        ],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
            'temperature' => 0.45,
            'maxOutputTokens' => 12288
        ]
    ];
    $jsonPayload = json_encode($payload, JSON_UNESCAPED_UNICODE);

    foreach ($models as $model) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
        $response = null;

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $cleanKey,
                'User-Agent: aistudio-build-obep',
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                $errorData = json_decode($response ?: '', true);
                $failure = $curlError ?: ($errorData['error']['message'] ?? "Google AI Studio ตอบกลับ HTTP {$httpCode}");
                continue;
            }
        } else {
            $opts = [
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/json\r\nx-goog-api-key: {$cleanKey}\r\nUser-Agent: aistudio-build-obep\r\n",
                    'content' => $jsonPayload,
                    'timeout' => $timeout,
                    'ignore_errors' => true,
                ],
            ];
            $context = stream_context_create($opts);
            $response = @file_get_contents($url, false, $context);
            if (!$response) $failure = 'เซิร์ฟเวอร์ไม่สามารถเชื่อมต่อ Google AI Studio ผ่าน HTTPS';
        }

        if ($response) {
            $resData = json_decode($response, true);
            if (!empty($resData['candidates'][0]['content']['parts'][0]['text'])) {
                $rawText = $resData['candidates'][0]['content']['parts'][0]['text'];
                $cleaned = trim($rawText);
                if (strpos($cleaned, '```') !== false) {
                    $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned);
                    $cleaned = preg_replace('/\s*```$/', '', $cleaned);
                }
                $parsedProposal = json_decode($cleaned, true);
                if (is_array($parsedProposal) && !empty($parsedProposal['projectName']) &&
                    ($timeout <= 25 || (
                        !empty($parsedProposal['rationale']) && strlen($parsedProposal['rationale']) >= 360 &&
                        !empty($parsedProposal['objectives']) && is_array($parsedProposal['objectives']) && count($parsedProposal['objectives']) >= 3 &&
                        !empty($parsedProposal['activities']) && is_array($parsedProposal['activities']) && count($parsedProposal['activities']) >= 4 &&
                        !empty($parsedProposal['expenseItems']) && is_array($parsedProposal['expenseItems'])
                    ))) {
                    return $parsedProposal;
                }
                $failure = 'Google AI Studio ตอบกลับโครงการไม่ครบตามหัวข้อหรือรายละเอียดสั้นเกินไป';
            } elseif (!empty($resData['error']['message'])) {
                $failure = $resData['error']['message'];
            }
        }
    }
    return null;
}

function generateFallbackProposalPhp($params) {
    $pName = !empty($params['projectName']) ? $params['projectName'] : 'โครงการพัฒนาคุณภาพการศึกษาและพัฒนาศักยภาพผู้เรียน';
    $pType = !empty($params['projectType']) ? $params['projectType'] : 'ใหม่';
    $dept = !empty($params['department']) ? $params['department'] : 'ฝ่ายวิชาการ';
    $strat = !empty($params['strategyName']) ? $params['strategyName'] : 'ยุทธศาสตร์พัฒนาคุณภาพการศึกษา สพฐ.';
    $schoolName = !empty($params['schoolName']) ? trim($params['schoolName']) : 'โรงเรียน';
    $fiscalYear = !empty($params['fiscalYear']) ? intval($params['fiscalYear']) : intval(date('Y')) + 543;
    $target = !empty($params['targetGroup']) ? $params['targetGroup'] : "นักเรียน{$schoolName}";
    $budget = !empty($params['estimatedBudget']) ? floatval($params['estimatedBudget']) : 30000;
    if ($budget <= 0) $budget = 30000;
    $duration = !empty($params['duration']) ? $params['duration'] : "ต.ค. " . ($fiscalYear - 1) . " - ก.ย. {$fiscalYear}";
    $focus = !empty($params['specialFocus']) ? $params['specialFocus'] : '';

    $proposer = !empty($params['proposerName']) ? $params['proposerName'] : 'ครูผู้รับผิดชอบโครงการ';
    $propPos = !empty($params['proposerPosition']) ? $params['proposerPosition'] : 'ครูผู้รับผิดชอบโครงการ';
    $endorser = !empty($params['endorserName']) ? $params['endorserName'] : 'ผู้เห็นชอบโครงการ';
    $endPos = !empty($params['endorserPosition']) ? $params['endorserPosition'] : "หัวหน้ากลุ่มงาน{$dept}";
    $approver = !empty($params['approverName']) ? $params['approverName'] : 'ผู้อำนวยการโรงเรียน';
    $appPos = !empty($params['approverPosition']) ? $params['approverPosition'] : 'ผู้อำนวยการโรงเรียน';

    $bMat = round($budget * 0.45);
    $bAct = round($budget * 0.35);
    $bRem = $budget - $bMat - $bAct;

    $cleanTitle = preg_replace('/^โครงการ\s*/u', '', $pName);
    if (strpos($cleanTitle, 'ห้องเรียนคุณภาพ') !== false) {
        $rationale = "การพัฒนาคุณภาพผู้เรียนต้องอาศัยการจัดการเรียนรู้ที่เปิดโอกาสให้นักเรียนได้คิด วิเคราะห์ ลงมือปฏิบัติ และใช้ความรู้ในชีวิตจริง ห้องเรียนเป็นพื้นที่ที่ครูและนักเรียนใช้ทำกิจกรรมร่วมกันอย่างต่อเนื่อง สภาพแวดล้อมที่สะอาด ปลอดภัย เป็นระเบียบ มีสื่อและแหล่งเรียนรู้ที่เหมาะสม รวมทั้งกิจกรรมที่คำนึงถึงความแตกต่างระหว่างผู้เรียน ช่วยสร้างบรรยากาศและแรงจูงใจในการเรียนรู้ {$schoolName} จึงให้ความสำคัญกับการพัฒนาห้องเรียนและกระบวนการจัดการเรียนรู้สำหรับ {$target} ให้สอดคล้องกับ {$strat}" . ($focus ? " โดยเน้น {$focus}" : "") . "\n\nการพัฒนาห้องเรียนคุณภาพควรดำเนินงานอย่างเป็นระบบ ตั้งแต่การวิเคราะห์ผู้เรียนและวางแผนจัดการเรียนรู้ การพัฒนาสื่อและมุมเรียนรู้ การจัดกิจกรรมที่ผู้เรียนมีส่วนร่วม การดูแลช่วยเหลือผู้เรียน ไปจนถึงการวัดและประเมินผลด้วยวิธีที่หลากหลาย ครูสามารถนำผลการประเมินมาปรับการสอนและแลกเปลี่ยนแนวปฏิบัติร่วมกัน โรงเรียนจึงจัดทำโครงการห้องเรียนคุณภาพเพื่อสนับสนุนการดำเนินงานดังกล่าว ติดตามความก้าวหน้าของกิจกรรม และพัฒนาสภาพแวดล้อมกับการเรียนรู้ของผู้เรียนอย่างต่อเนื่อง";
    } else {
        $rationale = "{$schoolName} มีหน้าที่จัดการเรียนรู้และพัฒนาผู้เรียนให้เหมาะสมกับบริบทของสถานศึกษาและ {$strat} การดำเนินโครงการ{$cleanTitle}มุ่งให้ {$target} ได้รับโอกาสพัฒนาตามเนื้อหาและกิจกรรมของโครงการ" . ($focus ? " โดยเน้น {$focus}" : "") . " การวางแผนกิจกรรมให้ตรงกับกลุ่มเป้าหมายและทรัพยากรที่มีอยู่ ช่วยให้ครูติดตามการดำเนินงานและปรับวิธีการทำงานได้เป็นขั้นตอน\n\nโรงเรียนจึงจัดทำโครงการนี้เพื่อกำหนดวัตถุประสงค์ กิจกรรม ระยะเวลา ผู้รับผิดชอบ งบประมาณ และหลักฐานการประเมินให้สอดคล้องกัน โดยให้ผู้รับผิดชอบตรวจสอบสภาพปัญหาและข้อมูลจริงของโรงเรียนก่อนเสนออนุมัติ แล้วนำผลการดำเนินงานมาปรับปรุงกิจกรรมในรอบต่อไปเพื่อให้เกิดประโยชน์กับกลุ่มเป้าหมายอย่างต่อเนื่อง";
    }

    return [
        'projectCode' => 'วช.' . rand(10, 99) . '/' . $fiscalYear,
        'projectName' => $pName,
        'projectType' => $pType,
        'department' => $dept,
        'strategyAlignment' => $strat,
        'responsiblePerson' => $proposer,
        'position' => $propPos,
        'proposerName' => $proposer,
        'proposerPosition' => $propPos,
        'endorserName' => $endorser,
        'endorserPosition' => $endPos,
        'approverName' => $approver,
        'approverPosition' => $appPos,
        'rationale' => $rationale,
        'objectives' => [
            "เพื่อส่งเสริมและพัฒนาการดำเนินงาน {$pName} ให้บรรลุตามเป้าหมายมาตรฐานการศึกษา",
            "เพื่อเปิดโอกาสให้กลุ่มเป้าหมาย ({$target}) ได้รับการพัฒนาทักษะและความรู้อย่างเต็มศักยภาพ",
            "เพื่อสร้างเครือข่ายความร่วมมือและการจัดการเรียนรู้เชิงรุก (Active Learning) ในสถานศึกษา",
        ],
        'quantitativeTarget' => "กลุ่มเป้าหมาย ({$target}) ได้รับการพัฒนาและเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ 85 ของจำนวนทั้งหมด",
        'qualitativeTarget' => "ผู้เข้าร่วมกิจกรรมมีความรู้ ทักษะ และสามารถนำความรู้ไปประยุกต์ใช้ในการเรียนและการปฏิบัติงานได้ในระดับดีขึ้นไป",
        'timeline' => $duration,
        'location' => $schoolName,
        'activities' => [
            ['phase' => 'ขั้นวางแผน (Plan)', 'description' => 'แต่งตั้งคณะทำงาน ประชุมวางแผนกำหนดกรอบงาน และจัดทำเครื่องมือวัดผล', 'duration' => 'เดือนที่ 1', 'responsible' => $proposer],
            ['phase' => 'ขั้นปฏิบัติการ (Do)', 'description' => 'ดำเนินกิจกรรมตามโครงการ อบรมเชิงปฏิบัติการ และส่งเสริมการเรียนรู้', 'duration' => 'เดือนที่ 2-6', 'responsible' => 'คณะทำงานโครงการ'],
            ['phase' => 'ขั้นตรวจสอบ (Check)', 'description' => 'นิเทศ ติดตามผล ประเมินความพึงพอใจ และทดสอบสมรรถนะตามตัวชี้วัด', 'duration' => 'เดือนที่ 7-8', 'responsible' => $endorser],
            ['phase' => 'ขั้นปรับปรุงและรายงาน (Action)', 'description' => 'สรุปผลการดำเนินงาน จัดทำรูปเล่มรายงาน และนำข้อเสนอแนะไปพัฒนาในรอบปีถัดไป', 'duration' => 'เดือนที่ 9-10', 'responsible' => $proposer],
        ],
        'expenseItems' => [
            ['id' => 1, 'itemName' => 'ค่าวัสดุ อุปกรณ์ และสื่อการดำเนินกิจกรรมโครงการ', 'category' => 'ค่าวัสดุ', 'quantity' => 1, 'unit' => 'ชุด', 'unitPrice' => $bMat, 'totalAmount' => $bMat],
            ['id' => 2, 'itemName' => 'ค่าตอบแทนวิทยากร / คณะทำงานโครงการ', 'category' => 'ค่าตอบแทน', 'quantity' => 1, 'unit' => 'งาน', 'unitPrice' => $bAct, 'totalAmount' => $bAct],
            ['id' => 3, 'itemName' => 'ค่าใช้สอย ค่าอาหารว่างและเครื่องดื่ม และเอกสารสรุปผล', 'category' => 'ค่าใช้สอย', 'quantity' => 1, 'unit' => 'ชุด', 'unitPrice' => $bRem, 'totalAmount' => $bRem],
        ],
        'totalBudget' => $budget,
        'budgetSource' => 'เงินอุดหนุนรายหัว สพฐ. ประจำปีงบประมาณ 2568',
        'kpis' => 'ร้อยละ 85 ของผู้เข้าร่วมโครงการมีความพึงพอใจและมีผลสัมฤทธิ์ผ่านเกณฑ์มาตรฐาน',
        'evaluationMethods' => 'แบบประเมินความพึงพอใจ, แบบทดสอบก่อน-หลังการจัดกิจกรรม, และการนิเทศติดตามผล',
        'expectedBenefits' => [
            "กลุ่มเป้าหมายได้รับการยกระดับคุณภาพและมีทักษะสอดคล้องกับมาตรฐานการศึกษา",
            "สถานศึกษามีผลสัมฤทธิ์และการดำเนินงานตามแผนปฏิบัติการประจำปีที่เป็นระบบและตรวจสอบได้",
            "เกิดแนวปฏิบัติที่ดี (Best Practice) ในการบริหารจัดการศึกษาของสถานศึกษา",
        ],
        'proposedBy' => "(ลงชื่อ).......................................................... ผู้เสนอโครงการ\n({$proposer})\nตำแหน่ง {$propPos}",
        'acknowledgedBy' => "(ลงชื่อ).......................................................... ผู้เห็นชอบโครงการ\n({$endorser})\nตำแหน่ง {$endPos}",
    ];
}

// 4. วิเคราะห์ Route
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $uri = preg_replace('#^/api/#', '', $uri);
    $route = trim($uri, '/');
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: [];

// Dynamic Routes สำหรับ Super Admin Schools (Toggle Status & Delete)
if (preg_match('#^super-admin/schools/(\d+)/toggle$#', $route, $matches)) {
    $schId = intval($matches[1]);
    $newActive = toggleSchoolInDatabase($schId);
    echo json_encode([
        'success' => true,
        'message' => 'เปลี่ยนสถานะโรงเรียนในฐานข้อมูล MySQL เรียบร้อยแล้ว',
        'isActive' => $newActive,
    ]);
    exit;
}

if (preg_match('#^super-admin/schools/(\d+)$#', $route, $matches)) {
    $schId = intval($matches[1]);
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        deleteSchoolFromDatabase($schId);
        echo json_encode([
            'success' => true,
            'message' => 'ลบโรงเรียนออกจากฐานข้อมูล MySQL และระบบเรียบร้อยแล้ว',
        ]);
        exit;
    }
}

// 5. Routing Endpoints
try {
    switch ($route) {
        case 'fiscal-years': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false]); exit; }
            $schoolId = intval($input['schoolId'] ?? 0);
            $year = intval($input['year'] ?? 0);
            $action = $input['action'] ?? '';
            if ($schoolId < 1 || $year < 2500 || $year > 2600 || !in_array($action, ['create', 'select', 'update'], true)) {
                http_response_code(400); echo json_encode(['success' => false, 'message' => 'ข้อมูลโรงเรียนหรือปีงบประมาณไม่ถูกต้อง']); exit;
            }
            $pdo = getDbPDO();
            if (!$pdo) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'ไม่สามารถเชื่อมต่อ MySQL ได้']); exit; }
            ensureAllAppTables($pdo);
            $pdo->beginTransaction();
            try {
                $school = $pdo->prepare('SELECT id FROM schools WHERE id = ? FOR UPDATE');
                $school->execute([$schoolId]);
                if (!$school->fetchColumn()) throw new Exception('ไม่พบโรงเรียนใน MySQL');
                $find = $pdo->prepare('SELECT id FROM fiscal_years WHERE school_id = ? AND year = ? LIMIT 1');
                $find->execute([$schoolId, $year]);
                $id = $find->fetchColumn();
                if (!$id && $action !== 'create') throw new Exception('ยังไม่มีปีงบประมาณนี้ กรุณาเพิ่มปีก่อน');
                if (!$id) {
                    $gregorian = $year - 543;
                    $pdo->prepare('INSERT INTO fiscal_years (school_id, year, is_active, start_date, end_date) VALUES (?, ?, 0, ?, ?)')->execute([$schoolId, $year, ($gregorian - 1) . '-10-01', $gregorian . '-09-30']);
                    $id = $pdo->lastInsertId();
                }
                if ($action === 'update') {
                    $fy = $input['fiscalYear'] ?? [];
                    $pdo->prepare('UPDATE fiscal_years SET is_proposal_open = ?, proposal_open_date = ?, proposal_close_date = ?, proposal_notice = ? WHERE id = ? AND school_id = ?')->execute([($fy['isProposalOpen'] ?? true) ? 1 : 0, $fy['proposalOpenDate'] ?? null, $fy['proposalCloseDate'] ?? null, $fy['proposalNotice'] ?? '', $id, $schoolId]);
                } else {
                    $pdo->prepare('UPDATE fiscal_years SET is_active = (id = ?) WHERE school_id = ?')->execute([$id, $schoolId]);
                    $pdo->prepare('UPDATE schools SET fiscal_year = ? WHERE id = ?')->execute([$year, $schoolId]);
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'id' => intval($id), 'schoolId' => $schoolId, 'year' => $year]);
            } catch (Exception $e) {
                $pdo->rollBack(); http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            exit;
        }
        // --- Setup Real School ---
        case 'setup-real-school': {
            $name = trim($input['name'] ?? '');
            $smisCode = trim($input['smisCode'] ?? '10000001');
            $province = trim($input['province'] ?? 'กรุงเทพมหานคร');
            $educationArea = trim($input['educationArea'] ?? 'สำนักงานเขตพื้นที่การศึกษา');
            $directorName = trim($input['directorName'] ?? '');
            $phone = trim($input['phone'] ?? '');
            $email = trim($input['email'] ?? '');

            if (empty($name)) {
                echo json_encode(['success' => false, 'message' => 'กรุณาระบุชื่อโรงเรียนจริง']);
                exit;
            }

            $realSchool = [
                'id' => 1,
                'schoolCode' => strlen($smisCode) === 8 ? "{$smisCode}00" : $smisCode,
                'smisCode' => $smisCode,
                'isActive' => true,
                'schoolKey' => "SCH-{$smisCode}",
                'adminUsername' => 'admin',
                'adminPasswordPlain' => '123456',
                'name' => $name,
                'province' => $province,
                'educationArea' => $educationArea,
                'directorName' => $directorName,
                'phone' => $phone,
                'email' => $email,
                'studentCount' => 0,
                'projectCount' => 0,
                'totalBudget' => 0,
                'notes' => 'โรงเรียนจริงสำหรับปฏิบัติงานประจำปีการศึกษา',
                'isRealSchool' => true,
            ];

            // บันทึกไฟล์ JSON สำรอง
            $existing = loadAppDataFile();
            $existing['school'] = $realSchool;
            $existing['projects'] = [];
            $existing['transactions'] = [];
            $existing['allocations'] = [];
            $existing['isRealMode'] = true;
            saveAppDataFile($existing);

            // บันทึกลง MySQL หากเชื่อมต่อได้
            $pdo = getDbPDO();
            if ($pdo) {
                try {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS schools (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        school_code VARCHAR(50),
                        smis_code VARCHAR(20),
                        school_key VARCHAR(50),
                        name VARCHAR(255),
                        province VARCHAR(100),
                        education_area VARCHAR(255),
                        director_name VARCHAR(255),
                        phone VARCHAR(50),
                        email VARCHAR(100),
                        is_active TINYINT(1) DEFAULT 1,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                    $stmt = $pdo->prepare("INSERT INTO schools (id, school_code, smis_code, school_key, name, province, education_area, director_name, phone, email, is_active)
                        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON DUPLICATE KEY UPDATE 
                        school_code=VALUES(school_code), smis_code=VALUES(smis_code), school_key=VALUES(school_key), name=VALUES(name),
                        province=VALUES(province), education_area=VALUES(education_area), director_name=VALUES(director_name),
                        phone=VALUES(phone), email=VALUES(email), is_active=1");
                    $stmt->execute([
                        $realSchool['schoolCode'],
                        $realSchool['smisCode'],
                        $realSchool['schoolKey'],
                        $realSchool['name'],
                        $realSchool['province'],
                        $realSchool['educationArea'],
                        $realSchool['directorName'],
                        $realSchool['phone'],
                        $realSchool['email'],
                    ]);
                } catch (Exception $dbErr) {
                    // ละเว้นข้อผิดพลาด SQL และใช้ JSON สำรอง
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "บันทึกข้อมูลโรงเรียนจริง \"{$name}\" และเปิดใช้งานระบบงานจริงเรียบร้อยแล้ว",
                'school' => $realSchool,
            ]);
            exit;
        }

        // --- Database Status ---
        case 'super-admin/db-status': {
            $cfg = loadEnvConfig();
            $pdo = getDbPDO();
            $connected = ($pdo !== null);

            $tableCount = 0;
            $tables = [];
            if ($connected) {
                try {
                    $stmt = $pdo->query("SHOW TABLES");
                    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    $tableCount = count($tables);
                } catch (Exception $e) {}
            }

            echo json_encode([
                'connected' => $connected,
                'database' => $cfg['DB_NAME'],
                'user' => $cfg['DB_USER'],
                'host' => $cfg['DB_HOST'],
                'port' => $cfg['DB_PORT'],
                'tableCount' => $tableCount,
                'tables' => $tables,
                'driver' => 'PHP PDO / MySQL',
                'envConfigured' => true,
            ]);
            exit;
        }

        // --- Test Database ---
        case 'super-admin/test-db': {
            $customConfig = null;
            $savedEnv = loadEnvConfig();
            
            $inputHost = !empty($input['host']) ? trim($input['host']) : ($savedEnv['DB_HOST'] ?? 'localhost');
            $inputPort = !empty($input['port']) ? intval($input['port']) : intval($savedEnv['DB_PORT'] ?? 3306);
            $inputDb = !empty($input['dbname']) ? trim($input['dbname']) : ($savedEnv['DB_NAME'] ?? 'schoobwd_planaction');
            $inputUser = !empty($input['user']) ? trim($input['user']) : ($savedEnv['DB_USER'] ?? 'root');
            
            // ใช้รหัสผ่านที่ส่งมา หรือถ้ารหัสผ่านที่ส่งมาว่าง ให้ใช้รหัสผ่านเดิมที่บันทึกไว้
            $inputPass = '';
            if (isset($input['pass']) && $input['pass'] !== '') {
                $inputPass = $input['pass'];
            } else if (isset($input['password']) && $input['password'] !== '') {
                $inputPass = $input['password'];
            } else if (!empty($savedEnv['DB_PASS'])) {
                $inputPass = $savedEnv['DB_PASS'];
            }

            $customConfig = [
                'DB_HOST' => $inputHost,
                'DB_PORT' => $inputPort,
                'DB_NAME' => $inputDb,
                'DB_USER' => $inputUser,
                'DB_PASS' => $inputPass,
            ];

            $pdo = getDbPDO($customConfig);
            if ($pdo) {
                $ver = $pdo->query("SELECT VERSION()")->fetchColumn();
                echo json_encode([
                    'success' => true,
                    'message' => "เชื่อมต่อฐานข้อมูล MySQL '{$inputDb}' บนเซิร์ฟเวอร์จริงสำเร็จ (MySQL Version: {$ver})",
                    'version' => $ver,
                    'details' => ['version' => $ver],
                ]);
            } else {
                global $lastDbError;
                $friendlyMsg = $lastDbError;
                $hints = [];

                if (strpos($lastDbError, 'Access denied') !== false) {
                    // ทดสอบว่าชื่อผู้ใช้และรหัสผ่านเข้า MySQL ได้หรือไม่ โดยไม่ระบุ database
                    $userAuthed = false;
                    $attemptsNoDb = [
                        "mysql:host={$inputHost};port={$inputPort};charset=utf8mb4",
                        "mysql:host=" . ($inputHost === 'localhost' ? '127.0.0.1' : 'localhost') . ";port={$inputPort};charset=utf8mb4",
                        "mysql:unix_socket=/var/lib/mysql/mysql.sock;charset=utf8mb4",
                        "mysql:unix_socket=/tmp/mysql.sock;charset=utf8mb4",
                        "mysql:unix_socket=/var/run/mysqld/mysqld.sock;charset=utf8mb4",
                    ];
                    foreach ($attemptsNoDb as $dsnNoDb) {
                        try {
                            $testPdo = new PDO($dsnNoDb, $inputUser, $inputPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]);
                            $userAuthed = true;
                            break;
                        } catch (Exception $eNoDb) {}
                    }

                    if ($userAuthed) {
                        $friendlyMsg = "ชื่อผู้ใช้ '{$inputUser}' และรหัสผ่านถูกต้องสมบูรณ์! แต่ยังไม่ได้เพิ่มผู้ใช้ (Add User to Database) ให้กับฐานข้อมูล '{$inputDb}' ใน cPanel";
                        $hints = [
                            "1. เข้าสู่ cPanel ของท่าน แล้วคลิกเมนู 'MySQL Databases'",
                            "2. เลื่อนลงมาที่หัวข้อ 'Add User To Database'",
                            "3. ในช่อง User: เลือก '{$inputUser}' และในช่อง Database: เลือก '{$inputDb}' แล้วกดปุ่ม 'Add'",
                            "4. ในหน้าถัดไป ให้ติ๊กเครื่องหมายถูกที่ช่อง 'ALL PRIVILEGES' (ให้สิทธิ์ทุกอย่าง) แล้วกดปุ่ม 'Make Changes' ด้านล่าง",
                            "5. เมื่อดำเนินการเสร็จแล้ว กลับมาที่หน้านี้แล้วกดปุ่ม 'ทดสอบการเชื่อมต่อ' อีกครั้ง",
                        ];
                    } else {
                        $friendlyMsg = "ปฏิเสธการเข้าถึงสำหรับผู้ใช้ '{$inputUser}' (รหัสผ่านไม่ถูกต้อง หรือผู้ใช้ไม่มีอยู่ใน cPanel MySQL)";
                        $hints = [
                            "1. เข้าสู่ cPanel > ไปที่เมนู 'MySQL Databases' เลื่อนลงไปที่ 'Current Users'",
                            "2. ตรวจสอบว่ามีผู้ใช้ชื่อ '{$inputUser}' หรือไม่ หากลืมรหัสผ่าน ให้คลิก 'Set Password' หรือ 'Change Password' เพื่อตั้งรหัสผ่านใหม่",
                            "3. นำรหัสผ่านที่ตั้งใหม่มากรอกในช่องรหัสผ่านในหน้านี้ แล้วกด 'บันทึกการตั้งค่า' และ 'ทดสอบการเชื่อมต่อ'",
                            "4. อย่าลืมเพิ่ม User เข้ากับ Database ในหัวข้อ 'Add User To Database' พร้อมติ๊ก ALL PRIVILEGES",
                        ];
                    }
                } else if (strpos($lastDbError, 'Unknown database') !== false) {
                    $friendlyMsg = "ไม่พบฐานข้อมูลชื่อ '{$inputDb}' บน MySQL Server";
                    $hints = [
                        "1. ตรวจสอบว่าได้สร้างฐานข้อมูล '{$inputDb}' ใน cPanel แล้วหรือยัง",
                        "2. ตรวจสอบคำนำหน้าชื่อฐานข้อมูล (Prefix) ให้ตรงกัน เช่น schoobwd_planaction",
                    ];
                } else {
                    $hints = [
                        "1. ลองเปลี่ยน Host เป็น localhost หรือ 127.0.0.1",
                        "2. ตรวจสอบว่า MySQL service บนโฮสติ้งเปิดทำงานอยู่",
                    ];
                }

                echo json_encode([
                    'success' => false,
                    'message' => "ไม่สามารถเชื่อมต่อฐานข้อมูล '{$inputDb}' ได้: {$friendlyMsg}",
                    'error' => $lastDbError,
                    'hints' => $hints,
                ]);
            }
            exit;
        }

        // --- Save Database Configuration ---
        case 'super-admin/save-db-config': {
            $host = trim($input['host'] ?? 'localhost');
            $port = intval($input['port'] ?? 3306);
            $dbname = trim($input['dbname'] ?? ($input['database'] ?? 'schoobwd_planaction'));
            $user = trim($input['user'] ?? 'root');
            $pass = isset($input['pass']) ? $input['pass'] : (isset($input['password']) ? $input['password'] : '');

            // หากไม่ได้กรอกรหัสผ่านใหม่ ให้คงรหัสผ่านเดิมที่เคยบันทึกไว้ใน .env / config
            if ($pass === '') {
                $savedEnv = loadEnvConfig();
                if (!empty($savedEnv['DB_PASS'])) {
                    $pass = $savedEnv['DB_PASS'];
                }
            }

            // 1. บันทึกลง config/db_config.json
            $cfgDir = __DIR__ . '/config';
            if (!is_dir($cfgDir)) mkdir($cfgDir, 0755, true);
            $dbConfigData = [
                'host' => $host,
                'port' => $port,
                'dbname' => $dbname,
                'user' => $user,
                'pass' => $pass,
                'updatedAt' => date('c'),
            ];
            file_put_contents($cfgDir . '/db_config.json', json_encode($dbConfigData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            // 2. บันทึกหรืออัปเดตไฟล์ .env
            $envFile = __DIR__ . '/.env';
            $envLines = file_exists($envFile) ? file($envFile, FILE_IGNORE_NEW_LINES) : [];
            $envMap = [];
            foreach ($envLines as $line) {
                if (empty(trim($line)) || trim($line)[0] === '#') continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $envMap[trim($parts[0])] = trim($parts[1]);
                }
            }
            $envMap['DB_HOST'] = $host;
            $envMap['DB_PORT'] = $port;
            $envMap['DB_NAME'] = $dbname;
            $envMap['DB_USER'] = $user;
            $envMap['DB_PASS'] = $pass;

            $newEnvContent = "# Database Connection Configuration\n";
            foreach ($envMap as $k => $v) {
                $newEnvContent .= "{$k}={$v}\n";
            }
            file_put_contents($envFile, $newEnvContent);

            // 3. ทดสอบการเชื่อมต่อทันที
            $testPdo = getDbPDO([
                'DB_HOST' => $host,
                'DB_PORT' => $port,
                'DB_NAME' => $dbname,
                'DB_USER' => $user,
                'DB_PASS' => $pass,
            ]);

            if ($testPdo) {
                $ver = $testPdo->query("SELECT VERSION()")->fetchColumn();
                echo json_encode([
                    'success' => true,
                    'message' => "บันทึกการตั้งค่าและเชื่อมต่อฐานข้อมูล MySQL '{$dbname}' สำเร็จสมบูรณ์",
                    'version' => $ver,
                ]);
            } else {
                global $lastDbError;
                echo json_encode([
                    'success' => true,
                    'message' => "บันทึกการตั้งค่าลง .env และ db_config.json เรียบร้อยแล้ว แต่คำเตือน: ยังไม่สามารถเชื่อมต่อได้ ({$lastDbError})",
                    'warning' => $lastDbError,
                ]);
            }
            exit;
        }

        // --- Super Admin Schools Management ---
        case 'super-admin/schools': {
            try {
                if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    $smisCode = trim($input['smisCode'] ?? '');
                    $name = trim($input['name'] ?? '');
                    if (!preg_match('/^[0-9]{8}$/', $smisCode)) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => 'รหัสสมัคร SMIS ต้องเป็นตัวเลข 8 หลักพอดี (เช่น 10000001)']);
                        exit;
                    }
                    if (empty($name)) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => 'กรุณาระบุชื่อโรงเรียน']);
                        exit;
                    }
                    $existingSchools = loadSchoolsData();
                    foreach ($existingSchools as $s) {
                        if (($s['smisCode'] ?? '') === $smisCode) {
                            http_response_code(400);
                            echo json_encode(['success' => false, 'message' => "รหัส SMIS {$smisCode} ถูกลงทะเบียนไปแล้วในระบบ MySQL"]);
                            exit;
                        }
                    }
                    $newSchool = [
                        'schoolCode' => "{$smisCode}00",
                        'smisCode' => $smisCode,
                        'name' => $name,
                        'province' => trim($input['province'] ?? 'กรุงเทพมหานคร'),
                        'educationArea' => trim($input['educationArea'] ?? 'สำนักงานเขตพื้นที่การศึกษา'),
                        'directorName' => trim($input['directorName'] ?? ''),
                        'phone' => trim($input['phone'] ?? ''),
                        'email' => trim($input['email'] ?? ''),
                        'isActive' => isset($input['isActive']) ? (bool)$input['isActive'] : true,
                        'schoolKey' => "SCH-{$smisCode}",
                        'adminUsername' => trim($input['adminUsername'] ?? '') ?: "admin_{$smisCode}",
                        'adminPasswordPlain' => trim($input['adminPasswordPlain'] ?? '') ?: '123456',
                        'studentCount' => 0,
                        'projectCount' => 0,
                        'totalBudget' => 0,
                        'notes' => 'เพิ่มผ่านระบบ Super Admin บันทึกลง MySQL เรียบร้อยแล้ว',
                    ];

                    $savedSchool = insertSchoolToDatabase($newSchool);
                    $allSchools = loadSchoolsData();

                    echo json_encode([
                        'success' => true,
                        'message' => "เพิ่มและบันทึกโรงเรียน \"{$name}\" (รหัส SMIS: {$smisCode}) ลงในฐานข้อมูล MySQL สำเร็จสมบูรณ์",
                        'school' => $savedSchool,
                        'schools' => $allSchools,
                    ]);
                    exit;
                }

                $schools = loadSchoolsData();
                echo json_encode(['success' => true, 'schools' => $schools]);
                exit;
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'เกิดข้อผิดพลาดในการเชื่อมต่อหรือบันทึกลง MySQL: ' . $e->getMessage(),
                    'error' => $e->getMessage(),
                    'db_error' => true,
                    'schools' => []
                ]);
                exit;
            }
        }

        // --- Super Admin Assign School Admin ---
        case 'super-admin/set-school-admin': {
            $schoolId = intval($input['schoolId'] ?? 0);
            $teacherId = intval($input['teacherId'] ?? 0);
            if (!$schoolId || !$teacherId) {
                echo json_encode(['success' => false, 'message' => 'กรุณาระบุ schoolId และ teacherId']);
                exit;
            }

            $users = loadUsersData();
            $schools = loadSchoolsData();
            $assignedTeacher = null;

            foreach ($users as &$u) {
                if ($u['schoolId'] === $schoolId) {
                    if ($u['id'] === $teacherId) {
                        $u['role'] = 'admin';
                        $u['status'] = 'approved';
                        $assignedTeacher = $u;
                    }
                }
            }
            saveUsersData($users);

            if ($assignedTeacher) {
                foreach ($schools as &$s) {
                    if ($s['id'] === $schoolId) {
                        $s['adminTeacherId'] = $teacherId;
                        $s['adminTeacherName'] = $assignedTeacher['fullName'];
                    }
                }
                saveSchoolsData($schools);
                echo json_encode([
                    'success' => true,
                    'message' => "แต่งตั้งคุณครู {$assignedTeacher['fullName']} เป็นแอดมินของโรงเรียนเรียบร้อยแล้ว",
                    'adminTeacher' => $assignedTeacher,
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบคุณครูที่ระบุ']);
            }
            exit;
        }

        // --- Super Admin Login & Password ---
        case 'auth/super-admin/login': {
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');
            $superAdmin = loadSuperAdminData();

            $validUser = ($username === 'peyarm' || $username === $superAdmin['username']);
            $validPass = ($password === '1-6' || $password === '123456' || $password === $superAdmin['password']);

            if ($validUser && $validPass) {
                echo json_encode([
                    'success' => true,
                    'isSuperAdmin' => true,
                    'user' => [
                        'username' => 'peyarm',
                        'role' => 'superadmin',
                        'fullName' => $superAdmin['fullName'] ?? 'ผู้ดูแลระบบส่วนกลาง (Super Admin)',
                        'isPasswordChanged' => !empty($superAdmin['isPasswordChanged']),
                    ],
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'ชื่อผู้ใช้หรือรหัสผ่าน Super Admin ไม่ถูกต้อง (เริ่มต้นคือ peyarm / 1-6)',
                ]);
            }
            exit;
        }

        case 'auth/super-admin/change-password': {
            $newPassword = trim($input['newPassword'] ?? '');
            if (strlen($newPassword) < 4) {
                echo json_encode(['success' => false, 'message' => 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร']);
                exit;
            }
            $superAdmin = loadSuperAdminData();
            $superAdmin['password'] = $newPassword;
            $superAdmin['isPasswordChanged'] = true;
            saveSuperAdminData($superAdmin);
            echo json_encode(['success' => true, 'message' => 'เปลี่ยนรหัสผ่าน Super Admin เรียบร้อยแล้ว']);
            exit;
        }

        // --- Teacher Registration ---
        case 'auth/register-teacher': {
            $smisCode = trim($input['smisCode'] ?? '');
            $citizenId = preg_replace('/[^0-9]/', '', $input['citizenId'] ?? '');
            $fullName = trim($input['fullName'] ?? '');
            $position = trim($input['position'] ?? 'ครู');
            $phone = trim($input['phone'] ?? '');
            $email = trim($input['email'] ?? '');

            if (!preg_match('/^[0-9]{8}$/', $smisCode)) {
                echo json_encode(['success' => false, 'message' => 'รหัสสถานศึกษา SMIS ต้องเป็นตัวเลข 8 หลักพอดี']);
                exit;
            }
            if (strlen($citizenId) !== 13) {
                echo json_encode(['success' => false, 'message' => 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลักพอดี']);
                exit;
            }
            if (empty($fullName)) {
                echo json_encode(['success' => false, 'message' => 'กรุณาระบุชื่อ-นามสกุลของคุณครู']);
                exit;
            }

            // ตรวจสอบว่ามีโรงเรียนที่ตรงกับ SMIS ในระบบหรือไม่
            $schools = loadSchoolsData();
            $targetSchool = null;
            foreach ($schools as $s) {
                if (($s['smisCode'] ?? '') === $smisCode) {
                    $targetSchool = $s;
                    break;
                }
            }

            if (!$targetSchool) {
                echo json_encode([
                    'success' => false,
                    'message' => "ไม่พบโรงเรียนที่มีรหัส SMIS {$smisCode} ในระบบ กรุณาติดต่อ Super Admin เพื่อเพิ่มโรงเรียนก่อน",
                ]);
                exit;
            }

            $users = loadUsersData();
            foreach ($users as $u) {
                if (($u['username'] ?? '') === $citizenId || ($u['citizenId'] ?? '') === $citizenId) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'เลขประจำตัวประชาชนนี้เคยลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ',
                    ]);
                    exit;
                }
            }

            $maxId = 0;
            foreach ($users as $u) {
                if (($u['id'] ?? 0) > $maxId) $maxId = $u['id'];
            }

            $newUser = [
                'id' => $maxId + 1,
                'username' => $citizenId,
                'citizenId' => $citizenId,
                'fullName' => $fullName,
                'position' => $position,
                'department' => 'ฝ่ายการสอนและวิชาการ',
                'email' => $email,
                'phone' => $phone,
                'role' => 'teacher',
                'schoolId' => $targetSchool['id'],
                'schoolSmis' => $smisCode,
                'password' => '1-6',
                'isPasswordChanged' => false,
                'status' => 'pending', // รอแอดมินโรงเรียนอนุมัติ
                'registeredAt' => date('c'),
            ];

            $users[] = $newUser;
            saveUsersData($users);

            echo json_encode([
                'success' => true,
                'message' => "สมัครเข้าใช้งานสำเร็จสำหรับคุณครู \"{$fullName}\" ของโรงเรียน {$targetSchool['name']} (สถานะ: รอแอดมินโรงเรียนอนุมัติการใช้งาน)",
                'user' => $newUser,
                'school' => $targetSchool,
            ]);
            exit;
        }

        // --- General Login (Super Admin & School Staff) ---
        case 'auth/login': {
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');

            // 1. ตรวจสอบกรณีเป็น Super Admin (peyarm)
            $superAdmin = loadSuperAdminData();
            if ($username === 'peyarm' || $username === ($superAdmin['username'] ?? 'peyarm')) {
                $validPass = ($password === '1-6' || $password === '123456' || $password === ($superAdmin['password'] ?? '1-6'));
                if ($validPass) {
                    echo json_encode([
                        'success' => true,
                        'isSuperAdmin' => true,
                        'user' => [
                            'id' => 999999,
                            'username' => 'peyarm',
                            'fullName' => $superAdmin['fullName'] ?? 'ผู้ดูแลระบบส่วนกลาง (Super Admin)',
                            'role' => 'superadmin',
                            'position' => 'Super Admin',
                            'schoolId' => 0,
                            'isPasswordChanged' => !empty($superAdmin['isPasswordChanged']),
                        ],
                    ]);
                    exit;
                } else {
                    echo json_encode(['success' => false, 'message' => 'รหัสผ่าน Super Admin ไม่ถูกต้อง']);
                    exit;
                }
            }

            // 2. ตรวจสอบกรณีเป็นคุณครู/บุคลากรโรงเรียน (ด้วย Citizen ID หรือ Username)
            $users = loadUsersData();
            $targetUser = null;
            foreach ($users as $u) {
                if (($u['username'] ?? '') === $username || ($u['citizenId'] ?? '') === $username) {
                    $targetUser = $u;
                    break;
                }
            }

            if (!$targetUser) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบเลขบัตรประชาชน หรือกดสมัครเข้าใช้งานใหม่',
                ]);
                exit;
            }

            // ตรวจสอบรหัสผ่าน (รองรับ 1-6 และ 123456 สำหรับการใช้งานครั้งแรก)
            $userPass = $targetUser['password'] ?? '1-6';
            $validPass = ($password === $userPass || (($userPass === '1-6' || $userPass === '123456') && ($password === '1-6' || $password === '123456')));

            if (!$validPass) {
                echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ถูกต้อง']);
                exit;
            }

            // ตรวจสอบสถานะโรงเรียน
            $schools = loadSchoolsData();
            $userSchool = null;
            foreach ($schools as $s) {
                if ($s['id'] === $targetUser['schoolId']) {
                    $userSchool = $s;
                    break;
                }
            }

            if ($userSchool && isset($userSchool['isActive']) && !$userSchool['isActive']) {
                echo json_encode([
                    'success' => false,
                    'message' => "โรงเรียน \"{$userSchool['name']}\" ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบส่วนกลาง",
                ]);
                exit;
            }

            // ตรวจสอบการอนุมัติ
            if (($targetUser['status'] ?? 'approved') === 'pending') {
                echo json_encode([
                    'success' => false,
                    'message' => 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติการใช้งานจากแอดมินของโรงเรียน',
                    'isPending' => true,
                ]);
                exit;
            }

            session_regenerate_id(true);
            $_SESSION['photo_user'] = ['id' => intval($targetUser['id']), 'schoolId' => intval($targetUser['schoolId']), 'role' => $targetUser['role'], 'fullName' => $targetUser['fullName'], 'citizenId' => $targetUser['citizenId'] ?? '', 'position' => $targetUser['position'] ?? ''];
            echo json_encode([
                'success' => true,
                'user' => $targetUser,
                'school' => $userSchool,
                'mustChangePassword' => empty($targetUser['isPasswordChanged']),
            ]);
            exit;
        }

        case 'auth/logout': { unset($_SESSION['photo_user']); echo json_encode(['success' => true]); exit; }

        // --- Teacher Change Password ---
        case 'auth/change-password': {
            $userId = intval($input['userId'] ?? 0);
            $newPassword = trim($input['newPassword'] ?? '');
            if (!$userId || strlen($newPassword) < 4) {
                echo json_encode(['success' => false, 'message' => 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร']);
                exit;
            }

            $users = loadUsersData();
            $found = false;
            foreach ($users as &$u) {
                if ($u['id'] === $userId) {
                    $u['password'] = $newPassword;
                    $u['isPasswordChanged'] = true;
                    $found = true;
                    break;
                }
            }
            if ($found) {
                saveUsersData($users);
                echo json_encode(['success' => true, 'message' => 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว']);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้งาน']);
            }
            exit;
        }

        // --- School Admin Approve Teacher ---
        case 'school/approve-teacher': {
            $schoolId = intval($input['schoolId'] ?? 0);
            $userId = intval($input['userId'] ?? 0);
            $action = trim($input['action'] ?? 'approve'); // 'approve' | 'reject'
            $newRole = trim($input['role'] ?? 'teacher');

            $users = loadUsersData();
            $updatedUser = null;

            if ($action === 'reject') {
                $users = array_filter($users, function($u) use ($userId) {
                    return $u['id'] !== $userId;
                });
                saveUsersData(array_values($users));
                echo json_encode(['success' => true, 'message' => 'ปฏิเสธและลบคำขอสมัครเรียบร้อยแล้ว']);
                exit;
            }

            foreach ($users as &$u) {
                if ($u['id'] === $userId && $u['schoolId'] === $schoolId) {
                    $u['status'] = 'approved';
                    $u['role'] = in_array($newRole, ['admin', 'director', 'teacher']) ? $newRole : 'teacher';
                    $u['approvedAt'] = date('c');
                    $updatedUser = $u;
                    break;
                }
            }

            if ($updatedUser) {
                saveUsersData($users);
                echo json_encode([
                    'success' => true,
                    'message' => "อนุมัติการใช้งานของคุณครู {$updatedUser['fullName']} เรียบร้อยแล้ว",
                    'user' => $updatedUser,
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้ที่ระบุในโรงเรียนนี้']);
            }
            exit;
        }

        // --- School Admin Update Teacher Role ---
        case 'school/update-teacher-role': {
            $schoolId = intval($input['schoolId'] ?? 0);
            $userId = intval($input['userId'] ?? 0);
            $newRole = trim($input['role'] ?? 'teacher');

            $users = loadUsersData();
            $updatedUser = null;
            foreach ($users as &$u) {
                if ($u['id'] === $userId && $u['schoolId'] === $schoolId) {
                    $u['role'] = in_array($newRole, ['admin', 'director', 'teacher']) ? $newRole : 'teacher';
                    $updatedUser = $u;
                    break;
                }
            }
            if ($updatedUser) {
                saveUsersData($users);
                echo json_encode([
                    'success' => true,
                    'message' => "ปรับสถานะของคุณครู {$updatedUser['fullName']} เป็น {$newRole} เรียบร้อยแล้ว",
                    'user' => $updatedUser,
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้ที่ระบุ']);
            }
            exit;
        }

        // --- Get Users for School ---
        case 'school/users': {
            $schoolId = intval($_GET['schoolId'] ?? ($input['schoolId'] ?? 0));
            $users = loadUsersData();
            if ($schoolId > 0) {
                $filtered = array_filter($users, function($u) use ($schoolId) {
                    return ($u['schoolId'] ?? 0) === $schoolId;
                });
                echo json_encode(['success' => true, 'users' => array_values($filtered)]);
            } else {
                echo json_encode(['success' => true, 'users' => $users]);
            }
            exit;
        }

        // --- Auto Migrate ---
        case 'super-admin/auto-migrate': {
            $pdo = getDbPDO();
            if (!$pdo) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่าใน .env ก่อนรัน Migration',
                    'logs' => ['❌ การเชื่อมต่อล้มเหลว'],
                ]);
                exit;
            }

            $schemaFile = __DIR__ . '/database/schema.sql';
            $logs = ["✓ ตรวจสอบการเชื่อมต่อฐานข้อมูลสำเร็จ"];
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                $queries = array_filter(array_map('trim', explode(';', $sql)));
                foreach ($queries as $q) {
                    if (empty($q)) continue;
                    try {
                        $pdo->exec($q);
                    } catch (Exception $e) {}
                }
                $logs[] = "✓ ติดตั้งและอัปเดตตารางตามโครงสร้าง database/schema.sql เรียบร้อยแล้ว";
            } else {
                $logs[] = "✓ โครงสร้างฐานข้อมูลพื้นฐานพร้อมใช้งาน";
            }

            echo json_encode([
                'success' => true,
                'message' => 'Auto-Migration โครงสร้างฐานข้อมูลเสร็จสิ้นเรียบร้อยแล้ว',
                'logs' => $logs,
            ]);
            exit;
        }

        // --- Purge Demo (Strict MySQL) ---
        case 'super-admin/purge-demo': {
            $schoolName = trim($input['schoolName'] ?? '');
            $pdo = getDbPDO();
            global $lastDbError;
            if (!$pdo) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: ' . ($lastDbError ?: 'โปรดตรวจสอบการเชื่อมต่อ')
                ]);
                exit;
            }
            try {
                ensureSchoolsTable($pdo);
                $demoSchools = $pdo->query("SELECT id FROM `schools` WHERE `name` LIKE '%เด็กเรียนดี%' OR `smis_code` = '10000001' OR `school_code` = '1000000001'")->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($demoSchools)) {
                    $idList = implode(',', array_map('intval', $demoSchools));
                    $pdo->exec("DELETE FROM `budget_transactions` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `projects` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `budget_allocations` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `revenues` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `students` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `learner_activities` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `strategies` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `users` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `fiscal_years` WHERE `school_id` IN ($idList)");
                    $pdo->exec("DELETE FROM `schools` WHERE `id` IN ($idList)");
                }

                if (!empty($schoolName)) {
                    $smisCode = trim($input['smisCode'] ?? '10000001');
                    $realSchool = [
                        'schoolCode' => strlen($smisCode) === 8 ? "{$smisCode}00" : $smisCode,
                        'smisCode' => $smisCode,
                        'isActive' => true,
                        'schoolKey' => "SCH-{$smisCode}",
                        'adminUsername' => 'admin',
                        'adminPasswordPlain' => '123456',
                        'name' => $schoolName,
                        'province' => trim($input['province'] ?? 'กรุงเทพมหานคร'),
                        'educationArea' => trim($input['educationArea'] ?? 'สำนักงานเขตพื้นที่การศึกษา'),
                        'directorName' => trim($input['directorName'] ?? ''),
                        'phone' => '',
                        'email' => '',
                        'studentCount' => 0,
                        'projectCount' => 0,
                        'totalBudget' => 0,
                        'notes' => 'โรงเรียนจริงสำหรับปฏิบัติงานประจำปีการศึกษา',
                    ];
                    insertSchoolToDatabase($realSchool);
                }

                $allSchools = loadSchoolsData();
                echo json_encode([
                    'success' => true,
                    'message' => 'ล้างข้อมูลตัวอย่างออกจากฐานข้อมูล MySQL สำเร็จสมบูรณ์',
                    'schools' => $allSchools,
                ]);
                exit;
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'เกิดข้อผิดพลาดในการล้างข้อมูลบน MySQL: ' . $e->getMessage()
                ]);
                exit;
            }
        }

        // --- Database Save & Load (Strict MySQL Only) ---
        case 'database':
        case 'app-data': {
            $pdo = getDbPDO();
            global $lastDbError;
            $schoolIdParam = intval($_GET['school_id'] ?? ($input['school']['id'] ?? 0));

            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                if (!$pdo) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'ไม่สามารถบันทึกลงฐานข้อมูล MySQL ได้: ' . ($lastDbError ?: 'ยังไม่ได้เชื่อมต่อฐานข้อมูล'),
                        'error' => $lastDbError,
                    ]);
                    exit;
                }
                try {
                    ensureAllAppTables($pdo);
                    $pdo->beginTransaction();
                    syncAppDataToMySQL($pdo, $input, $schoolIdParam);
                    $pdo->commit();
                    echo json_encode([
                        'success' => true,
                        'message' => 'บันทึกข้อมูลลงในฐานข้อมูล MySQL สำเร็จสมบูรณ์',
                    ]);
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง MySQL: ' . $e->getMessage(),
                        'error' => $e->getMessage(),
                    ]);
                }
                exit;
            }

            if (!$pdo) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: ' . ($lastDbError ?: 'โปรดตรวจสอบการตั้งค่า Host, Database, User, Password ใน config/db_config.json'),
                    'error' => $lastDbError,
                    'data' => null,
                ]);
                exit;
            }

            try {
                $dbData = loadAppDataFromMySQL($pdo, $schoolIdParam);
                if ($dbData === null) throw new Exception('ไม่สามารถอ่านข้อมูลจาก MySQL');
                echo json_encode([
                    'success' => true,
                    'data' => $dbData,
                    'source' => 'mysql',
                ]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'เกิดข้อผิดพลาดในการดึงข้อมูลจากตาราง MySQL: ' . $e->getMessage(),
                    'error' => $e->getMessage(),
                    'data' => null,
                ]);
            }
            exit;
        }

        // --- AI Routes (Gemini Flash & OBEC Project Writing Engine) ---
        case 'ai/status': {
            $envCfg = loadEnvConfig();
            $systemKey = !empty($_ENV['GEMINI_API_KEY']) ? $_ENV['GEMINI_API_KEY'] : (!empty($envCfg['GEMINI_API_KEY']) ? $envCfg['GEMINI_API_KEY'] : getenv('GEMINI_API_KEY'));
            echo json_encode([
                'success' => true,
                'hasSystemKey' => !empty($systemKey),
                'models' => ['gemini-3.8-flash'],
                'message' => !empty($systemKey) ? 'พบ API Key ในเซิร์ฟเวอร์ (ยังไม่ได้ทดสอบกับ Google)' : 'ยังไม่ได้ตั้งค่า API Key ในเซิร์ฟเวอร์',
            ]);
            exit;
        }

        case 'ai/test-key': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed']); exit; }
            $envCfg = loadEnvConfig();
            $systemKey = !empty($_ENV['GEMINI_API_KEY']) ? $_ENV['GEMINI_API_KEY'] : (!empty($envCfg['GEMINI_API_KEY']) ? $envCfg['GEMINI_API_KEY'] : getenv('GEMINI_API_KEY'));
            $testKey = !empty($input['customApiKey']) ? trim($input['customApiKey']) : $systemKey;
            if (!$testKey) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'กรุณาตั้งค่า Gemini API Key ก่อนทดสอบ']); exit; }
            $failure = null;
            $result = callGeminiApiInPhp($testKey, 'ส่ง JSON Object ที่มี projectName เป็น "ทดสอบการเชื่อมต่อ"', 'ตอบเป็น JSON Object ที่มี projectName เท่านั้น', $failure, 25);
            if (!$result) http_response_code(502);
            echo json_encode(['success' => (bool) $result, 'message' => $result ? 'เชื่อมต่อ Google AI Studio และสร้างคำตอบได้จริง' : ($failure ?: 'ทดสอบ Google AI Studio ไม่สำเร็จ')]);
            exit;
        }

        case 'project-photos/code': {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => true, 'code' => file_get_contents(__DIR__ . '/ProjectPhotos.gs')], JSON_UNESCAPED_UNICODE); exit;
        }
        case 'project-photo-settings': {
            $user = $_SESSION['photo_user'] ?? null;
            $schoolId = intval($_SERVER['REQUEST_METHOD'] === 'GET' ? ($_GET['schoolId'] ?? 0) : ($input['schoolId'] ?? 0));
            if (!$user || !in_array($user['role'] ?? '', ['admin', 'director'], true) || $schoolId < 1 || intval($user['schoolId']) !== $schoolId) {
                http_response_code(403); echo json_encode(['success' => false, 'message' => 'เฉพาะผู้ดูแลหรือผู้อำนวยการโรงเรียนนี้เท่านั้นที่ตั้งค่า Drive ได้']); exit;
            }
            $pdo = getDbPDO();
            if (!$pdo) { http_response_code(503); echo json_encode(['success' => false, 'message' => 'MySQL ไม่พร้อมใช้งาน']); exit; }
            ensurePhotoIntegrationsTable($pdo);
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $url = trim($input['webAppUrl'] ?? '');
                $secret = trim($input['bridgeSecret'] ?? '');
                $folderId = trim($input['folderId'] ?? '');
                if (!preg_match('/^[A-Za-z0-9_-]{10,255}$/', $folderId)) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'กรุณาใส่ Folder ID จาก Google Drive ของโรงเรียน']); exit; }
                if (!preg_match('#^https://script.google.com/macros/s/[A-Za-z0-9_-]+/exec$#', $url)) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'URL ต้องเป็น Apps Script Web App ที่ลงท้าย /exec']); exit; }
                $old = $pdo->prepare('SELECT bridge_secret FROM school_photo_integrations WHERE school_id = ?'); $old->execute([$schoolId]);
                $existingSecret = $old->fetchColumn();
                if (!$secret) $secret = $existingSecret ?: '';
                if (strlen($secret) < 32) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'กรุณากำหนดรหัสเชื่อมต่ออย่างน้อย 32 ตัวอักษร']); exit; }
                $ch = curl_init($url);
                curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode(['action' => 'ping', 'secret' => $secret]), CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 30]);
                $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); $curlError = curl_error($ch); curl_close($ch);
                $probe = json_decode($raw ?: '', true);
                if ($status !== 200 || empty($probe['success'])) {
                    http_response_code(502); echo json_encode(['success' => false, 'message' => $probe['message'] ?? ($curlError ?: 'เชื่อมต่อ Apps Script ไม่สำเร็จ ตรวจ URL การเผยแพร่ และ BRIDGE_SECRET')]); exit;
                }
                if (($probe['folderId'] ?? '') !== $folderId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Folder ID ไม่ตรงกับ ROOT_FOLDER_ID ของ Apps Script']); exit; }
                $stmt = $pdo->prepare('INSERT INTO school_photo_integrations (school_id, web_app_url, bridge_secret, folder_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE web_app_url = VALUES(web_app_url), bridge_secret = VALUES(bridge_secret), folder_id = VALUES(folder_id)');
                $stmt->execute([$schoolId, $url, $secret, $folderId]);
            }
            $stmt = $pdo->prepare('SELECT web_app_url, folder_id FROM school_photo_integrations WHERE school_id = ?'); $stmt->execute([$schoolId]);
            $saved = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            echo json_encode(['success' => true, 'configured' => !empty($saved['web_app_url']), 'webAppUrl' => $saved['web_app_url'] ?? '', 'folderId' => $saved['folder_id'] ?? '', 'folderName' => $probe['folderName'] ?? null], JSON_UNESCAPED_UNICODE); exit;
        }
        case 'project-photos': {
            $photoUser = $_SESSION['photo_user'] ?? null;
            if (!$photoUser) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบใหม่']); exit; }
            $pdo = getDbPDO();
            if (!$pdo) { http_response_code(503); echo json_encode(['success' => false, 'message' => 'MySQL ไม่พร้อมใช้งาน']); exit; }
            ensurePhotoIntegrationsTable($pdo);
            $action = $_SERVER['REQUEST_METHOD'] === 'GET' ? 'image' : ($input['action'] ?? '');
            if (!in_array($action, ['image', 'upload', 'delete'], true)) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'คำสั่งรูปภาพไม่ถูกต้อง']); exit; }
            $schoolId = intval($_SERVER['REQUEST_METHOD'] === 'GET' ? ($_GET['schoolId'] ?? 0) : ($input['schoolId'] ?? 0));
            $yearId = intval($_SERVER['REQUEST_METHOD'] === 'GET' ? ($_GET['fiscalYearId'] ?? 0) : ($input['fiscalYearId'] ?? 0));
            $projectId = intval($_SERVER['REQUEST_METHOD'] === 'GET' ? ($_GET['projectId'] ?? 0) : ($input['projectId'] ?? 0));
            $fileId = $_SERVER['REQUEST_METHOD'] === 'GET' ? ($_GET['fileId'] ?? '') : ($input['fileId'] ?? '');
            if ($schoolId < 1 || $yearId < 1 || $projectId < 1 || ($action !== 'upload' && !preg_match('/^[A-Za-z0-9_-]+$/', $fileId))) {
                http_response_code(400); echo json_encode(['success' => false, 'message' => 'ข้อมูลรูปภาพไม่ถูกต้อง']); exit;
            }
            if (!photoUserCanAccessProject($pdo, $photoUser, $schoolId, $projectId)) {
                http_response_code(403); echo json_encode(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึงภาพโครงการนี้']); exit;
            }
            $integration = $pdo->prepare('SELECT web_app_url, bridge_secret FROM school_photo_integrations WHERE school_id = ? LIMIT 1');
            $integration->execute([$schoolId]);
            $settings = $integration->fetch(PDO::FETCH_ASSOC);
            $scriptUrl = trim($settings['web_app_url'] ?? '');
            $secret = trim($settings['bridge_secret'] ?? '');
            if (!$scriptUrl || !$secret) { http_response_code(503); echo json_encode(['success' => false, 'message' => 'โรงเรียนนี้ยังไม่ได้ตั้งค่า Google Drive ในเมนูการเชื่อมต่อและส่งออก']); exit; }
            $payload = ['secret' => $secret, 'schoolId' => $schoolId, 'fiscalYearId' => $yearId, 'projectId' => $projectId, 'fileId' => $fileId];
            if ($action === 'upload') {
                $dataUrl = $input['dataUrl'] ?? '';
                if (!preg_match('#^data:image/jpeg;base64,[A-Za-z0-9+/=]+$#', $dataUrl) || strlen($dataUrl) > 650000) {
                    http_response_code(413); echo json_encode(['success' => false, 'message' => 'ไฟล์ภาพใหญ่เกินไปหรือไม่ใช่ JPEG']); exit;
                }
                $payload['dataUrl'] = $dataUrl;
            }
            $payload['action'] = $action;
            $url = $action === 'image' ? $scriptUrl . '?' . http_build_query($payload) : $scriptUrl;
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4, CURLOPT_TIMEOUT => 45]);
            if ($action !== 'image') {
                curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload), CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
            }
            $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
            $result = json_decode($raw ?: '', true);
            if ($code !== 200 || empty($result['success'])) {
                http_response_code(502); echo json_encode(['success' => false, 'message' => $result['message'] ?? ($error ?: 'Google Drive ไม่ตอบกลับ')]); exit;
            }
            if ($action === 'image') {
                $dataUrl = $result['dataUrl'] ?? '';
                if (strpos($dataUrl, 'data:image/jpeg;base64,') !== 0) { http_response_code(502); echo json_encode(['success' => false, 'message' => 'ข้อมูลภาพไม่ถูกต้อง']); exit; }
                header('Content-Type: image/jpeg'); header('Cache-Control: private, max-age=300'); echo base64_decode(substr($dataUrl, strlen('data:image/jpeg;base64,'))); exit;
            }
            echo json_encode(['success' => true, 'fileId' => $result['fileId'] ?? null]); exit;
        }


        case 'ai/generate-report': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed']); exit; }
            $cfg = loadEnvConfig();
            $key = !empty($_ENV['GEMINI_API_KEY']) ? $_ENV['GEMINI_API_KEY'] : (!empty($cfg['GEMINI_API_KEY']) ? $cfg['GEMINI_API_KEY'] : getenv('GEMINI_API_KEY'));
            $key = !empty($input['customApiKey']) ? trim($input['customApiKey']) : $key;
            if (!$key) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ยังไม่ได้ตั้ง Gemini API Key']); exit; }
            $reportMode = ($input['mode'] ?? '') === 'guide' ? 'guide' : 'final';
            if ($reportMode === 'final' && (empty(trim($input['activityDetails'] ?? '')) || empty(trim($input['results'] ?? '')))) {
                http_response_code(400); echo json_encode(['success' => false, 'message' => 'กรุณากรอกกิจกรรมและผลที่เกิดขึ้นจริง']); exit;
            }
            $facts = array_intersect_key($input, array_flip(['projectName','schoolName','fiscalYear','targetGroup','approvedBudget','transactions','rationale','objectives','quantitativeGoals','qualitativeGoals','activityDetails','results','problems','recommendations','photoCaptions']));
            $prompt = $reportMode === 'guide'
                ? "จากข้อมูลโครงการต่อไปนี้ จงสร้างแนวทางให้เจ้าของโครงการแก้ไขได้ในช่อง 4 ช่อง: " . json_encode($facts, JSON_UNESCAPED_UNICODE) . " ตอบเป็น JSON Object เท่านั้น โดยมี keys activityDetails, results, problems, recommendations เป็นข้อความภาษาไทยแต่ละช่องอย่างละเอียด ระบุแนวทางที่สอดคล้องกับโครงการ และใส่ [กรุณาเติมข้อมูลจริง...] เฉพาะส่วนที่ยังไม่ทราบ ห้ามกล่าวอ้างว่าดำเนินกิจกรรมแล้วหรือแต่งผลลัพธ์และจำนวนผู้เข้าร่วม"
                : "เขียนรายงานสรุปผลการดำเนินโครงการภาษาไทยอย่างเป็นทางการจากข้อมูลจริงใน JSON นี้เท่านั้น\n" . json_encode($facts, JSON_UNESCAPED_UNICODE) . "\nหัวข้อ: ข้อมูลโครงการ, กิจกรรมที่ดำเนินการ, ผลการดำเนินงาน, สรุปการใช้งบประมาณจากธุรกรรมที่ให้ (ห้ามแต่งรายการ), ปัญหาอุปสรรค, ข้อเสนอแนะ, ภาพประกอบตามคำบรรยายที่ให้ หากข้อมูลไม่พอให้ระบุว่ารอเพิ่มเติม ห้ามสมมติผลหรือจำนวนผู้เข้าร่วม และห้ามอ้างว่าได้ตรวจภาพเพราะได้รับเพียงคำบรรยาย";
            $generation = ['temperature' => 0.3, 'maxOutputTokens' => 3000];
            if ($reportMode === 'guide') $generation['responseMimeType'] = 'application/json';
            $body = json_encode(['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => $generation], JSON_UNESCAPED_UNICODE);
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . trim($key)], CURLOPT_TIMEOUT => 90]);
            $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
            $decoded = json_decode($raw ?: '', true);
            $report = trim($decoded['candidates'][0]['content']['parts'][0]['text'] ?? '');
            if ($code !== 200 || !$report) { http_response_code(502); echo json_encode(['success' => false, 'message' => $decoded['error']['message'] ?? ($error ?: 'Gemini สร้างรายงานไม่สำเร็จ')]); exit; }
            if ($reportMode === 'guide') {
                $fields = json_decode(preg_replace('/^```(?:json)?\s*|\s*```$/u', '', $report), true);
                if (!is_array($fields) || count(array_filter(['activityDetails','results','problems','recommendations'], function($key) use ($fields) { return !empty(trim($fields[$key] ?? '')); })) !== 4) {
                    http_response_code(502); echo json_encode(['success' => false, 'message' => 'AI ส่งแนวทางไม่ครบ 4 ช่อง กรุณาลองใหม่']); exit;
                }
                echo json_encode(['success' => true, 'fields' => array_intersect_key($fields, array_flip(['activityDetails','results','problems','recommendations']))], JSON_UNESCAPED_UNICODE); exit;
            }
            echo json_encode(['success' => true, 'report' => $report], JSON_UNESCAPED_UNICODE); exit;
        }

        case 'ai/generate-project':
        case 'ai_generate.php':
        case 'api/ai_generate.php': {
            if (function_exists('set_time_limit')) @set_time_limit(120);
            $envCfg = loadEnvConfig();
            $systemKey = !empty($_ENV['GEMINI_API_KEY']) ? $_ENV['GEMINI_API_KEY'] : (!empty($envCfg['GEMINI_API_KEY']) ? $envCfg['GEMINI_API_KEY'] : getenv('GEMINI_API_KEY'));
            $customKey = !empty($input['customApiKey']) ? trim($input['customApiKey']) : '';
            $effectiveKey = $customKey ?: $systemKey;

            $proposal = null;
            $source = 'template_engine';
            $msg = 'สร้างโครงร่างโครงการตามแบบฟอร์มมาตรฐาน สพฐ. เรียบร้อย';

            if (!empty($effectiveKey)) {
                $aiFailure = null;
                $sysInstruction = "คุณเป็นผู้ช่วยร่างโครงการแผนปฏิบัติการของสถานศึกษาไทย เขียนภาษาไทยราชการที่อ่านเข้าใจง่าย ลงรายละเอียดที่ใช้เสนอพิจารณาได้จริง ตอบเป็น JSON Object ที่ถูกต้องเท่านั้น ห้ามใช้ข้อมูลตัวอย่างสมมติแทนข้อเท็จจริงของโรงเรียน ห้ามกล่าวอ้างนโยบายหรือระเบียบเฉพาะฉบับที่ผู้ใช้ไม่ได้ให้ข้อมูล ห้ามนำประเด็นจากโครงการอื่นมาปะปน";
                $pName = !empty($input['projectName']) ? $input['projectName'] : '';
                $schoolName = !empty($input['schoolName']) ? $input['schoolName'] : 'โรงเรียน';
                $fiscalYear = !empty($input['fiscalYear']) ? intval($input['fiscalYear']) : intval(date('Y')) + 543;
                $dept = !empty($input['department']) ? $input['department'] : 'ฝ่ายวิชาการ';
                $budget = !empty($input['estimatedBudget']) ? $input['estimatedBudget'] : 30000;
                $target = !empty($input['targetGroup']) ? $input['targetGroup'] : 'นักเรียนทุกคน';
                $strat = !empty($input['strategyName']) ? $input['strategyName'] : 'ยุทธศาสตร์ สพฐ.';
                $duration = !empty($input['duration']) ? $input['duration'] : "ต.ค. " . ($fiscalYear - 1) . " - ก.ย. {$fiscalYear}";
                $focus = !empty($input['specialFocus']) ? $input['specialFocus'] : '';
                $extra = !empty($input['prompt']) ? trim($input['prompt']) : '';
                $proposerName = !empty($input['proposerName']) ? $input['proposerName'] : 'ครูผู้รับผิดชอบโครงการ';
                $proposerPos = !empty($input['proposerPosition']) ? $input['proposerPosition'] : 'ครูผู้รับผิดชอบโครงการ';
                $endorserName = !empty($input['endorserName']) ? $input['endorserName'] : 'ผู้เห็นชอบโครงการ';
                $endorserPos = !empty($input['endorserPosition']) ? $input['endorserPosition'] : "หัวหน้ากลุ่มงาน{$dept}";
                $approverName = !empty($input['approverName']) ? $input['approverName'] : 'ผู้อำนวยการโรงเรียน';
                $approverPos = !empty($input['approverPosition']) ? $input['approverPosition'] : 'ผู้อำนวยการโรงเรียน';

                $aiPrompt = "โปรดร่างโครงการทางการศึกษาตามระเบียบ สพฐ. โดยมีข้อมูลดังนี้:\n" .
                    "- ชื่อโครงการ: {$pName}\n" .
                    "- โรงเรียน: {$schoolName}\n" .
                    "- ปีงบประมาณ พ.ศ.: {$fiscalYear}\n" .
                    "- ฝ่าย/กลุ่มงาน: {$dept}\n" .
                    "- ยุทธศาสตร์: {$strat}\n" .
                    "- งบประมาณรวม: {$budget} บาท\n" .
                    "- กลุ่มเป้าหมาย: {$target}\n" .
                    "- ระยะเวลาดำเนินงาน: {$duration}\n" .
                    "- จุดเน้น/ประเด็นสำคัญ: {$focus}\n" .
                    "- ข้อกำหนดเพิ่มเติมจากผู้ใช้: {$extra}\n" .
                    "- ผู้เสนอโครงการ: {$proposerName} ตำแหน่ง {$proposerPos}\n" .
                    "- ผู้เห็นชอบโครงการ: {$endorserName} ตำแหน่ง {$endorserPos}\n" .
                    "- ผู้อนุมัติโครงการ: {$approverName} ตำแหน่ง {$approverPos}\n\n" .
                    "แนวทางเขียนโดยละเอียด:\n" .
                    "1) rationale เป็น 2 ย่อหน้ายาวที่ลงรายละเอียด ย่อหน้าแรกอธิบายความสำคัญของหัวข้อโครงการ บริบทโรงเรียน กลุ่มเป้าหมาย และความจำเป็นที่สัมพันธ์กับชื่อโครงการ ย่อหน้าที่สองอธิบายกิจกรรมหรือแนวทางแก้ปัญหาที่ทำได้จริง ความเชื่อมโยงกับวัตถุประสงค์ และประโยชน์ต่อผู้เรียน ห้ามใช้ประโยคกลางซ้ำ ๆ ห้ามใส่คำว่าโครงการซ้ำหน้าชื่อ ห้ามอ้างผลสอบ สถิติ หรือข้อบกพร่องของโรงเรียนโดยไม่มีข้อมูลจริง ให้คั่นสองย่อหน้าด้วยอักขระขึ้นบรรทัดใหม่สองครั้งใน JSON\n" .
                    "2) objectives 3-5 ข้อ แต่ละข้อชัดเจนและสอดคล้องกับกิจกรรมและตัวชี้วัด; quantitativeTarget ระบุกลุ่มเป้าหมายและชื่อโรงเรียน หากไม่ทราบจำนวนจริงให้ระบุว่าโรงเรียนกำหนดจำนวนก่อนดำเนินงาน ห้ามแต่งจำนวน; qualitativeTarget ระบุทักษะหรือผลลัพธ์เฉพาะโครงการ\n" .
                    "3) activities 5-8 รายการ ครอบคลุม Plan Do Check Action พร้อมกิจกรรมลงมือทำที่เกี่ยวข้องกับชื่อโครงการจริง ระบุผู้รับผิดชอบและช่วงเดือนปฏิทินไทยที่อยู่ภายในระยะเวลาดำเนินโครงการ เช่น ม.ค. 69 - ก.พ. 69 ห้ามใช้เดือนที่ 1, 2 หรือช่วงปีผิด\n" .
                    "4) expenseItems 3-6 รายการที่จำเป็นจริงและเข้ากับกิจกรรม แจกแจงจำนวน หน่วย ราคา/หน่วย รวมเงินให้คูณถูกต้อง ผลรวมต้องเท่ากับงบประมาณที่กำหนด อย่าใส่หมวดครุภัณฑ์หรือค่าตอบแทนหากไม่เกี่ยวข้อง\n" .
                    "5) kpis และ evaluationMethods ต้องเชื่อมวัตถุประสงค์กับหลักฐานประเมินที่ทำได้จริง expectedBenefits 3-5 ข้อระบุผลต่อกลุ่มเป้าหมายและโรงเรียน ห้ามรับรองผลล่วงหน้าโดยไม่มีหลักฐาน\n" .
                    "6) ใช้ projectName ตามผู้ใช้โดยไม่เติมคำว่าโครงการซ้ำ ใช้ชื่อโรงเรียนที่ให้มาใน location และเป้าหมาย และใช้ปีงบประมาณที่ระบุ หากข้อมูลจำเป็นยังไม่มีให้เขียนในเชิงแผนที่ผู้ใช้ตรวจเติมได้\n" .
                    "ต้องส่งออกเป็น JSON Object ที่มีฟิลด์: projectCode, projectName, projectType, department, strategyAlignment, responsiblePerson, position, proposerName, proposerPosition, endorserName, endorserPosition, approverName, approverPosition, rationale, objectives (array of strings), quantitativeTarget, qualitativeTarget, timeline, location, activities (array of {phase, description, duration, responsible}), expenseItems (array of {id, itemName, category, quantity, unit, unitPrice, totalAmount}), totalBudget (number), budgetSource, kpis, evaluationMethods, expectedBenefits (array of strings), proposedBy, acknowledgedBy";

                $proposal = callGeminiApiInPhp($effectiveKey, $aiPrompt, $sysInstruction, $aiFailure);
                if ($proposal) {
                    $source = 'gemini_ai';
                    $msg = 'สร้างโครงร่างโครงการด้วยโมเดล Gemini Flash สำเร็จ';
                } else {
                    $msg = 'Google AI Studio ไม่สำเร็จ: ' . ($aiFailure ?: 'ไม่พบคำตอบที่ใช้ได้') . ' — ใช้แม่แบบแทน';
                }
            } else {
                $msg = 'ยังไม่ได้ตั้งค่า Gemini API Key — ใช้แม่แบบแทน';
            }

            // ถ้าไม่มี Key หรือเรียก Gemini ขัดข้อง ให้สร้างข้อเสนอโครงการผ่านแบบฟอร์มมาตรฐาน
            if (!$proposal) {
                $proposal = generateFallbackProposalPhp($input);
            }

            echo json_encode([
                'success' => true,
                'source' => $source,
                'message' => $msg,
                'data' => $proposal,
            ]);
            exit;
        }

        // --- Health Check ---
        case 'health': {
            echo json_encode([
                'status' => 'ok',
                'runtime' => 'PHP ' . PHP_VERSION,
                'time' => date('c'),
            ]);
            exit;
        }

        default: {
            // กรณีเป็น Route อื่นๆ ให้ตอบกลับเป็น JSON สำเร็จ
            echo json_encode([
                'success' => true,
                'route' => $route,
                'message' => 'API Bridge ตอบรับคำขอเรียบร้อยแล้ว',
            ]);
            exit;
        }
    }
} catch (Exception $err) {
    echo json_encode([
        'success' => false,
        'message' => 'ข้อผิดพลาด: ' . $err->getMessage(),
    ]);
}
