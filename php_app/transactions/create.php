<?php
$pageTitle = 'บันทึกการเบิกจ่ายงบประมาณ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$projectId = intval($_GET['project_id'] ?? 0);
$projects = [];

if ($pdo) {
    try {
        $stmtP = $pdo->prepare("SELECT id, project_code, project_name, remaining_budget FROM `projects` WHERE `school_id` = ? ORDER BY `id` ASC");
        $stmtP->execute([$schoolId]);
        $projects = $stmtP->fetchAll();
    } catch (Exception $e) {}
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $selProjectId = intval($_POST['project_id'] ?? 0);
    $itemDesc = trim($_POST['item_description'] ?? '');
    $docNumber = trim($_POST['doc_number'] ?? ('EXP-' . date('Ymd') . '-' . rand(10, 99)));
    $receiptNumber = trim($_POST['receipt_number'] ?? '');
    $transDate = trim($_POST['transaction_date'] ?? date('Y-m-d'));
    $amount = floatval($_POST['amount'] ?? 0);
    $payee = trim($_POST['payee'] ?? '');
    $approvedBy = trim($_POST['approved_by'] ?? ($activeSchool['director_name'] ?: 'ผู้อำนวยการโรงเรียน'));

    if (empty($itemDesc)) {
        $error = 'กรุณาระบุรายการ / วัตถุประสงค์การเบิกจ่าย';
    } elseif ($amount <= 0) {
        $error = 'จำนวนเงินต้องมากกว่า 0 บาท';
    } elseif (!$pdo) {
        $error = 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้';
    } else {
        try {
            // 1. บันทึกลงตาราง budget_transactions
            $stmt = $pdo->prepare("INSERT INTO `budget_transactions` 
                (`school_id`, `project_id`, `doc_number`, `transaction_date`, `item_description`, `amount`, `payee`, `receipt_number`, `approved_by`, `status`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')");
            $stmt->execute([
                $schoolId,
                $selProjectId,
                $docNumber,
                $transDate,
                $itemDesc,
                $amount,
                $payee,
                $receiptNumber,
                $approvedBy,
            ]);

            // 2. อัปเดตยอดใช้จ่ายและยอดคงเหลือในตาราง projects
            if ($selProjectId > 0) {
                $stmtUp = $pdo->prepare("UPDATE `projects` SET 
                    `spent_budget` = `spent_budget` + ?, 
                    `remaining_budget` = `allocated_budget` - `spent_budget`,
                    `status` = 'in_progress',
                    `updated_at` = CURRENT_TIMESTAMP
                    WHERE `id` = ?");
                $stmtUp->execute([$amount, $selProjectId]);
            }

            header("Location: /php_app/transactions/index.php?msg=" . urlencode("บันทึกการเบิกจ่าย ฿" . number_format($amount, 2) . " และตัดยอดโครงการใน MySQL สำเร็จ"));
            exit;
        } catch (Exception $e) {
            $error = 'เกิดข้อผิดพลาดในการบันทึก: ' . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <div class="mb-6">
        <h1 class="text-xl font-bold text-slate-800">บันทึกการเบิกจ่ายงบประมาณ (ตัดยอด MySQL)</h1>
        <p class="text-xs text-slate-500 mt-1">
            โรงเรียน: <?= htmlspecialchars($activeSchool['name']) ?> • ระบบจะตัดยอดงบคงเหลือในตาราง <code>projects</code> อัตโนมัติ
        </p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4">
        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">โครงการที่ต้องการตัดยอดงบประมาณ *</label>
            <select name="project_id" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="0">-- รายจ่ายงบประมาณทั่วไป (ไม่ผูกโครงการ) --</option>
                <?php foreach ($projects as $p): ?>
                    <option value="<?= $p['id'] ?>" <?= ($projectId === $p['id']) ? 'selected' : '' ?>>
                        [<?= htmlspecialchars($p['project_code']) ?>] <?= htmlspecialchars($p['project_name']) ?> (คงเหลือ ฿<?= number_format($p['remaining_budget'], 2) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">รายการ / รายละเอียดการเบิกจ่าย *</label>
            <input type="text" name="item_description" required placeholder="เช่น ค่าวัสดุอุปกรณ์การจัดกิจกรรม, ค่าอาหารกลางวันวิทยากร" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">จำนวนเงินที่เบิกจ่าย (บาท) *</label>
                <input type="number" step="0.01" min="0.01" name="amount" required placeholder="เช่น 3500.00" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">วันที่ทำรายการ</label>
                <input type="date" name="transaction_date" value="<?= date('Y-m-d') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เลขที่ฎีกา / ใบขอเบิก</label>
                <input type="text" name="doc_number" placeholder="เช่น EXP-68-001" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เลขที่ใบเสร็จรับเงิน / ใบกำกับภาษี</label>
                <input type="text" name="receipt_number" placeholder="เช่น REC-2025/112" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ผู้รับเงิน / ร้านค้า / บริษัท</label>
                <input type="text" name="payee" placeholder="เช่น ร้านศึกษาภัณฑ์, นายมานะ สมบูรณ์" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ผู้อนุมัติ</label>
                <input type="text" name="approved_by" value="<?= htmlspecialchars($activeSchool['director_name'] ?: 'ผู้อำนวยการโรงเรียน') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <a href="/php_app/transactions/index.php" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">ยกเลิก</a>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                บันทึกการเบิกจ่ายลง MySQL
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
