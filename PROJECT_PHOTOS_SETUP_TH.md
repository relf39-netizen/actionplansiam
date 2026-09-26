# ตั้งค่าภาพกิจกรรมแยกตามโรงเรียนใน Google Drive

แต่ละโรงเรียนต้องใช้บัญชี Google และโฟลเดอร์ Drive ของตนเอง พร้อม Apps Script Web App คนละชุด

1. ผู้ดูแลโรงเรียนสร้างโฟลเดอร์ภาพกิจกรรมใน Google Drive ของโรงเรียน แล้วคัดลอก Folder ID จาก URL
2. เข้าเว็บแอป → **ตั้งค่าระบบ** → การ์ด **เชื่อมต่อโฟลเดอร์ภาพโครงการใน Google Drive** → กด **คัดลอกโค้ด** หรือ **ดาวน์โหลดโค้ด .gs** (เมนู **การเชื่อมต่อ & ส่งออก** → แท็บ **ภาพโครงการ → Drive โรงเรียน** ก็ใช้ได้)
3. เข้า https://script.google.com/ ด้วยบัญชี Google ของโรงเรียน สร้าง Apps Script โปรเจ็กต์ใหม่ วางโค้ดใน Code.gs
4. Project Settings → Script Properties: ตั้ง `ROOT_FOLDER_ID` เป็น Folder ID และ `BRIDGE_SECRET` เป็นรหัสสุ่มอย่างน้อย 32 ตัวอักษร กดสร้างและคัดลอกรหัสจากแท็บในเว็บแอปได้
5. Deploy → New deployment → Web app → Execute as **Me** → Who has access: **Anyone** คัดลอก URL ที่ลงท้าย `/exec`
6. ในการ์ดตั้งค่าระบบ ใส่ Folder ID, URL และ BRIDGE_SECRET ของโรงเรียน แล้วกด **บันทึกและทดสอบการเชื่อมต่อ** ระบบจะตรวจว่า Folder ID ตรงกับ ROOT_FOLDER_ID ของ Apps Script ก่อนบันทึก
7. ทดลองอัปโหลดภาพในโครงการที่อนุมัติ รีเฟรช พิมพ์ภาคผนวก และลบภาพทดลอง

MySQL เก็บ URL/รหัสเชื่อมต่อไว้ในตาราง `school_photo_integrations` แยกตาม school_id และเก็บ File ID กับคำบรรยายในข้อมูลโครงการ รูป JPEG อยู่ในโฟลเดอร์ย่อย `school-ID/fiscal-ID/project-ID` ภายใน Drive ของโรงเรียนนั้น ห้ามเผยแพร่ BRIDGE_SECRET ให้บุคคลอื่น
