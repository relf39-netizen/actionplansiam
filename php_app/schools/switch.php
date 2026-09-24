<?php
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

$id = intval($_GET['id'] ?? 0);
if ($id > 0 && $pdo) {
    $stmt = $pdo->prepare("SELECT `id`, `name` FROM `schools` WHERE `id` = ?");
    $stmt->execute([$id]);
    $school = $stmt->fetch();
    if ($school) {
        $_SESSION['active_school_id'] = $school['id'];
        header("Location: /php_app/index.php");
        exit;
    }
}

header("Location: /php_app/schools/index.php");
exit;
