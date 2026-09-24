<?php
$pageTitle = 'ประมาณการรายรับและจัดสรรงบประมาณ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$msg = '';
$error = '';

// บันทึกรายการรายรับใหม่
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_revenue') {
    $itemName = trim($_POST['item_name'] ?? '');
    $category = trim($_POST['category'] ?? 'subsidy');
    $ratePerHead = floatval($_POST['rate_per_head'] ?? 0);
    $eligibleCount = intval($_POST['eligible_count'] ?? 0);
    $calculatedAmount = floatval($_POST['calculated_amount'] ?? ($ratePerHead * $eligibleCount));
    $note = trim($_POST['note'] ?? '');

    if (!empty($itemName) && $pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `revenues` (`school_id`, `fiscal_year_id`, `category`, `item_name`, `rate_per_head`, `eligible_count`, `calculated_amount`, `note`) VALUES (?, 1, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$schoolId, $category, $itemName, $ratePerHead, $eligibleCount, $calculatedAmount, $note]);
            $msg = 'บันทึกรายการรายรับลง MySQL เรียบร้อยแล้ว';
        } catch (Exception $e) {
            $error = 'เกิดข้อผิดพลาด: ' . $e->getMessage();
        }
    }
}

// ดึงรายการรายรับทั้งหมด
$revenues = [];
$totalRevenue = 0.00;
if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM `revenues` WHERE `school_id` = ? ORDER BY `id` ASC");
        $stmt->execute([$schoolId]);
        $revenues = $stmt->fetchAll();
        foreach ($revenues as $r) {
            $totalRevenue += floatval($r['calculated_amount'] ?? 0);
        }
    } catch (Exception $e) {}
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">ประมาณการรายรับสถานศึกษา (MySQL)</h1>
            <p class="text-sm text-slate-500 mt-1">
                โรงเรียน: <?= htmlspecialchars($activeSchool['name']) ?> • บันทึกลงตาราง <code>revenues</code> ใน MySQL
            </p>
        </div>
        <div class="bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-xl text-right">
            <span class="text-xs text-indigo-600 uppercase font-semibold">ยอดประมาณการรายรับรวม</span>
            <div class="text-xl font-bold text-indigo-900">฿<?= number_format($totalRevenue, 2) ?></div>
        </div>
    </div>

    <?php if ($msg): ?>
        <div class="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <?= htmlspecialchars($msg) ?>
        </div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <!-- ฟอร์มเพิ่มรายการรายรับ -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 class="font-bold text-slate-800 mb-4 text-base">+ เพิ่มรายการประมาณการรายรับ</h2>
        <form method="POST" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <input type="hidden" name="action" value="add_revenue">
            <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อรายการรายรับ *</label>
                <input type="text" name="item_name" required placeholder="เช่น เงินอุดหนุนรายหัวนักเรียนระดับประถมศึกษา" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">หมวดหมู่</label>
                <select name="category" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="subsidy">เงินอุดหนุนรายหัว</option>
                    <option value="activity">กิจกรรมพัฒนาผู้เรียน</option>
                    <option value="welfare">โครงการเรียนฟรี 15 ปี</option>
                    <option value="revenue">เงินรายได้สถานศึกษา</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">อัตราต่อคน (บาท)</label>
                <input type="number" step="0.01" name="rate_per_head" placeholder="เช่น 2050" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">จำนวนผู้มีสิทธิ์ (คน)</label>
                <input type="number" name="eligible_count" placeholder="เช่น 150" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">จำนวนเงินรวม (บาท) *</label>
                <input type="number" step="0.01" name="calculated_amount" required placeholder="เช่น 307500" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500">
            </div>
            <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">หมายเหตุ / เกณฑ์ สพฐ.</label>
                <input type="text" name="note" placeholder="เช่น ภาคเรียนที่ 1/2568" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div class="sm:col-span-4 flex justify-end">
                <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition">
                    + บันทึกลงตาราง revenues (MySQL)
                </button>
            </div>
        </form>
    </div>

    <!-- ตารางรายรับ -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">รายการรายรับ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">หมวดหมู่</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">อัตราต่อคน</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">จำนวนคน</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">จำนวนเงินรวม</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($revenues)): ?>
                        <tr>
                            <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลรายรับในตาราง revenues (MySQL)
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($revenues as $r): ?>
                            <tr class="hover:bg-slate-50">
                                <td class="px-6 py-4 font-semibold text-slate-800">
                                    <?= htmlspecialchars($r['item_name']) ?>
                                </td>
                                <td class="px-6 py-4 text-slate-500">
                                    <span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                        <?= htmlspecialchars($r['category'] ?? 'ทั่วไป') ?>
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right text-slate-600">
                                    <?= $r['rate_per_head'] > 0 ? '฿' . number_format($r['rate_per_head'], 2) : '-' ?>
                                </td>
                                <td class="px-6 py-4 text-right text-slate-600">
                                    <?= $r['eligible_count'] > 0 ? number_format($r['eligible_count']) : '-' ?>
                                </td>
                                <td class="px-6 py-4 text-right font-bold text-slate-900">
                                    ฿<?= number_format($r['calculated_amount'] ?? 0, 2) ?>
                                </td>
                                <td class="px-6 py-4 text-slate-400 text-xs">
                                    <?= htmlspecialchars($r['note'] ?? '-') ?>
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
