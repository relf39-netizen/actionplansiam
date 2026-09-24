<?php
$pageTitle = 'เพิ่มโรงเรียนใหม่';
require_once __DIR__ . '/../config/db.php';
$pdo = getDbConnection();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $smisCode = trim($_POST['smis_code'] ?? '');
    $schoolCode = trim($_POST['school_code'] ?? ($smisCode . '00'));
    $name = trim($_POST['name'] ?? '');
    $directorName = trim($_POST['director_name'] ?? '');
    $province = trim($_POST['province'] ?? '');
    $educationArea = trim($_POST['education_area'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $email = trim($_POST['email'] ?? '');

    if (empty($name)) {
        $error = 'กรุณาระบุชื่อโรงเรียน';
    } elseif (empty($smisCode)) {
        $error = 'กรุณาระบุรหัส SMIS 8 หลัก';
    } elseif (!$pdo) {
        $error = 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้';
    } else {
        try {
            $stmt = $pdo->prepare("INSERT INTO `schools` 
                (`school_code`, `smis_code`, `name`, `director_name`, `province`, `education_area`, `phone`, `email`, `school_key`, `is_active`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([
                $schoolCode,
                $smisCode,
                $name,
                $directorName,
                $province,
                $educationArea,
                $phone,
                $email,
                'SCH-' . $smisCode,
            ]);
            $newId = $pdo->lastInsertId();
            $_SESSION['active_school_id'] = $newId;
            header("Location: /php_app/schools/index.php?msg=" . urlencode("เพิ่มโรงเรียน \"{$name}\" ลง MySQL เรียบร้อยแล้ว"));
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
        <h1 class="text-xl font-bold text-slate-800">เพิ่มโรงเรียนใหม่เข้าสู่ฐานข้อมูล MySQL</h1>
        <p class="text-xs text-slate-500 mt-1">ข้อมูลจะถูกบันทึกจริงลงในตาราง <code>schools</code> บน phpMyAdmin ทันที</p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">รหัส SMIS 8 หลัก *</label>
                <input type="text" name="smis_code" required maxlength="8" placeholder="เช่น 10501234" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">รหัสสถานศึกษา 10 หลัก</label>
                <input type="text" name="school_code" maxlength="10" placeholder="เช่น 1050123400" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อโรงเรียน *</label>
            <input type="text" name="name" required placeholder="เช่น โรงเรียนบ้านหนองบัว" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">ชื่อ-สกุล ผู้อำนวยการโรงเรียน</label>
            <input type="text" name="director_name" placeholder="เช่น นายสมศักดิ์ สุขใจ" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เขตพื้นที่การศึกษา</label>
                <input type="text" name="education_area" placeholder="เช่น สพป. เชียงใหม่ เขต 1" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">จังหวัด</label>
                <input type="text" name="province" placeholder="เช่น เชียงใหม่" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">เบอร์โทรศัพท์</label>
                <input type="text" name="phone" placeholder="เช่น 053-000-000" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">อีเมลติดต่อ</label>
                <input type="email" name="email" placeholder="เช่น school@obec.mail.go.th" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <a href="/php_app/schools/index.php" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">ยกเลิก</a>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                บันทึกลง MySQL
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
