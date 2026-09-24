<?php
// includes/header.php
if (!defined('APP_INIT')) {
    require_once __DIR__ . '/../config/db.php';
    define('APP_INIT', true);
}
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'ระบบแผนปฏิบัติการและงบประมาณโรงเรียน') ?> - สพฐ.</title>
    <!-- Tailwind CSS ผ่าน CDN สำหรับรันบน Hosting ได้ทันทีโดยไม่ต้องใช้ Node.js/Vite -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', sans-serif; }
        @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

    <!-- แถบด้านบนสุด (Top Navigation) -->
    <header class="bg-indigo-900 text-white shadow-md no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- โลโก้และชื่อระบบ -->
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-indigo-700 flex items-center justify-center font-bold text-xl text-yellow-300">
                        สพฐ
                    </div>
                    <div>
                        <a href="/php_app/index.php" class="font-bold text-lg hover:text-yellow-200 transition">
                            ระบบแผนปฏิบัติการและจัดสรรงบประมาณ
                        </a>
                        <div class="text-xs text-indigo-200">
                            <?= htmlspecialchars($activeSchool['name'] ?? 'โรงเรียนของท่าน') ?> 
                            <?php if (!empty($activeSchool['education_area'])): ?>
                                • <?= htmlspecialchars($activeSchool['education_area']) ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- เมนูนำทางหลัก -->
                <nav class="hidden md:flex space-x-1">
                    <a href="/php_app/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        หน้าหลัก
                    </a>
                    <a href="/php_app/schools/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        จัดการโรงเรียน
                    </a>
                    <a href="/php_app/budget/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        งบประมาณ
                    </a>
                    <a href="/php_app/projects/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        โครงการ
                    </a>
                    <a href="/php_app/transactions/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        การเบิกจ่าย
                    </a>
                    <a href="/php_app/reports/index.php" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition">
                        รายงานแผน
                    </a>
                </nav>

                <!-- สถานะฐานข้อมูล MySQL -->
                <div class="flex items-center space-x-2">
                    <?php if ($pdo): ?>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <span class="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full"></span>
                            MySQL Connected
                        </span>
                    <?php else: ?>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            <span class="w-1.5 h-1.5 mr-1.5 bg-rose-500 rounded-full"></span>
                            MySQL Offline
                        </span>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </header>

    <!-- แจ้งเตือนหากฐานข้อมูลต่อไม่ได้ -->
    <?php if (!$pdo): ?>
        <div class="bg-amber-500 text-white px-4 py-2 text-center text-sm no-print">
            ⚠️ ยังไม่ได้เชื่อมต่อ MySQL กรุณาตรวจสอบการตั้งค่าฐานข้อมูลในไฟล์ <code>config/db_config.json</code>
        </div>
    <?php endif; ?>

    <!-- เนื้อหาหลัก -->
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
