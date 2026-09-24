# ระบบแผนปฏิบัติการและจัดสรรงบประมาณสถานศึกษา (Pure PHP + MySQL Version)
ตามมาตรฐานระเบียบกระทรวงศึกษาธิการ และ สพฐ.

ระบบนี้พัฒนาด้วย **PHP ล้วน (Pure PHP) + MySQL PDO** โดยไม่มีการพึ่งพา Node.js, Vite หรือ JavaScript Build Tool ใดๆ ทำให้สามารถอัปโหลดไฟล์ขึ้นเว็บโฮสติ้ง cPanel, DirectAdmin หรือรันบน XAMPP/Laragon ได้ทันที 100%

---

## 📁 โครงสร้างโฟลเดอร์แยกส่วนตามเมนู (Modular PHP Architecture)

```
php_app/
├── config/
│   ├── db.php                 # การเชื่อมต่อฐานข้อมูล PDO MySQL
│   └── db_config.json         # กำหนด Host, Username, Password, Database
├── includes/
│   ├── header.php             # แถบเมนูด้านบน นำทาง และสถานะการเชื่อมต่อ MySQL
│   └── footer.php             # ส่วนท้ายของระบบ
├── index.php                  # แดชบอร์ดสรุปงบประมาณและโครงการ (หน้าหลัก)
├── schools/                   # เมนูจัดการโรงเรียน
│   ├── index.php              # รายชื่อโรงเรียนทั้งหมดในตาราง schools
│   ├── create.php             # เพิ่มโรงเรียนใหม่ลง MySQL
│   ├── edit.php               # แก้ไขข้อมูลโรงเรียนใน MySQL
│   ├── delete.php             # ลบโรงเรียนออกจาก MySQL
│   └── switch.php             # สลับโรงเรียนที่กำลังใช้งาน (Active School)
├── projects/                  # เมนูโครงการตามแผนปฏิบัติการ
│   ├── index.php              # ตารางโครงการทั้งหมดของโรงเรียนในตาราง projects
│   ├── create.php             # แบบฟอร์มเสนอโครงการตามระเบียบ สพฐ.
│   ├── view.php               # ดูรายละเอียดโครงการ วัตถุประสงค์ และประวัติเบิกจ่าย
│   ├── edit.php               # แก้ไขโครงการ
│   └── delete.php             # ลบโครงการออกจาก MySQL
├── budget/                    # เมนูประมาณการรายรับ
│   └── index.php              # คำนวณเงินอุดหนุนรายหัวและรายรับสถานศึกษา (ตาราง revenues)
├── transactions/              # เมนูการเบิกจ่ายงบประมาณ
│   ├── index.php              # รายการฎีกา/ใบเสร็จการเบิกจ่าย (ตาราง budget_transactions)
│   └── create.php             # บันทึกการเบิกจ่ายพร้อมตัดยอดงบคงเหลือใน MySQL ทันที
└── reports/                   # เมนูรายงานแผนปฏิบัติการ
    └── index.php              # รายงานสรุปแผนปฏิบัติการประจำปี สั่งพิมพ์หรือ Export PDF ได้
```

---

## 🚀 วิธีนำไปติดตั้งบน cPanel / DirectAdmin / Hosting

1. นำไฟล์ในโฟลเดอร์ `php_app/` ไปวางที่ `public_html/` ของคุณ
2. เปิดไฟล์ `config/db_config.json` หรือ `config/db.php` แล้วระบุข้อมูลการเชื่อมต่อ MySQL:
   - **host**: `localhost` หรือ `127.0.0.1`
   - **database**: ชื่อฐานข้อมูลที่คุณสร้างใน cPanel
   - **username**: ชื่อผู้ใช้ฐานข้อมูล
   - **password**: รหัสผ่านฐานข้อมูล
3. เปิดเบราว์เซอร์เข้าสู่ระบบ ข้อมูลทุกอย่างที่บันทึกหรือแก้ไขจะเข้าสู่ตารางใน MySQL (phpMyAdmin) โดยตรง 100% ไม่มี Demo อีกต่อไป
