<?php
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

$id = intval($_GET['id'] ?? 0);
if ($id > 0 && $pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM `schools` WHERE `id` = ?");
        $stmt->execute([$id]);

        // ถ้าลบโรงเรียนที่ active อยู่ ให้เคลียร์ session
        if (($_SESSION['active_school_id'] ?? 0) === $id) {
            unset($_SESSION['active_school_id']);
        }

        header("Location: /php_app/schools/index.php?msg=" . urlencode("ลบโรงเรียนออกจาก MySQL เรียบร้อยแล้ว"));
        exit;
    } catch (Exception $e) {
        header("Location: /php_app/schools/index.php?msg=" . urlencode("ไม่สามารถลบโรงเรียนได้: " . $e->getMessage()));
        exit;
    }
}

header("Location: /php_app/schools/index.php");
exit;
