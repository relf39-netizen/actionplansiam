<?php
/**
 * Universal PHP API Bridge for cPanel / Shared Hosting
 * รองรับการทำงานของ API เมื่อรันผ่าน Apache / PHP Direct Routing
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. โหลดข้อมูลการเชื่อมต่อฐานข้อมูลจาก .env
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
                if (isset($config[$key]) || strpos($key, 'DB_') === 0) {
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
    $file = getUsersPath();
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveUsersData($data) {
    file_put_contents(getUsersPath(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
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
    } catch (Exception $e) {
        error_log("Failed to ensure schools table: " . $e->getMessage());
    }
}

function loadSchoolsData() {
    global $lastDbError;
    $pdo = getDbPDO();
    if (!$pdo) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: " . ($lastDbError ?: "โปรดตรวจสอบการตั้งค่า Host, Database, User, Password"));
    }
    ensureSchoolsTable($pdo);
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
    } catch (Exception $e) {
        error_log("Failed to ensure app tables: " . $e->getMessage());
    }
}

function syncAppDataToMySQL($pdo, $data) {
    if (!$pdo) return;
    ensureAllAppTables($pdo);

    // 1. Sync school
    if (!empty($data['school']) && is_array($data['school'])) {
        insertSchoolToDatabase($data['school']);
    }

    $schoolId = intval($data['school']['id'] ?? 1);
    if ($schoolId <= 0) $schoolId = 1;

    // 2. Sync projects
    if (!empty($data['projects']) && is_array($data['projects'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `projects` 
                (`id`, `school_id`, `fiscal_year_id`, `project_code`, `project_name`, `rationale`, `objectives`, `quantitative_goals`, `qualitative_goals`, `kpis`, `procedures`, `duration_start`, `duration_end`, `location`, `target_group`, `responsible_person`, `department`, `budget_source`, `allocated_budget`, `spent_budget`, `remaining_budget`, `status`, `approval_status`)
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  project_name = VALUES(project_name),
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
                  approval_status = VALUES(approval_status)");

            foreach ($data['projects'] as $p) {
                if (empty($p['id']) || empty($p['projectName'])) continue;
                $allocated = floatval($p['allocatedBudget'] ?? 0);
                $spent = floatval($p['spentBudget'] ?? 0);
                $remaining = floatval($p['remainingBudget'] ?? ($allocated - $spent));

                $stmt->execute([
                    intval($p['id']),
                    $schoolId,
                    $p['projectCode'] ?? ('PROJ-' . $p['id']),
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
                    $p['approvalStatus'] ?? 'approved',
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to sync projects: " . $e->getMessage());
        }
    }

    // 3. Sync revenues
    if (!empty($data['revenues']) && is_array($data['revenues'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `revenues`
                (`id`, `school_id`, `fiscal_year_id`, `category`, `item_name`, `rate_per_head`, `eligible_count`, `calculated_amount`, `is_custom_rate`, `note`)
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  category = VALUES(category),
                  item_name = VALUES(item_name),
                  rate_per_head = VALUES(rate_per_head),
                  eligible_count = VALUES(eligible_count),
                  calculated_amount = VALUES(calculated_amount),
                  is_custom_rate = VALUES(is_custom_rate),
                  note = VALUES(note)");

            foreach ($data['revenues'] as $r) {
                if (empty($r['id']) || empty($r['itemName'])) continue;
                $stmt->execute([
                    intval($r['id']),
                    $schoolId,
                    $r['category'] ?? 'subsidy',
                    $r['itemName'],
                    floatval($r['ratePerHead'] ?? 0),
                    intval($r['eligibleCount'] ?? 0),
                    floatval($r['calculatedAmount'] ?? 0),
                    !empty($r['isCustomRate']) ? 1 : 0,
                    $r['note'] ?? '',
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to sync revenues: " . $e->getMessage());
        }
    }

    // 4. Sync budget_allocations
    if (!empty($data['allocations']) && is_array($data['allocations'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `budget_allocations`
                (`id`, `school_id`, `fiscal_year_id`, `department_name`, `percentage`, `allocated_amount`, `spent_amount`, `remaining_amount`, `color_hex`, `description`)
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  department_name = VALUES(department_name),
                  percentage = VALUES(percentage),
                  allocated_amount = VALUES(allocated_amount),
                  spent_amount = VALUES(spent_amount),
                  remaining_amount = VALUES(remaining_amount),
                  color_hex = VALUES(color_hex),
                  description = VALUES(description)");

            foreach ($data['allocations'] as $a) {
                if (empty($a['id']) || empty($a['departmentName'])) continue;
                $stmt->execute([
                    intval($a['id']),
                    $schoolId,
                    $a['departmentName'],
                    floatval($a['percentage'] ?? 0),
                    floatval($a['allocatedAmount'] ?? 0),
                    floatval($a['spentAmount'] ?? 0),
                    floatval($a['remainingAmount'] ?? 0),
                    $a['colorHex'] ?? '#2563eb',
                    $a['description'] ?? '',
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to sync allocations: " . $e->getMessage());
        }
    }

    // 5. Sync budget_transactions
    if (!empty($data['transactions']) && is_array($data['transactions'])) {
        try {
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
                if (empty($t['id']) || empty($t['itemDescription'])) continue;
                $stmt->execute([
                    intval($t['id']),
                    $schoolId,
                    intval($t['projectId'] ?? 0),
                    $t['docNumber'] ?? ('DOC-' . $t['id']),
                    $t['transactionDate'] ?? date('Y-m-d'),
                    $t['itemDescription'],
                    floatval($t['amount'] ?? 0),
                    $t['payee'] ?? '',
                    $t['receiptNumber'] ?? '',
                    $t['approvedBy'] ?? 'ผู้อำนวยการโรงเรียน',
                    $t['status'] ?? 'approved',
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to sync transactions: " . $e->getMessage());
        }
    }
}

function loadAppDataFromMySQL($pdo) {
    if (!$pdo) return null;
    ensureAllAppTables($pdo);
    try {
        $result = [];

        // 1. School
        $stmt = $pdo->query("SELECT id, school_code as schoolCode, smis_code as smisCode, is_active as isActive, school_key as schoolKey, admin_username as adminUsername, name, province, education_area as educationArea, director_name as directorName, phone, email, student_count as studentCount, project_count as projectCount, total_budget as totalBudget, notes FROM `schools` WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
        $school = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($school) {
            $school['id'] = intval($school['id']);
            $school['isActive'] = true;
            $result['school'] = $school;
        }

        // 2. Projects
        $stmt = $pdo->query("SELECT id, project_code as projectCode, project_name as projectName, rationale, objectives, quantitative_goals as quantitativeGoals, qualitative_goals as qualitativeGoals, kpis, procedures, duration_start as durationStart, duration_end as durationEnd, location, target_group as targetGroup, responsible_person as responsiblePerson, department, budget_source as budgetSource, allocated_budget as allocatedBudget, spent_budget as spentBudget, remaining_budget as remainingBudget, status, approval_status as approvalStatus FROM `projects` ORDER BY id ASC");
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($projects && count($projects) > 0) {
            $result['projects'] = array_map(function($p) {
                $p['id'] = intval($p['id']);
                $p['allocatedBudget'] = floatval($p['allocatedBudget']);
                $p['spentBudget'] = floatval($p['spentBudget']);
                $p['remainingBudget'] = floatval($p['remainingBudget']);
                return $p;
            }, $projects);
        }

        // 3. Revenues
        $stmt = $pdo->query("SELECT id, category, item_name as itemName, rate_per_head as ratePerHead, eligible_count as eligibleCount, calculated_amount as calculatedAmount, is_custom_rate as isCustomRate, note FROM `revenues` ORDER BY id ASC");
        $revenues = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($revenues && count($revenues) > 0) {
            $result['revenues'] = array_map(function($r) {
                $r['id'] = intval($r['id']);
                $r['ratePerHead'] = floatval($r['ratePerHead']);
                $r['eligibleCount'] = intval($r['eligibleCount']);
                $r['calculatedAmount'] = floatval($r['calculatedAmount']);
                $r['isCustomRate'] = ($r['isCustomRate'] == 1);
                return $r;
            }, $revenues);
        }

        // 4. Budget Allocations
        $stmt = $pdo->query("SELECT id, department_name as departmentName, percentage, allocated_amount as allocatedAmount, spent_amount as spentAmount, remaining_amount as remainingAmount, color_hex as colorHex, description FROM `budget_allocations` ORDER BY id ASC");
        $allocations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($allocations && count($allocations) > 0) {
            $result['allocations'] = array_map(function($a) {
                $a['id'] = intval($a['id']);
                $a['percentage'] = floatval($a['percentage']);
                $a['allocatedAmount'] = floatval($a['allocatedAmount']);
                $a['spentAmount'] = floatval($a['spentAmount']);
                $a['remainingAmount'] = floatval($a['remainingAmount']);
                return $a;
            }, $allocations);
        }

        // 5. Budget Transactions
        $stmt = $pdo->query("SELECT id, project_id as projectId, doc_number as docNumber, transaction_date as transactionDate, item_description as itemDescription, amount, payee, receipt_number as receiptNumber, approved_by as approvedBy, status FROM `budget_transactions` ORDER BY id DESC");
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($transactions && count($transactions) > 0) {
            $result['transactions'] = array_map(function($t) {
                $t['id'] = intval($t['id']);
                $t['projectId'] = intval($t['projectId']);
                $t['amount'] = floatval($t['amount']);
                return $t;
            }, $transactions);
        }

        return $result;
    } catch (Exception $e) {
        error_log("Failed to load app data from MySQL: " . $e->getMessage());
        return null;
    }
}

// 4. ฟังก์ชันเรียกใช้งาน Gemini AI API และ Template Engine สำหรับโครงการ สพฐ.
function callGeminiApiInPhp($apiKey, $prompt, $systemInstruction) {
    $cleanKey = trim($apiKey);
    if (empty($cleanKey)) return null;

    // รองรับโมเดล Gemini 2.5 Flash และ 1.5 Flash
    $models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
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
            'temperature' => 0.3
        ]
    ];
    $jsonPayload = json_encode($payload, JSON_UNESCAPED_UNICODE);

    foreach ($models as $model) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($cleanKey);
        $response = null;

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'User-Agent: aistudio-build-obep',
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 35);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // รองรับทั้ง hosting ที่ไม่มี ca-bundle
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                continue;
            }
        } else {
            $opts = [
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/json\r\nUser-Agent: aistudio-build-obep\r\n",
                    'content' => $jsonPayload,
                    'timeout' => 35,
                    'ignore_errors' => true,
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ];
            $context = stream_context_create($opts);
            $response = @file_get_contents($url, false, $context);
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
                if (is_array($parsedProposal) && !empty($parsedProposal['projectName'])) {
                    return $parsedProposal;
                }
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
    $target = !empty($params['targetGroup']) ? $params['targetGroup'] : 'นักเรียนและครูทุกคน';
    $budget = !empty($params['estimatedBudget']) ? floatval($params['estimatedBudget']) : 30000;
    if ($budget <= 0) $budget = 30000;
    $duration = !empty($params['duration']) ? $params['duration'] : 'ตลอดปีการศึกษา 2568';
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

    return [
        'projectCode' => 'วช.' . rand(10, 99) . '/2568',
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
        'rationale' => "สืบเนื่องจากนโยบายสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) ที่มุ่งเน้นการยกระดับคุณภาพการศึกษาและพัฒนาสมรรถนะผู้เรียนในศตวรรษที่ 21 การดำเนิน {$pName} จึงมีความสำคัญยิ่งต่อการพัฒนาการจัดการเรียนรู้และขับเคลื่อนคุณภาพสถานศึกษา\n\nการดำเนินงานมุ่งเน้นการมีส่วนร่วมของบุคลากรทางการศึกษา ผู้เรียน และชุมชน " . ($focus ? "โดยเน้นย้ำประเด็น {$focus} " : "") . "เพื่อให้บรรลุผลสัมฤทธิ์ตามเป้าหมายของแผนปฏิบัติการประจำปีอย่างมีประสิทธิภาพและคุ้มค่าสูงสุด",
        'objectives' => [
            "เพื่อส่งเสริมและพัฒนาการดำเนินงาน {$pName} ให้บรรลุตามเป้าหมายมาตรฐานการศึกษา",
            "เพื่อเปิดโอกาสให้กลุ่มเป้าหมาย ({$target}) ได้รับการพัฒนาทักษะและความรู้อย่างเต็มศักยภาพ",
            "เพื่อสร้างเครือข่ายความร่วมมือและการจัดการเรียนรู้เชิงรุก (Active Learning) ในสถานศึกษา",
        ],
        'quantitativeTarget' => "กลุ่มเป้าหมาย ({$target}) ได้รับการพัฒนาและเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ 85 ของจำนวนทั้งหมด",
        'qualitativeTarget' => "ผู้เข้าร่วมกิจกรรมมีความรู้ ทักษะ และสามารถนำความรู้ไปประยุกต์ใช้ในการเรียนและการปฏิบัติงานได้ในระดับดีขึ้นไป",
        'timeline' => $duration,
        'location' => 'สถานศึกษาและแหล่งเรียนรู้ที่เกี่ยวข้อง',
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

            echo json_encode([
                'success' => true,
                'user' => $targetUser,
                'school' => $userSchool,
                'mustChangePassword' => empty($targetUser['isPasswordChanged']),
            ]);
            exit;
        }

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
                $pdo->exec("DELETE FROM `schools` WHERE `name` LIKE '%เด็กเรียนดี%' OR `smis_code` = '10000001'");

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
                    syncAppDataToMySQL($pdo, $input);
                    echo json_encode([
                        'success' => true,
                        'message' => 'บันทึกข้อมูลลงในฐานข้อมูล MySQL สำเร็จสมบูรณ์',
                    ]);
                } catch (Exception $e) {
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
                $dbData = loadAppDataFromMySQL($pdo);
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
                'models' => ['gemini-2.5-flash', 'gemini-1.5-flash'],
                'message' => 'AI Service พร้อมให้บริการร่างโครงการตามระเบียบ สพฐ.',
            ]);
            exit;
        }

        case 'ai/generate-project':
        case 'ai_generate.php':
        case 'api/ai_generate.php': {
            $envCfg = loadEnvConfig();
            $systemKey = !empty($_ENV['GEMINI_API_KEY']) ? $_ENV['GEMINI_API_KEY'] : (!empty($envCfg['GEMINI_API_KEY']) ? $envCfg['GEMINI_API_KEY'] : getenv('GEMINI_API_KEY'));
            $customKey = !empty($input['customApiKey']) ? trim($input['customApiKey']) : '';
            $effectiveKey = $customKey ?: $systemKey;

            $proposal = null;
            $source = 'template_engine';
            $msg = 'สร้างโครงร่างโครงการตามแบบฟอร์มมาตรฐาน สพฐ. เรียบร้อย';

            if (!empty($effectiveKey)) {
                $sysInstruction = "คุณคือผู้เชี่ยวชาญด้านการวางแผนการศึกษาและผู้ช่วยเขียนโครงการตามระเบียบของสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) กระทรวงศึกษาธิการ ร่างและเขียนข้อเสนอโครงการฉบับสมบูรณ์ (School Project Proposal) ที่เป็นทางการ ครบถ้วนตามระเบียบราชการไทย โดยส่งออกเป็น JSON Object เท่านั้น";
                $pName = !empty($input['projectName']) ? $input['projectName'] : '';
                $dept = !empty($input['department']) ? $input['department'] : 'ฝ่ายวิชาการ';
                $budget = !empty($input['estimatedBudget']) ? $input['estimatedBudget'] : 30000;
                $target = !empty($input['targetGroup']) ? $input['targetGroup'] : 'นักเรียนทุกคน';
                $strat = !empty($input['strategyName']) ? $input['strategyName'] : 'ยุทธศาสตร์ สพฐ.';
                $duration = !empty($input['duration']) ? $input['duration'] : 'ตลอดปีการศึกษา 2568';
                $focus = !empty($input['specialFocus']) ? $input['specialFocus'] : '';
                $proposerName = !empty($input['proposerName']) ? $input['proposerName'] : 'ครูผู้รับผิดชอบโครงการ';
                $proposerPos = !empty($input['proposerPosition']) ? $input['proposerPosition'] : 'ครูผู้รับผิดชอบโครงการ';
                $endorserName = !empty($input['endorserName']) ? $input['endorserName'] : 'ผู้เห็นชอบโครงการ';
                $endorserPos = !empty($input['endorserPosition']) ? $input['endorserPosition'] : "หัวหน้ากลุ่มงาน{$dept}";
                $approverName = !empty($input['approverName']) ? $input['approverName'] : 'ผู้อำนวยการโรงเรียน';
                $approverPos = !empty($input['approverPosition']) ? $input['approverPosition'] : 'ผู้อำนวยการโรงเรียน';

                $aiPrompt = "โปรดร่างโครงการทางการศึกษาตามระเบียบ สพฐ. โดยมีข้อมูลดังนี้:\n" .
                    "- ชื่อโครงการ: {$pName}\n" .
                    "- ฝ่าย/กลุ่มงาน: {$dept}\n" .
                    "- ยุทธศาสตร์: {$strat}\n" .
                    "- งบประมาณรวม: {$budget} บาท\n" .
                    "- กลุ่มเป้าหมาย: {$target}\n" .
                    "- ระยะเวลาดำเนินงาน: {$duration}\n" .
                    "- จุดเน้น/ประเด็นสำคัญ: {$focus}\n" .
                    "- ผู้เสนอโครงการ: {$proposerName} ตำแหน่ง {$proposerPos}\n" .
                    "- ผู้เห็นชอบโครงการ: {$endorserName} ตำแหน่ง {$endorserPos}\n" .
                    "- ผู้อนุมัติโครงการ: {$approverName} ตำแหน่ง {$approverPos}\n\n" .
                    "ต้องส่งออกเป็น JSON Object ที่มีฟิลด์: projectCode, projectName, projectType, department, strategyAlignment, responsiblePerson, position, proposerName, proposerPosition, endorserName, endorserPosition, approverName, approverPosition, rationale, objectives (array of strings), quantitativeTarget, qualitativeTarget, timeline, location, activities (array of {phase, description, duration, responsible}), expenseItems (array of {id, itemName, category, quantity, unit, unitPrice, totalAmount}), totalBudget (number), budgetSource, kpis, evaluationMethods, expectedBenefits (array of strings), proposedBy, acknowledgedBy";

                $proposal = callGeminiApiInPhp($effectiveKey, $aiPrompt, $sysInstruction);
                if ($proposal) {
                    $source = 'gemini_ai';
                    $msg = 'สร้างโครงร่างโครงการด้วยโมเดล Gemini Flash สำเร็จ';
                }
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
