<?php
/**
 * การเชื่อมต่อฐานข้อมูล MySQL ด้วย PDO
 * School Action Plan & Budget Allocation System (OBEC Standard)
 */
session_start();

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = '127.0.0.1';
    $port = 3306;
    $db   = 'school_action_plan_db';
    $user = 'root';
    $pass = '';

    // ตรวจสอบการตั้งค่าจากไฟล์ db_config.json ถ้ามี
    $configFile = __DIR__ . '/db_config.json';
    if (!file_exists($configFile)) {
        // ตรวจสอบที่โฟลเดอร์หลัก
        $configFile = dirname(__DIR__, 2) . '/config/db_config.json';
    }

    if (file_exists($configFile)) {
        $cfg = json_decode(file_get_contents($configFile), true);
        if ($cfg) {
            $host = $cfg['host'] ?? $host;
            $port = $cfg['port'] ?? $port;
            $db   = $cfg['database'] ?? $db;
            $user = $cfg['username'] ?? $user;
            $pass = $cfg['password'] ?? $pass;
        }
    }

    // หรืออ่านจาก Environment Variables
    if (!empty($_ENV['DB_HOST'])) $host = $_ENV['DB_HOST'];
    if (!empty($_ENV['DB_NAME'])) $db = $_ENV['DB_NAME'];
    if (!empty($_ENV['DB_USER'])) $user = $_ENV['DB_USER'];
    if (isset($_ENV['DB_PASS'])) $pass = $_ENV['DB_PASS'];

    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        // ส่งคืน null เพื่อให้หน้าเว็บแจ้งเตือนสถานะฐานข้อมูล
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
}

// ฟังก์ชันดึงโรงเรียนที่กำลังใช้งาน (Active School)
function getActiveSchool($pdo) {
    if (!$pdo) {
        return [
            'id' => 1,
            'name' => 'โรงเรียนของคุณ (ยังไม่ได้ตั้งชื่อ)',
            'director_name' => '',
            'province' => '',
            'education_area' => '',
        ];
    }

    $activeId = $_SESSION['active_school_id'] ?? null;
    if ($activeId) {
        $stmt = $pdo->prepare("SELECT * FROM `schools` WHERE `id` = ? LIMIT 1");
        $stmt->execute([$activeId]);
        $school = $stmt->fetch();
        if ($school) return $school;
    }

    // ดึงโรงเรียนแรกที่เปิดใช้งาน
    try {
        $stmt = $pdo->query("SELECT * FROM `schools` WHERE `is_active` = 1 ORDER BY `id` ASC LIMIT 1");
        $school = $stmt->fetch();
        if ($school) {
            $_SESSION['active_school_id'] = $school['id'];
            return $school;
        }
    } catch (Exception $e) {}

    return [
        'id' => 1,
        'name' => 'โรงเรียนของคุณ (กรุณาเพิ่มโรงเรียน)',
        'director_name' => '',
        'province' => '',
        'education_area' => '',
    ];
}
