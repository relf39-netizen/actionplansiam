<?php
$pageTitle = 'แก้ไขโครงการ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

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

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $projectName = trim($_POST['project_name'] ?? '');
    $department = trim($_POST['department'] ?? 'ฝ่ายบริหารงานวิชาการ');
    $responsiblePerson = trim($_POST['responsible_person'] ?? '');
    $allocatedBudget = floatval($_POST['allocated_budget'] ?? 0);
    $spentBudget = floatval($project['spent_budget'] ?? 0);
    $remainingBudget = $allocatedBudget - $spentBudget;
    $rationale = trim($_POST['rationale'] ?? '');
    $objectives = trim($_POST['objectives'] ?? '');

    if (empty($projectName)) {
        $error = 'กรุณาระบุชื่อโครงการ';
    } else {
        try {
            $stmtUp = $pdo->prepare("UPDATE `projects` SET 
                `project_name` = ?, 
                `department` = ?, 
                `responsible_person` = ?, 
                `allocated_budget` = ?, 
                `remaining_budget` = ?,
                `rationale` = ?,
                `objectives` = ?,
                `updated_at` = CURRENT_TIMESTAMP
                WHERE `id` = ?");
            $stmtUp->execute([$projectName, $department, $responsiblePerson, $allocatedBudget, $remainingBudget, $rationale, $objectives, $id]);
            header("Location: /php_app/projects/view.php?id={$id}&msg=" . urlencode("แก้ไขโครงการเรียบร้อย"));
            exit;
        } catch (Exception $e) {
            $error = 'เกิดข้อผิดพลาดในการอัปเดต: ' . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <div class="mb-6">
        <h1 class="text-xl font-bold text-slate-800">แก้ไขโครงการ (MySQL)</h1>
        <p class="text-xs text-slate-500 mt-1">รหัส: <?= htmlspecialchars($project['project_code'] ?? '-') ?></p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4">
        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อโครงการ *</label>
            <input type="text" name="project_name" required value="<?= htmlspecialchars($project['project_name']) ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">กลุ่มงาน / ฝ่ายรับผิดชอบ *</label>
                <select name="department" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <?php 
                    $depts = ['ฝ่ายบริหารงานวิชาการ', 'ฝ่ายบริหารงานงบประมาณ', 'ฝ่ายบริหารงานบุคคล', 'ฝ่ายบริหารงานทั่วไป'];
                    foreach ($depts as $d): ?>
                        <option value="<?= $d ?>" <?= ($project['department'] == $d) ? 'selected' : '' ?>><?= $d ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ผู้รับผิดชอบโครงการ</label>
                <input type="text" name="responsible_person" value="<?= htmlspecialchars($project['responsible_person'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">งบประมาณที่จัดสรร (บาท)</label>
            <input type="number" step="0.01" name="allocated_budget" value="<?= htmlspecialchars($project['allocated_budget'] ?? 0) ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">หลักการและเหตุผล</label>
            <textarea name="rationale" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"><?= htmlspecialchars($project['rationale'] ?? '') ?></textarea>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">วัตถุประสงค์</label>
            <textarea name="objectives" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"><?= htmlspecialchars($project['objectives'] ?? '') ?></textarea>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <a href="/php_app/projects/view.php?id=<?= $id ?>" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">ยกเลิก</a>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                บันทึกการแก้ไข
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
