<?php
$pageTitle = 'แก้ไขข้อมูลโรงเรียน';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

$id = intval($_GET['id'] ?? 0);
if ($id <= 0 || !$pdo) {
    header("Location: /php_app/schools/index.php");
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM `schools` WHERE `id` = ?");
$stmt->execute([$id]);
$school = $stmt->fetch();

if (!$school) {
    header("Location: /php_app/schools/index.php?msg=" . urlencode("ไม่พบข้อมูลโรงเรียน"));
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $directorName = trim($_POST['director_name'] ?? '');
    $province = trim($_POST['province'] ?? '');
    $educationArea = trim($_POST['education_area'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $email = trim($_POST['email'] ?? '');

    if (empty($name)) {
        $error = 'กรุณาระบุชื่อโรงเรียน';
    } else {
        try {
            $stmtUp = $pdo->prepare("UPDATE `schools` SET 
                `name` = ?, 
                `director_name` = ?, 
                `province` = ?, 
                `education_area` = ?, 
                `phone` = ?, 
                `email` = ?,
                `updated_at` = CURRENT_TIMESTAMP
                WHERE `id` = ?");
            $stmtUp->execute([$name, $directorName, $province, $educationArea, $phone, $email, $id]);
            header("Location: /php_app/schools/index.php?msg=" . urlencode("อัปเดตข้อมูลโรงเรียน \"{$name}\" ใน MySQL เรียบร้อยแล้ว"));
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
        <h1 class="text-xl font-bold text-slate-800">แก้ไขข้อมูลโรงเรียน (MySQL)</h1>
        <p class="text-xs text-slate-500 mt-1">รหัส SMIS: <?= htmlspecialchars($school['smis_code']) ?></p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4">
        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อโรงเรียน *</label>
            <input type="text" name="name" required value="<?= htmlspecialchars($school['name']) ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อ-สกุล ผู้อำนวยการโรงเรียน</label>
            <input type="text" name="director_name" value="<?= htmlspecialchars($school['director_name'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เขตพื้นที่การศึกษา</label>
                <input type="text" name="education_area" value="<?= htmlspecialchars($school['education_area'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">จังหวัด</label>
                <input type="text" name="province" value="<?= htmlspecialchars($school['province'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เบอร์โทรศัพท์</label>
                <input type="text" name="phone" value="<?= htmlspecialchars($school['phone'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">อีเมลติดต่อ</label>
                <input type="email" name="email" value="<?= htmlspecialchars($school['email'] ?? '') ?>" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <a href="/php_app/schools/index.php" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">ยกเลิก</a>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                บันทึกการแก้ไข
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
