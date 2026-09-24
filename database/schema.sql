-- ==========================================================
-- ระบบแผนปฏิบัติการประจำปีและจัดสรรงบประมาณโรงเรียน
-- School Annual Operational Plan & Budget Allocation System
-- รองรับ: MySQL 8.x / MariaDB 10.4+ / PHP 8.x
-- สำหรับ: โรงเรียนระดับการศึกษาขั้นพื้นฐาน (สพฐ.)
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- 0. ตารางผู้ดูแลระบบส่วนกลาง (super_admins)
DROP TABLE IF EXISTS `super_admins`;
CREATE TABLE `super_admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT 'ชื่อผู้ใช้งาน Super Admin',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านแฮช',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อ-นามสกุล',
  `email` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผู้ดูแลระบบส่วนกลาง Super Admin';

-- 1. ตารางข้อมูลโรงเรียน (schools) - รองรับ Multi-Tenant และรหัสสมัคร SMIS 8 หลัก
DROP TABLE IF EXISTS `schools`;
CREATE TABLE `schools` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_code` VARCHAR(20) NOT NULL COMMENT 'รหัสสถานศึกษา 10 หลัก',
  `smis_code` VARCHAR(8) NOT NULL COMMENT 'รหัสสมัคร SMIS 8 หลัก สำหรับเปิดใช้งาน',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'สถานะ: 1=เปิดใช้งาน, 0=ปิด/ระงับการใช้งาน',
  `school_key` VARCHAR(50) NOT NULL COMMENT 'School ID / Tenant Key ป้องกันข้อมูลชนกัน',
  `admin_username` VARCHAR(50) NOT NULL DEFAULT 'admin' COMMENT 'ID ผู้ดูแลระบบของโรงเรียน',
  `admin_password_plain` VARCHAR(100) DEFAULT '123456' COMMENT 'รหัสผ่านเข้าใช้งานของโรงเรียน',
  `admin_password_hash` VARCHAR(255) DEFAULT NULL COMMENT 'รหัสผ่านแฮช',
  `name` VARCHAR(255) NOT NULL COMMENT 'ชื่อโรงเรียน',
  `address` VARCHAR(255) DEFAULT NULL COMMENT 'ที่อยู่ / หมู่บ้าน',
  `subdistrict` VARCHAR(100) DEFAULT NULL COMMENT 'ตำบล / แขวง',
  `district` VARCHAR(100) DEFAULT NULL COMMENT 'อำเภอ / เขต',
  `province` VARCHAR(100) DEFAULT NULL COMMENT 'จังหวัด',
  `zipcode` VARCHAR(10) DEFAULT NULL COMMENT 'รหัสไปรษณีย์',
  `affiliation` VARCHAR(255) DEFAULT 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)' COMMENT 'สังกัด',
  `education_area` VARCHAR(255) DEFAULT NULL COMMENT 'เขตพื้นที่การศึกษา',
  `fiscal_year` INT UNSIGNED DEFAULT 2568 COMMENT 'ปีงบประมาณปัจจุบัน',
  `director_name` VARCHAR(150) DEFAULT NULL COMMENT 'ชื่อผู้อำนวยการ',
  `phone` VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรศัพท์',
  `email` VARCHAR(100) DEFAULT NULL COMMENT 'อีเมล',
  `logo_url` TEXT DEFAULT NULL COMMENT 'โลโก้โรงเรียน',
  `notes` TEXT DEFAULT NULL COMMENT 'หมายเหตุ / บันทึกการเปิดใช้งาน',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_school_code` (`school_code`),
  UNIQUE KEY `idx_smis_code` (`smis_code`),
  UNIQUE KEY `idx_school_key` (`school_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลพื้นฐานโรงเรียน Multi-Tenant';

-- 2. ตารางปีงบประมาณ (fiscal_years)
DROP TABLE IF EXISTS `fiscal_years`;
CREATE TABLE `fiscal_years` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `year` INT UNSIGNED NOT NULL COMMENT 'ปีงบประมาณ พ.ศ.',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '1=ปีปัจจุบัน, 0=ปีอื่น',
  `start_date` DATE NOT NULL COMMENT 'วันที่เริ่มต้นปีงบประมาณ (1 ต.ค.)',
  `end_date` DATE NOT NULL COMMENT 'วันที่สิ้นสุดปีงบประมาณ (30 ก.ย.)',
  `total_students` INT UNSIGNED DEFAULT 0 COMMENT 'จำนวนนักเรียนทั้งหมด',
  `teacher_count` INT UNSIGNED DEFAULT 0 COMMENT 'จำนวนครูและบุคลากร',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_school_year` (`school_id`, `year`),
  CONSTRAINT `fk_fy_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางปีงบประมาณ';

-- 3. ตารางผู้ใช้งานระบบ (users)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(50) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านแฮช (bcrypt / password_hash)',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อ-นามสกุล',
  `email` VARCHAR(100) DEFAULT NULL COMMENT 'อีเมล',
  `role` ENUM('admin', 'director', 'teacher') NOT NULL DEFAULT 'teacher' COMMENT 'ระดับสิทธิ์: admin, director, teacher',
  `department` VARCHAR(100) DEFAULT NULL COMMENT 'ฝ่ายงาน/กลุ่มสาระ',
  `position` VARCHAR(100) DEFAULT NULL COMMENT 'ตำแหน่งวิชาการ/วิทยฐานะ',
  `phone` VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรศัพท์',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_login` (`username`),
  CONSTRAINT `fk_users_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผู้ใช้งานและระดับสิทธิ์';

-- 4. ตารางจำนวนนักเรียนแยกชั้น (students)
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `grade_level` VARCHAR(50) NOT NULL COMMENT 'ระดับชั้น (อ.1 - ป.6)',
  `stage` ENUM('อนุบาล', 'ประถม', 'มัธยม') NOT NULL DEFAULT 'ประถม',
  `male_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ชาย',
  `female_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'หญิง',
  `total_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'รวม',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_grade_year` (`school_id`, `fiscal_year_id`, `grade_level`),
  CONSTRAINT `fk_students_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_students_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจำนวนนักเรียนแยกตามระดับชั้น';

-- 5. ตารางประมาณการรายรับ (revenues)
DROP TABLE IF EXISTS `revenues`;
CREATE TABLE `revenues` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `category` ENUM('subsidy', 'activity', 'welfare', 'lunch', 'fundraising', 'revenue', 'other') NOT NULL,
  `item_name` VARCHAR(255) NOT NULL COMMENT 'รายการรายรับ',
  `rate_per_head` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'อัตราต่อคน (บาท)',
  `eligible_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'จำนวนผู้มีสิทธิ์ (คน)',
  `calculated_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินรวม = อัตรา x จำนวนผู้มีสิทธิ์',
  `is_custom_rate` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=กำหนดเงินเอง',
  `note` TEXT DEFAULT NULL COMMENT 'หมายเหตุ / เกณฑ์ สพฐ.',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_revenues_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_revenues_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางประมาณการรายรับสถานศึกษา';

-- 6. ตารางการจัดสรรงบประมาณตามฝ่าย/งาน (budget_allocations)
DROP TABLE IF EXISTS `budget_allocations`;
CREATE TABLE `budget_allocations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `department_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อฝ่ายงาน เช่น ฝ่ายวิชาการ, งบกลาง',
  `percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'สัดส่วนเปอร์เซ็นต์ (รวมต้องได้ 100%)',
  `allocated_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินที่จัดสรร',
  `spent_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินที่ใช้ไปแล้ว',
  `remaining_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินคงเหลือ',
  `color_hex` VARCHAR(20) DEFAULT '#2563eb',
  `description` TEXT DEFAULT NULL COMMENT 'ขอบข่ายภารกิจ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_alloc_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alloc_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจัดสรรงบประมาณตามฝ่าย';

-- 7. ตารางงบกิจกรรมพัฒนาผู้เรียน (learner_activities)
DROP TABLE IF EXISTS `learner_activities`;
CREATE TABLE `learner_activities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `activity_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อกิจกรรมพัฒนาผู้เรียน 4 กิจกรรมหลัก สพฐ.',
  `percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'เปอร์เซ็นต์การจัดสรร (รวม 100%)',
  `allocated_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินที่ได้รับ',
  `spent_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'ใช้ไปแล้ว',
  `remaining_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'คงเหลือ',
  `note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_la_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_la_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางกิจกรรมพัฒนาผู้เรียน';

-- 8. ตารางยุทธศาสตร์ (strategies)
DROP TABLE IF EXISTS `strategies`;
CREATE TABLE `strategies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'รหัสยุทธศาสตร์',
  `name` VARCHAR(255) NOT NULL COMMENT 'ชื่อยุทธศาสตร์',
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_strat_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_strat_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางยุทธศาสตร์โรงเรียน';

-- 9. ตารางเป้าประสงค์ (goals)
DROP TABLE IF EXISTS `goals`;
CREATE TABLE `goals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `strategy_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_goal_strat` FOREIGN KEY (`strategy_id`) REFERENCES `strategies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเป้าประสงค์';

-- 10. ตารางตัวชี้วัด (indicators)
DROP TABLE IF EXISTS `indicators`;
CREATE TABLE `indicators` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `goal_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `target_value` VARCHAR(50) DEFAULT NULL,
  `unit` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ind_goal` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางตัวชี้วัดความสำเร็จ';

-- 11. ตารางโครงการ (projects)
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `strategy_id` INT UNSIGNED DEFAULT NULL,
  `goal_id` INT UNSIGNED DEFAULT NULL,
  `indicator_id` INT UNSIGNED DEFAULT NULL,
  `project_code` VARCHAR(50) NOT NULL COMMENT 'รหัสโครงการ เช่น PROJ-68-01',
  `project_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อโครงการ',
  `rationale` TEXT DEFAULT NULL COMMENT 'หลักการและเหตุผล',
  `objectives` TEXT DEFAULT NULL COMMENT 'วัตถุประสงค์',
  `quantitative_goals` TEXT DEFAULT NULL COMMENT 'เป้าหมายเชิงปริมาณ',
  `qualitative_goals` TEXT DEFAULT NULL COMMENT 'เป้าหมายเชิงคุณภาพ',
  `kpis` TEXT DEFAULT NULL COMMENT 'ตัวชี้วัดความสำเร็จ',
  `procedures` TEXT DEFAULT NULL COMMENT 'วิธีดำเนินงาน/ขั้นตอน',
  `duration_start` DATE DEFAULT NULL COMMENT 'วันเริ่มโครงการ',
  `duration_end` DATE DEFAULT NULL COMMENT 'วันสิ้นสุดโครงการ',
  `location` VARCHAR(255) DEFAULT NULL COMMENT 'สถานที่ดำเนินงาน',
  `target_group` VARCHAR(255) DEFAULT NULL COMMENT 'กลุ่มเป้าหมาย',
  `responsible_person` VARCHAR(150) NOT NULL COMMENT 'ผู้รับผิดชอบโครงการ',
  `responsible_id` INT UNSIGNED DEFAULT NULL COMMENT 'อ้างอิง user_id',
  `proposer_name` VARCHAR(150) DEFAULT NULL COMMENT 'ชื่อ-สกุล ครูผู้เสนอโครงการ',
  `proposer_citizen_id` VARCHAR(13) DEFAULT NULL COMMENT 'เลขประจำตัวประชาชน 13 หลัก ของครูผู้เสนอโครงการ',
  `original_budget` DECIMAL(14, 2) DEFAULT NULL COMMENT 'งบประมาณเดิมก่อนปรับเปลี่ยน',
  `budget_adjusted_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'วันเวลาที่ปรับงบประมาณ',
  `budget_adjusted_by` VARCHAR(150) DEFAULT NULL COMMENT 'ผู้มีอำนาจที่อนุมัติปรับงบ',
  `budget_adjustment_reason` TEXT DEFAULT NULL COMMENT 'เหตุผลการปรับเปลี่ยนงบประมาณ',
  `closed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'วันเวลาที่ปิดโครงการ',
  `closed_by` VARCHAR(150) DEFAULT NULL COMMENT 'ผู้ปิดโครงการ',
  `closure_notes` TEXT DEFAULT NULL COMMENT 'บันทึกสรุปผลการดำเนินงานเมื่อปิดโครงการ',
  `attachment_name` VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อไฟล์แนบโครงการหรือลิงก์เอกสาร',
  `department` VARCHAR(100) NOT NULL COMMENT 'ฝ่าย/งานที่รับผิดชอบ',
  `budget_source` VARCHAR(150) NOT NULL COMMENT 'แหล่งงบประมาณ',
  `allocated_budget` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'งบประมาณที่จัดสรร',
  `spent_budget` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'งบประมาณที่ใช้ไป',
  `remaining_budget` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'งบประมาณคงเหลือ',
  `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started' COMMENT 'สถานะโครงการ',
  `approval_status` ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' COMMENT 'สถานะอนุมัติ',
  `sort_order` INT UNSIGNED DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_proj_code` (`school_id`, `fiscal_year_id`, `project_code`),
  CONSTRAINT `fk_proj_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proj_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางโครงการตามแผนปฏิบัติการ';

-- 12. ตารางรายละเอียดค่าใช้จ่ายโครงการ (project_expenses)
DROP TABLE IF EXISTS `project_expenses`;
CREATE TABLE `project_expenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL COMMENT 'รายการค่าใช้จ่าย',
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00 COMMENT 'จำนวน',
  `unit` VARCHAR(50) NOT NULL COMMENT 'หน่วยนับ เช่น รีม, ชุด, คน, มื้อ',
  `unit_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'ราคาต่อหน่วย (บาท)',
  `total_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินรวม = จำนวน x ราคาต่อหน่วย',
  `category` ENUM('ค่าตอบแทน', 'ค่าใช้สอย', 'ค่าวัสดุ', 'ค่าครุภัณฑ์', 'อื่น ๆ') NOT NULL DEFAULT 'ค่าวัสดุ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_exp_proj` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางรายละเอียดค่าใช้จ่ายแต่ละโครงการ';

-- 13. ตารางการเบิกจ่ายงบประมาณ (budget_transactions)
DROP TABLE IF EXISTS `budget_transactions`;
CREATE TABLE `budget_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NOT NULL,
  `doc_number` VARCHAR(50) NOT NULL COMMENT 'เลขที่เอกสารขอเบิก/ใบเสร็จ',
  `transaction_date` DATE NOT NULL COMMENT 'วันที่ทำรายการ',
  `item_description` VARCHAR(255) NOT NULL COMMENT 'รายการเบิกจ่าย',
  `amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'ยอดเงินที่เบิกจ่าย',
  `payee` VARCHAR(150) NOT NULL COMMENT 'ผู้รับเงิน / ร้านค้า',
  `receipt_number` VARCHAR(100) DEFAULT NULL COMMENT 'เลขที่ใบเสร็จรับเงิน',
  `approved_by` VARCHAR(150) NOT NULL COMMENT 'ผู้อนุมัติ',
  `status` ENUM('pending', 'approved') NOT NULL DEFAULT 'approved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tx_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tx_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tx_proj` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางบันทึกการเบิกจ่ายเงินงบประมาณ';

-- 14. ตารางแผนปฏิบัติการประจำปีรวม (action_plans)
DROP TABLE IF EXISTS `action_plans`;
CREATE TABLE `action_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL,
  `fiscal_year_id` INT UNSIGNED NOT NULL,
  `strategy_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NOT NULL,
  `priority_order` INT UNSIGNED DEFAULT 1,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ap_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ap_fy` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ap_strat` FOREIGN KEY (`strategy_id`) REFERENCES `strategies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ap_proj` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางแผนปฏิบัติการประจำปีรวบยอด';

SET FOREIGN_KEY_CHECKS = 1;
