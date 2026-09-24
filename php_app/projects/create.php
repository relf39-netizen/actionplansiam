<?php
$pageTitle = 'เพิ่มโครงการใหม่ตามแผนปฏิบัติการ';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();
$activeSchool = getActiveSchool($pdo);
$schoolId = $activeSchool['id'] ?? 1;

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $projectName = trim($_POST['project_name'] ?? '');
    $department = trim($_POST['department'] ?? 'ฝ่ายบริหารงานวิชาการ');
    $responsiblePerson = trim($_POST['responsible_person'] ?? '');
    $budgetSource = trim($_POST['budget_source'] ?? 'เงินอุดหนุนรายหัว');
    $allocatedBudget = floatval($_POST['allocated_budget'] ?? 0);
    $rationale = trim($_POST['rationale'] ?? '');
    $objectives = trim($_POST['objectives'] ?? '');
    $quantitativeGoals = trim($_POST['quantitative_goals'] ?? '');
    $qualitativeGoals = trim($_POST['qualitative_goals'] ?? '');
    $durationStart = trim($_POST['duration_start'] ?? '');
    $durationEnd = trim($_POST['duration_end'] ?? '');
    $location = trim($_POST['location'] ?? '');
    $targetGroup = trim($_POST['target_group'] ?? '');

    if (empty($projectName)) {
        $error = 'กรุณาระบุชื่อโครงการ';
    } elseif ($allocatedBudget < 0) {
        $error = 'งบประมาณต้องไม่ติดลบ';
    } elseif (!$pdo) {
        $error = 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้';
    } else {
        try {
            // สุ่มหรือสร้างรหัสโครงการ
            $projectCode = 'PROJ-68-' . rand(100, 999);

            $stmt = $pdo->prepare("INSERT INTO `projects` (
                `school_id`, `fiscal_year_id`, `project_code`, `project_name`, 
                `department`, `responsible_person`, `budget_source`, `allocated_budget`, 
                `spent_budget`, `remaining_budget`, `rationale`, `objectives`, 
                `quantitative_goals`, `qualitative_goals`, `duration_start`, `duration_end`, 
                `location`, `target_group`, `status`, `approval_status`
            ) VALUES (
                ?, 1, ?, ?, 
                ?, ?, ?, ?, 
                0, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, 'not_started', 'approved'
            )");

            $stmt->execute([
                $schoolId,
                $projectCode,
                $projectName,
                $department,
                $responsiblePerson,
                $budgetSource,
                $allocatedBudget,
                $allocatedBudget,
                $rationale,
                $objectives,
                $quantitativeGoals,
                $qualitativeGoals,
                $durationStart,
                $durationEnd,
                $location,
                $targetGroup,
            ]);

            header("Location: /php_app/projects/index.php?msg=" . urlencode("บันทึกโครงการ \"{$projectName}\" ลง MySQL เรียบร้อยแล้ว"));
            exit;
        } catch (Exception $e) {
            $error = 'เกิดข้อผิดพลาดในการบันทึกโครงการ: ' . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <div class="mb-6">
        <h1 class="text-xl font-bold text-slate-800">เสนอ / เพิ่มโครงการใหม่ (ตามระเบียบ สพฐ.)</h1>
        <p class="text-xs text-slate-500 mt-1">
            โรงเรียน: <?= htmlspecialchars($activeSchool['name']) ?> • บันทึกลงตาราง <code>projects</code> ใน MySQL ทันที
        </p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-5">
        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อโครงการ *</label>
            <input type="text" name="project_name" required placeholder="เช่น โครงการพัฒนาทักษะการอ่านออกเขียนได้สำหรับนักเรียน" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">กลุ่มงาน / ฝ่ายรับผิดชอบ *</label>
                <select name="department" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="ฝ่ายบริหารงานวิชาการ">ฝ่ายบริหารงานวิชาการ</option>
                    <option value="ฝ่ายบริหารงานงบประมาณ">ฝ่ายบริหารงานงบประมาณ</option>
                    <option value="ฝ่ายบริหารงานบุคคล">ฝ่ายบริหารงานบุคคล</option>
                    <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ผู้รับผิดชอบโครงการ *</label>
                <input type="text" name="responsible_person" required placeholder="เช่น นางสาวใจดี มีสุข" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">งบประมาณที่ขอจัดสรร (บาท) *</label>
                <input type="number" step="0.01" min="0" name="allocated_budget" required placeholder="เช่น 25000" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">แหล่งงบประมาณ</label>
                <select name="budget_source" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="เงินอุดหนุนรายหัว">เงินอุดหนุนรายหัว</option>
                    <option value="เงินกิจกรรมพัฒนาผู้เรียน">เงินกิจกรรมพัฒนาผู้เรียน</option>
                    <option value="เงินรายได้สถานศึกษา">เงินรายได้สถานศึกษา</option>
                    <option value="งบกลาง / งบพัฒนาคุณภาพการศึกษา">งบกลาง / งบพัฒนาคุณภาพการศึกษา</option>
                </select>
            </div>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">หลักการและเหตุผล</label>
            <textarea name="rationale" rows="3" placeholder="ระบุความเป็นมาและความจำเป็นในการจัดทำโครงการ..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">วัตถุประสงค์</label>
            <textarea name="objectives" rows="3" placeholder="1. เพื่อส่งเสริมทักษะการเรียนรู้..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เป้าหมายเชิงปริมาณ</label>
                <input type="text" name="quantitative_goals" placeholder="เช่น นักเรียนชั้น ป.1-ป.6 จำนวน 120 คน" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เป้าหมายเชิงคุณภาพ</label>
                <input type="text" name="qualitative_goals" placeholder="เช่น นักเรียนร้อยละ 85 มีผลสัมฤทธิ์ระดับดีขึ้นไป" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">สถานที่ดำเนินงาน</label>
                <input type="text" name="location" placeholder="เช่น ห้องประชุมโรงเรียน" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">กลุ่มเป้าหมาย</label>
                <input type="text" name="target_group" placeholder="เช่น ครูและนักเรียนทุกคน" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <a href="/php_app/projects/index.php" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">ยกเลิก</a>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                บันทึกโครงการลง MySQL
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
