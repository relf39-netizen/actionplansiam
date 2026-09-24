/**
 * Application Startup File for cPanel (Setup Node.js App / Phusion Passenger)
 * CommonJS Version (.cjs)
 */

process.env.NODE_ENV = 'production';

const fs = require('fs');
const path = require('path');
const http = require('http');

const distDir = path.join(__dirname, 'dist');
const prodDistDir = path.join(__dirname, 'prod_dist');
const distServer = path.join(distDir, 'server.cjs');
const prodDistServer = path.join(prodDistDir, 'server.cjs');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

if (fs.existsSync(prodDistServer)) {
  const needsSync = !fs.existsSync(distServer) || fs.statSync(prodDistServer).size !== fs.statSync(distServer).size;
  if (needsSync) {
    try {
      console.log("📦 อัปเดตไฟล์ Build สำเร็จรูปจาก 'prod_dist' ไปยัง 'dist'...");
      copyFolderRecursiveSync(prodDistDir, distDir);
    } catch (err) {
      console.error("⚠️ ไม่สามารถคัดลอก prod_dist ได้:", err.message);
    }
  }
}

try {
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
} catch (e) {}

let serverLoaded = false;
const targetServer = fs.existsSync(distServer) ? distServer : (fs.existsSync(prodDistServer) ? prodDistServer : null);

if (targetServer) {
  try {
    console.log(`🚀 กำลังเริ่มระบบ Production Server จาก: ${targetServer}`);
    require(targetServer);
    serverLoaded = true;
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาดในการโหลด Server CJS:", err);
  }
}

if (!serverLoaded) {
  console.warn("⚠️ กำลังรัน Emergency Fallback Server สำหรับ cPanel...");
  const server = http.createServer((req, res) => {
    if (req.url && req.url.startsWith('/api/')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          success: true,
          message: 'ระบบตอบรับคำขอสำเร็จ (โหมด Standalone Fallback)',
          fallback: true,
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center; max-width: 650px; margin: auto;">
        <h2 style="color: #0284c7;">ระบบแผนปฏิบัติการสถานศึกษาพร้อมใช้งาน</h2>
        <p style="color: #475569; line-height: 1.6;">
          หากหน้าเว็บยังไม่แสดงผล กรุณากดปุ่ม <strong>Restart</strong> ในเมนู <strong>Setup Node.js App</strong> ใน cPanel
        </p>
      </div>
    `);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Fallback server listening on port/socket: ${port}`);
  });
}
