<?php
$pageTitle = 'แดชบอร์ดสรุปงบประมาณและโครงการ';
require_once __DIR__ . '/config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

// 1. ดึงสถิติรวมจาก MySQL
$totalProjects = 0;
$totalAllocatedBudget = 0.00;
$totalSpentBudget = 0.00;
$totalRemainingBudget = 0.00;
$totalRevenues = 0.00;

if ($pdo) {
    try {
        // นับโครงการและงบ
        $stmt = $pdo->prepare("SELECT 
            COUNT(*) as proj_count,
            COALESCE(SUM(allocated_budget), 0) as total_allocated,
            COALESCE(SUM(spent_budget), 0) as total_spent,
            COALESCE(SUM(remaining_budget), 0) as total_remaining
            FROM `projects` WHERE `school_id` = ?");
        $stmt->execute([$schoolId]);
        $pStats = $stmt->fetch();
        if ($pStats) {
            $totalProjects = intval($pStats['proj_count']);
            $totalAllocatedBudget = floatval($pStats['total_allocated']);
            $totalSpentBudget = floatval($pStats['total_spent']);
            $totalRemainingBudget = floatval($pStats['total_remaining']);
        }

        // รวมรายรับ
        $stmtRev = $pdo->prepare("SELECT COALESCE(SUM(calculated_amount), 0) as total_rev FROM `revenues` WHERE `school_id` = ?");
        $stmtRev->execute([$schoolId]);
        $rStats = $stmtRev->fetch();
        if ($rStats) {
            $totalRevenues = floatval($rStats['total_rev']);
        }
    } catch (Exception $e) {
        error_log("Error fetching stats: " . $e->getMessage());
    }
}

// 2. ดึงโครงการล่าสุด 5 โครงการ
$recentProjects = [];
if ($pdo) {
    try {
        $stmtProj = $pdo->prepare("SELECT * FROM `projects` WHERE `school_id` = ? ORDER BY `id` DESC LIMIT 5");
        $stmtProj->execute([$schoolId]);
        $recentProjects = $stmtProj->fetchAll();
    } catch (Exception $e) {}
}

// 3. ดึงรายการเบิกจ่ายล่าสุด 5 รายการ
$recentTrans = [];
if ($pdo) {
    try {
        $stmtTrans = $pdo->prepare("SELECT * FROM `budget_transactions` WHERE `school_id` = ? ORDER BY `id` DESC LIMIT 5");
        $stmtTrans->execute([$schoolId]);
        $recentTrans = $stmtTrans->fetchAll();
    } catch (Exception $e) {}
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="space-y-6">
    <!-- ส่วนหัวหน้าจอ -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">
                <?= htmlspecialchars($activeSchool['name'] ?? 'โรงเรียนของท่าน') ?>
            </h1>
            <p class="text-sm text-slate-500 mt-1">
                ผู้อำนวยการ: <?= htmlspecialchars($activeSchool['director_name'] ?: 'ยังไม่ได้ระบุ') ?> • 
                รหัส SMIS: <?= htmlspecialchars($activeSchool['smis_code'] ?? '-') ?> • 
                ปีงบประมาณ พ.ศ. 2568
            </p>
        </div>
        <div class="flex space-x-2">
            <a href="/php_app/projects/create.php" class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                + เพิ่มโครงการใหม่
            </a>
            <a href="/php_app/schools/index.php" class="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition">
                สลับโรงเรียน
            </a>
        </div>
    </div>

    <!-- การ์ดตัวชี้วัด 4 ใบ (Key Metrics) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- การ์ด 1: ประมาณการรายรับรวม -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">ประมาณการรายรับรวม</div>
            <div class="mt-2 text-2xl font-bold text-slate-900">฿<?= number_format($totalRevenues, 2) ?></div>
            <div class="mt-1 text-xs text-slate-500">เงินอุดหนุนรายหัวและรายได้สถานศึกษา</div>
        </div>

        <!-- การ์ด 2: งบประมาณที่จัดสรรในโครงการ -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div class="text-xs font-semibold uppercase tracking-wider text-indigo-600">งบจัดสรรโครงการ</div>
            <div class="mt-2 text-2xl font-bold text-indigo-600">฿<?= number_format($totalAllocatedBudget, 2) ?></div>
            <div class="mt-1 text-xs text-slate-500">รวมทั้งหมด <?= number_format($totalProjects) ?> โครงการ</div>
        </div>

        <!-- การ์ด 3: เบิกจ่ายแล้ว -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div class="text-xs font-semibold uppercase tracking-wider text-emerald-600">เบิกจ่ายแล้ว</div>
            <div class="mt-2 text-2xl font-bold text-emerald-600">฿<?= number_format($totalSpentBudget, 2) ?></div>
            <div class="mt-1 text-xs text-slate-500">
                <?php 
                $spentPct = $totalAllocatedBudget > 0 ? ($totalSpentBudget / $totalAllocatedBudget) * 100 : 0;
                echo number_format($spentPct, 1) . '% ของงบจัดสรร';
                ?>
            </div>
        </div>

        <!-- การ์ด 4: งบคงเหลือ -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div class="text-xs font-semibold uppercase tracking-wider text-amber-600">งบประมาณคงเหลือ</div>
            <div class="mt-2 text-2xl font-bold text-amber-600">฿<?= number_format($totalRemainingBudget, 2) ?></div>
            <div class="mt-1 text-xs text-slate-500">พร้อมดำเนินการตามแผน</div>
        </div>
    </div>

    <!-- ตารางโครงการและรายการเบิกจ่าย -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- โครงการล่าสุด -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 class="font-bold text-slate-800">โครงการตามแผนปฏิบัติการ</h2>
                <a href="/php_app/projects/index.php" class="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    ดูทั้งหมด →
                </a>
            </div>
            <div class="p-6">
                <?php if (empty($recentProjects)): ?>
                    <div class="text-center py-8 text-slate-400">
                        <p class="text-sm">ยังไม่มีโครงการในโรงเรียนนี้</p>
                        <a href="/php_app/projects/create.php" class="mt-2 inline-block text-xs font-medium text-indigo-600 underline">
                            + คลิกที่นี่เพื่อเพิ่มโครงการแรก
                        </a>
                    </div>
                <?php else: ?>
                    <div class="space-y-4">
                        <?php foreach ($recentProjects as $p): ?>
                            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <a href="/php_app/projects/view.php?id=<?= $p['id'] ?>" class="font-semibold text-slate-800 hover:text-indigo-600 transition text-sm">
                                        <?= htmlspecialchars($p['project_name']) ?>
                                    </a>
                                    <div class="text-xs text-slate-500 mt-0.5">
                                        ฝ่าย: <?= htmlspecialchars($p['department'] ?? '-') ?> • 
                                        ผู้รับผิดชอบ: <?= htmlspecialchars($p['responsible_person'] ?? '-') ?>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-slate-800 text-sm">฿<?= number_format($p['allocated_budget'] ?? 0, 2) ?></div>
                                    <span class="inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                        <?= htmlspecialchars($p['status'] ?? 'รอดำเนินการ') ?>
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- รายการเบิกจ่ายล่าสุด -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 class="font-bold text-slate-800">รายการเบิกจ่ายงบประมาณล่าสุด</h2>
                <a href="/php_app/transactions/index.php" class="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    ดูทั้งหมด →
                </a>
            </div>
            <div class="p-6">
                <?php if (empty($recentTrans)): ?>
                    <div class="text-center py-8 text-slate-400">
                        <p class="text-sm">ยังไม่มีรายการเบิกจ่ายในระบบ</p>
                        <a href="/php_app/transactions/create.php" class="mt-2 inline-block text-xs font-medium text-indigo-600 underline">
                            + คลิกเพื่อบันทึกการเบิกจ่าย
                        </a>
                    </div>
                <?php else: ?>
                    <div class="space-y-4">
                        <?php foreach ($recentTrans as $t): ?>
                            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">
                                        <?= htmlspecialchars($t['item_description']) ?>
                                    </div>
                                    <div class="text-xs text-slate-500 mt-0.5">
                                        เลขที่: <?= htmlspecialchars($t['doc_number'] ?? '-') ?> • 
                                        ผู้รับ: <?= htmlspecialchars($t['payee'] ?? '-') ?>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-emerald-600 text-sm">฿<?= number_format($t['amount'] ?? 0, 2) ?></div>
                                    <div class="text-xs text-slate-400 mt-0.5"><?= htmlspecialchars($t['transaction_date'] ?? '') ?></div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
