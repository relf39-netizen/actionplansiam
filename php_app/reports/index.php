<?php
$pageTitle = 'รายงานสรุปแผนปฏิบัติการประจำปี';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$projects = [];
$totalAllocated = 0.00;
$totalSpent = 0.00;
$totalRemaining = 0.00;

if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM `projects` WHERE `school_id` = ? ORDER BY `department` ASC, `id` ASC");
        $stmt->execute([$schoolId]);
        $projects = $stmt->fetchAll();

        foreach ($projects as $p) {
            $totalAllocated += floatval($p['allocated_budget'] ?? 0);
            $totalSpent += floatval($p['spent_budget'] ?? 0);
            $totalRemaining += floatval($p['remaining_budget'] ?? 0);
        }
    } catch (Exception $e) {}
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <div class="flex justify-between items-center no-print">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">รายงานสรุปแผนปฏิบัติการประจำปี</h1>
            <p class="text-sm text-slate-500 mt-1">สามารถกดพิมพ์หรือบันทึกเป็น PDF เพื่อรายงาน สพฐ./เขตพื้นที่ฯ</p>
        </div>
        <button onclick="window.print();" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm transition">
            🖨️ พิมพ์รายงาน / บันทึก PDF
        </button>
    </div>

    <!-- เอกสารรายงานมาตรฐาน สพฐ. -->
    <div class="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-slate-200">
        <div class="text-center space-y-2 border-b-2 border-slate-900 pb-6 mb-8">
            <h2 class="text-xl font-bold text-slate-900">
                รายงานสรุปโครงการตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. 2568
            </h2>
            <h3 class="text-lg font-semibold text-slate-800">
                <?= htmlspecialchars($activeSchool['name']) ?>
            </h3>
            <p class="text-sm text-slate-600">
                สังกัด <?= htmlspecialchars($activeSchool['education_area'] ?: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน') ?>
            </p>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-300 border border-slate-300 text-sm">
                <thead class="bg-slate-100">
                    <tr>
                        <th class="px-3 py-2 border border-slate-300 text-center font-bold">ที่</th>
                        <th class="px-4 py-2 border border-slate-300 text-left font-bold">รหัส/ชื่อโครงการ</th>
                        <th class="px-4 py-2 border border-slate-300 text-left font-bold">กลุ่มงาน/ฝ่าย</th>
                        <th class="px-4 py-2 border border-slate-300 text-left font-bold">ผู้รับผิดชอบ</th>
                        <th class="px-4 py-2 border border-slate-300 text-right font-bold">งบจัดสรร (บาท)</th>
                        <th class="px-4 py-2 border border-slate-300 text-right font-bold">เบิกจ่าย (บาท)</th>
                        <th class="px-4 py-2 border border-slate-300 text-right font-bold">คงเหลือ (บาท)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                    <?php if (empty($projects)): ?>
                        <tr>
                            <td colspan="7" class="px-4 py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลโครงการในแผนปฏิบัติการ
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php $idx = 1; foreach ($projects as $p): ?>
                            <tr>
                                <td class="px-3 py-2 border border-slate-300 text-center"><?= $idx++ ?></td>
                                <td class="px-4 py-2 border border-slate-300">
                                    <div class="font-semibold text-slate-900"><?= htmlspecialchars($p['project_name']) ?></div>
                                    <div class="text-xs text-slate-500 font-mono"><?= htmlspecialchars($p['project_code'] ?? '') ?></div>
                                </td>
                                <td class="px-4 py-2 border border-slate-300 text-slate-700"><?= htmlspecialchars($p['department'] ?? '-') ?></td>
                                <td class="px-4 py-2 border border-slate-300 text-slate-700"><?= htmlspecialchars($p['responsible_person'] ?? '-') ?></td>
                                <td class="px-4 py-2 border border-slate-300 text-right font-mono"><?= number_format($p['allocated_budget'] ?? 0, 2) ?></td>
                                <td class="px-4 py-2 border border-slate-300 text-right font-mono text-emerald-700"><?= number_format($p['spent_budget'] ?? 0, 2) ?></td>
                                <td class="px-4 py-2 border border-slate-300 text-right font-mono text-amber-700"><?= number_format($p['remaining_budget'] ?? 0, 2) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
                <tfoot class="bg-slate-100 font-bold">
                    <tr>
                        <td colspan="4" class="px-4 py-3 border border-slate-300 text-center">รวมทั้งสิ้น</td>
                        <td class="px-4 py-3 border border-slate-300 text-right font-mono">฿<?= number_format($totalAllocated, 2) ?></td>
                        <td class="px-4 py-3 border border-slate-300 text-right font-mono text-emerald-700">฿<?= number_format($totalSpent, 2) ?></td>
                        <td class="px-4 py-3 border border-slate-300 text-right font-mono text-amber-700">฿<?= number_format($totalRemaining, 2) ?></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- ช่องลงนามท้ายรายงาน -->
        <div class="grid grid-cols-2 gap-8 mt-16 pt-8 text-center text-sm">
            <div>
                <p>ลงชื่อ......................................................</p>
                <p class="mt-2">(......................................................)</p>
                <p class="text-slate-500 mt-1">หัวหน้างานแผนงานและงบประมาณ</p>
            </div>
            <div>
                <p>ลงชื่อ......................................................</p>
                <p class="mt-2">( <?= htmlspecialchars($activeSchool['director_name'] ?: '......................................................') ?> )</p>
                <p class="text-slate-500 mt-1">ผู้อำนวยการ<?= htmlspecialchars($activeSchool['name']) ?></p>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
