<?php
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

$id = intval($_GET['id'] ?? 0);
if ($id > 0 && $pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM `projects` WHERE `id` = ?");
        $stmt->execute([$id]);
        header("Location: /php_app/projects/index.php?msg=" . urlencode("ลบโครงการออกจาก MySQL เรียบร้อยแล้ว"));
        exit;
    } catch (Exception $e) {
        header("Location: /php_app/projects/index.php?msg=" . urlencode("ไม่สามารถลบโครงการได้: " . $e->getMessage()));
        exit;
    }
}

header("Location: /php_app/projects/index.php");
exit;
