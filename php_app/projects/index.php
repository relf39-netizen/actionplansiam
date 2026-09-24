<?php
$pageTitle = 'โครงการตามแผนปฏิบัติการ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$projects = [];
$errorMsg = '';
$successMsg = $_GET['msg'] ?? '';

if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM `projects` WHERE `school_id` = ? ORDER BY `id` DESC");
        $stmt->execute([$schoolId]);
        $projects = $stmt->fetchAll();
    } catch (Exception $e) {
        $errorMsg = 'ไม่สามารถดึงข้อมูลโครงการจาก MySQL ได้: ' . $e->getMessage();
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">โครงการตามแผนปฏิบัติการประจำปี (MySQL)</h1>
            <p class="text-sm text-slate-500 mt-1">
                โรงเรียน: <?= htmlspecialchars($activeSchool['name']) ?> • ข้อมูลบันทึกลงตาราง <code>projects</code> ใน MySQL
            </p>
        </div>
        <a href="/php_app/projects/create.php" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
            + เสนอ/เพิ่มโครงการใหม่
        </a>
    </div>

    <?php if ($successMsg): ?>
        <div class="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <?= htmlspecialchars($successMsg) ?>
        </div>
    <?php endif; ?>

    <?php if ($errorMsg): ?>
        <div class="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($errorMsg) ?>
        </div>
    <?php endif; ?>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">รหัสโครงการ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ชื่อโครงการ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ฝ่าย/กลุ่มงาน</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ผู้รับผิดชอบ</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">งบจัดสรร</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">เบิกจ่ายแล้ว</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">งบคงเหลือ</th>
                        <th class="px-6 py-3 text-center font-semibold text-slate-600">สถานะ</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">การจัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($projects)): ?>
                        <tr>
                            <td colspan="9" class="px-6 py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลโครงการใน MySQL กรุณากดปุ่ม "+ เสนอ/เพิ่มโครงการใหม่"
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($projects as $p): ?>
                            <tr class="hover:bg-slate-50">
                                <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                                    <?= htmlspecialchars($p['project_code'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap font-semibold text-slate-800">
                                    <a href="/php_app/projects/view.php?id=<?= $p['id'] ?>" class="hover:text-indigo-600">
                                        <?= htmlspecialchars($p['project_name']) ?>
                                    </a>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-slate-600">
                                    <?= htmlspecialchars($p['department'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-slate-600">
                                    <?= htmlspecialchars($p['responsible_person'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-800">
                                    ฿<?= number_format($p['allocated_budget'] ?? 0, 2) ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right font-medium text-emerald-600">
                                    ฿<?= number_format($p['spent_budget'] ?? 0, 2) ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right font-medium text-amber-600">
                                    ฿<?= number_format($p['remaining_budget'] ?? 0, 2) ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-center">
                                    <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                        <?= htmlspecialchars($p['status'] ?? 'รอดำเนินการ') ?>
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                    <a href="/php_app/projects/view.php?id=<?= $p['id'] ?>" class="text-slate-600 hover:text-slate-900 font-medium">ดู</a>
                                    <a href="/php_app/projects/edit.php?id=<?= $p['id'] ?>" class="text-indigo-600 hover:text-indigo-900 font-medium">แก้ไข</a>
                                    <a href="/php_app/projects/delete.php?id=<?= $p['id'] ?>" onclick="return confirm('ยืนยันลบโครงการนี้ออกจาก MySQL?');" class="text-rose-600 hover:text-rose-900 font-medium">ลบ</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
