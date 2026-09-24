<?php
$pageTitle = 'จัดการข้อมูลโรงเรียน';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);

$schools = [];
$errorMsg = '';
$successMsg = $_GET['msg'] ?? '';

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM `schools` ORDER BY `id` ASC");
        $schools = $stmt->fetchAll();
    } catch (Exception $e) {
        $errorMsg = 'ไม่สามารถดึงข้อมูลโรงเรียนจาก MySQL ได้: ' . $e->getMessage();
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">จัดการข้อมูลโรงเรียนในระบบ (MySQL)</h1>
            <p class="text-sm text-slate-500 mt-1">ข้อมูลทั้งหมดถูกบันทึกลงในตาราง <code>schools</code> ของ MySQL โดยตรง</p>
        </div>
        <a href="/php_app/schools/create.php" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
            + เพิ่มโรงเรียนใหม่
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
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">สถานะ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">รหัส SMIS / สถานศึกษา</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ชื่อโรงเรียน</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ผู้อำนวยการ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">เขตพื้นที่ / จังหวัด</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">การจัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($schools)): ?>
                        <tr>
                            <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลโรงเรียนใน MySQL กรุณากดปุ่ม "+ เพิ่มโรงเรียนใหม่"
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($schools as $s): ?>
                            <?php $isCurrent = ($s['id'] == ($activeSchool['id'] ?? 0)); ?>
                            <tr class="<?= $isCurrent ? 'bg-indigo-50/50' : 'hover:bg-slate-50' ?>">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <?php if ($isCurrent): ?>
                                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                                            ใช้งานอยู่
                                        </span>
                                    <?php else: ?>
                                        <a href="/php_app/schools/switch.php?id=<?= $s['id'] ?>" class="text-xs font-medium text-slate-500 hover:text-indigo-600 underline">
                                            สลับใช้งาน
                                        </a>
                                    <?php endif; ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap font-mono text-slate-600">
                                    <?= htmlspecialchars($s['smis_code'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap font-semibold text-slate-800">
                                    <?= htmlspecialchars($s['name']) ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-slate-600">
                                    <?= htmlspecialchars($s['director_name'] ?: '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-slate-500">
                                    <?= htmlspecialchars($s['education_area'] ?: $s['province'] ?: '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                    <a href="/php_app/schools/edit.php?id=<?= $s['id'] ?>" class="text-indigo-600 hover:text-indigo-900 font-medium">แก้ไข</a>
                                    <a href="/php_app/schools/delete.php?id=<?= $s['id'] ?>" onclick="return confirm('ยืนยันที่จะลบโรงเรียนนี้ออกจาก MySQL หรือไม่?');" class="text-rose-600 hover:text-rose-900 font-medium">ลบ</a>
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
