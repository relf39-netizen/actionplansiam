<?php
$pageTitle = 'การเบิกจ่ายงบประมาณ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$transactions = [];
$totalSpent = 0.00;
$msg = $_GET['msg'] ?? '';

if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT t.*, p.project_name, p.project_code 
            FROM `budget_transactions` t 
            LEFT JOIN `projects` p ON t.project_id = p.id 
            WHERE t.school_id = ? 
            ORDER BY t.id DESC");
        $stmt->execute([$schoolId]);
        $transactions = $stmt->fetchAll();

        foreach ($transactions as $t) {
            $totalSpent += floatval($t['amount'] ?? 0);
        }
    } catch (Exception $e) {}
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">บันทึกและประวัติการเบิกจ่ายงบประมาณ (MySQL)</h1>
            <p class="text-sm text-slate-500 mt-1">
                โรงเรียน: <?= htmlspecialchars($activeSchool['name']) ?> • บันทึกลงตาราง <code>budget_transactions</code>
            </p>
        </div>
        <div class="flex items-center space-x-3">
            <div class="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
                <span class="text-xs text-emerald-600 uppercase font-semibold">ยอดเบิกจ่ายสะสม</span>
                <div class="text-lg font-bold text-emerald-800">฿<?= number_format($totalSpent, 2) ?></div>
            </div>
            <a href="/php_app/transactions/create.php" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                + บันทึกการเบิกจ่าย
            </a>
        </div>
    </div>

    <?php if ($msg): ?>
        <div class="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <?= htmlspecialchars($msg) ?>
        </div>
    <?php endif; ?>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">วันที่เบิกจ่าย</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">เลขที่ฎีกา / ใบเสร็จ</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">รายการ / วัตถุประสงค์</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">โครงการที่ตัดยอด</th>
                        <th class="px-6 py-3 text-left font-semibold text-slate-600">ผู้รับเงิน / ร้านค้า</th>
                        <th class="px-6 py-3 text-right font-semibold text-slate-600">จำนวนเงิน</th>
                        <th class="px-6 py-3 text-center font-semibold text-slate-600">สถานะ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($transactions)): ?>
                        <tr>
                            <td colspan="7" class="px-6 py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลการเบิกจ่ายในตาราง budget_transactions (MySQL)
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($transactions as $t): ?>
                            <tr class="hover:bg-slate-50">
                                <td class="px-6 py-4 whitespace-nowrap text-slate-600">
                                    <?= htmlspecialchars($t['transaction_date'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                                    <?= htmlspecialchars($t['doc_number'] ?? '-') ?>
                                    <?php if (!empty($t['receipt_number'])): ?>
                                        <div class="text-[11px] text-slate-400">ใบเสร็จ: <?= htmlspecialchars($t['receipt_number']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td class="px-6 py-4 font-semibold text-slate-800">
                                    <?= htmlspecialchars($t['item_description']) ?>
                                </td>
                                <td class="px-6 py-4 text-slate-600">
                                    <?= htmlspecialchars($t['project_name'] ?: 'โครงการทั่วไป') ?>
                                </td>
                                <td class="px-6 py-4 text-slate-600">
                                    <?= htmlspecialchars($t['payee'] ?? '-') ?>
                                </td>
                                <td class="px-6 py-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                                    ฿<?= number_format($t['amount'] ?? 0, 2) ?>
                                </td>
                                <td class="px-6 py-4 text-center whitespace-nowrap">
                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                        <?= htmlspecialchars($t['status'] ?? 'approved') ?>
                                    </span>
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
