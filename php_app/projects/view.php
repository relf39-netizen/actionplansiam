<?php
$pageTitle = 'รายละเอียดโครงการ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);

$id = intval($_GET['id'] ?? 0);
if ($id <= 0 || !$pdo) {
    header("Location: /php_app/projects/index.php");
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM `projects` WHERE `id` = ?");
$stmt->execute([$id]);
$project = $stmt->fetch();

if (!$project) {
    header("Location: /php_app/projects/index.php?msg=" . urlencode("ไม่พบโครงการ"));
    exit;
}

// ดึงรายการเบิกจ่ายของโครงการนี้
$transactions = [];
try {
    $stmtT = $pdo->prepare("SELECT * FROM `budget_transactions` WHERE `project_id` = ? ORDER BY `id` DESC");
    $stmtT->execute([$id]);
    $transactions = $stmtT->fetchAll();
} catch (Exception $e) {}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header รายละเอียด -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <span class="font-mono text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                    <?= htmlspecialchars($project['project_code'] ?? 'PROJ') ?>
                </span>
                <h1 class="text-2xl font-bold text-slate-800 mt-2">
                    <?= htmlspecialchars($project['project_name']) ?>
                </h1>
                <p class="text-sm text-slate-500 mt-1">
                    ฝ่าย: <?= htmlspecialchars($project['department'] ?? '-') ?> • 
                    ผู้รับผิดชอบ: <?= htmlspecialchars($project['responsible_person'] ?? '-') ?> • 
                    แหล่งงบ: <?= htmlspecialchars($project['budget_source'] ?? '-') ?>
                </p>
            </div>
            <div class="flex space-x-2">
                <a href="/php_app/projects/edit.php?id=<?= $project['id'] ?>" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition">
                    แก้ไขโครงการ
                </a>
                <a href="/php_app/transactions/create.php?project_id=<?= $project['id'] ?>" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                    + ขอเบิกงบโครงการนี้
                </a>
            </div>
        </div>

        <!-- ตัวเลขงบประมาณ 3 ช่อง -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div class="text-xs text-slate-500 uppercase">งบประมาณที่จัดสรร</div>
                <div class="text-xl font-bold text-slate-900 mt-1">฿<?= number_format($project['allocated_budget'] ?? 0, 2) ?></div>
            </div>
            <div class="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <div class="text-xs text-emerald-600 uppercase">เบิกจ่ายแล้ว</div>
                <div class="text-xl font-bold text-emerald-600 mt-1">฿<?= number_format($project['spent_budget'] ?? 0, 2) ?></div>
            </div>
            <div class="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <div class="text-xs text-amber-600 uppercase">คงเหลือ</div>
                <div class="text-xl font-bold text-amber-600 mt-1">฿<?= number_format($project['remaining_budget'] ?? 0, 2) ?></div>
            </div>
        </div>
    </div>

    <!-- รายละเอียดวัตถุประสงค์และเหตุผล -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
        <div>
            <h2 class="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">1. หลักการและเหตุผล</h2>
            <p class="text-sm text-slate-600 mt-3 whitespace-pre-line leading-relaxed">
                <?= htmlspecialchars($project['rationale'] ?: 'ไม่ได้ระบุ') ?>
            </p>
        </div>

        <div>
            <h2 class="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">2. วัตถุประสงค์</h2>
            <p class="text-sm text-slate-600 mt-3 whitespace-pre-line leading-relaxed">
                <?= htmlspecialchars($project['objectives'] ?: 'ไม่ได้ระบุ') ?>
            </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <h2 class="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">3. เป้าหมายเชิงปริมาณ</h2>
                <p class="text-sm text-slate-600 mt-3"><?= htmlspecialchars($project['quantitative_goals'] ?: 'ไม่ได้ระบุ') ?></p>
            </div>
            <div>
                <h2 class="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">4. เป้าหมายเชิงคุณภาพ</h2>
                <p class="text-sm text-slate-600 mt-3"><?= htmlspecialchars($project['qualitative_goals'] ?: 'ไม่ได้ระบุ') ?></p>
            </div>
        </div>
    </div>

    <!-- ประวัติการเบิกจ่ายงบประมาณของโครงการ -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 class="font-bold text-slate-800">ประวัติการเบิกจ่ายงบประมาณของโครงการนี้</h2>
            <a href="/php_app/transactions/create.php?project_id=<?= $project['id'] ?>" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                + บันทึกเบิกจ่าย
            </a>
        </div>
        <div class="p-6">
            <?php if (empty($transactions)): ?>
                <div class="text-center py-6 text-slate-400 text-sm">
                    ยังไม่มีรายการเบิกจ่ายงบประมาณในโครงการนี้
                </div>
            <?php else: ?>
                <div class="space-y-3">
                    <?php foreach ($transactions as $t): ?>
                        <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <div>
                                <div class="font-semibold text-slate-800 text-sm"><?= htmlspecialchars($t['item_description']) ?></div>
                                <div class="text-xs text-slate-500 mt-0.5">
                                    เลขที่: <?= htmlspecialchars($t['doc_number'] ?? '-') ?> • 
                                    ผู้รับ: <?= htmlspecialchars($t['payee'] ?? '-') ?> • 
                                    วันที่: <?= htmlspecialchars($t['transaction_date'] ?? '-') ?>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-emerald-600 text-sm">฿<?= number_format($t['amount'] ?? 0, 2) ?></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
