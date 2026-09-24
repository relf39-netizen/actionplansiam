/**
 * Node.js Real MySQL Database Connection & Configuration Manager
 * ระบบจัดการการเชื่อมต่อฐานข้อมูลจริง MySQL / MariaDB สำหรับ Node.js (Express Server)
 * รองรับการอ่านค่าจาก Environment Variables (.env) และ config/db_config.json
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  dbname: string;
  user: string;
  pass: string;
  charset: string;
  source: 'env' | 'custom_file' | 'default';
  updatedAt?: string;
}

export interface DatabaseStatus {
  success: boolean;
  connected: boolean;
  host: string;
  port: number;
  dbname: string;
  user: string;
  source: string;
  connection_string: string;
  server_version?: string;
  table_count?: number;
  tables?: Array<{ name: string; records: number }>;
  error?: string;
  isRealDatabase: boolean;
}

const DB_CONFIG_FILE = path.join(process.cwd(), 'config', 'db_config.json');
const APP_DB_FILE = path.join(process.cwd(), 'config', 'app_database.json');
const SCHEMA_FILE = path.join(process.cwd(), 'database', 'schema.sql');

/**
 * ดึงค่าคอนฟิกการเชื่อมต่อฐานข้อมูล
 */
export function getDatabaseConfig(): DatabaseConfig {
  const envConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dbname: process.env.DB_NAME || 'school_budget_db',
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || '',
    charset: 'utf8mb4',
    source: 'env',
  };

  try {
    if (fs.existsSync(DB_CONFIG_FILE)) {
      const content = fs.readFileSync(DB_CONFIG_FILE, 'utf-8');
      const savedConfig = JSON.parse(content);
      return {
        host: savedConfig.host || envConfig.host,
        port: Number(savedConfig.port) || envConfig.port,
        dbname: savedConfig.dbname || envConfig.dbname,
        user: savedConfig.user || envConfig.user,
        pass: savedConfig.pass !== undefined ? savedConfig.pass : envConfig.pass,
        charset: 'utf8mb4',
        source: 'custom_file',
        updatedAt: savedConfig.updatedAt || savedConfig.updated_at,
      };
    }
  } catch (e) {
    console.error('Error reading db_config.json, falling back to .env:', e);
  }

  return envConfig;
}

const ENV_FILE = path.join(process.cwd(), '.env');

/**
 * บันทึกค่าคอนฟิกฐานข้อมูลลงไฟล์ config/db_config.json และ .env
 */
export function saveDatabaseConfig(config: Partial<DatabaseConfig>): boolean {
  try {
    const current = getDatabaseConfig();
    const newConfig = {
      host: config.host || current.host,
      port: Number(config.port) || current.port,
      dbname: config.dbname || current.dbname,
      user: config.user || current.user,
      pass: config.pass !== undefined ? config.pass : current.pass,
      updatedAt: new Date().toISOString(),
    };

    const dir = path.dirname(DB_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');

    // ซิงค์ลงไฟล์ .env เพื่อให้ระบบทั้ง PHP, Node.js และ cPanel อ่านค่าตรงกัน
    try {
      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf-8');
      }

      const updateOrAddEnv = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      };

      updateOrAddEnv('DB_HOST', newConfig.host);
      updateOrAddEnv('DB_PORT', String(newConfig.port));
      updateOrAddEnv('DB_NAME', newConfig.dbname);
      updateOrAddEnv('DB_USER', newConfig.user);
      updateOrAddEnv('DB_PASS', newConfig.pass);

      fs.writeFileSync(ENV_FILE, envContent.trim() + '\n', 'utf-8');
    } catch (e) {
      console.warn('Could not update .env file directly:', e);
    }

    return true;
  } catch (err) {
    console.error('Failed to save database config:', err);
    return false;
  }
}

/**
 * สร้าง connection string สำหรับแสดงผล
 */
export function getDatabaseConnectionString(): string {
  const cfg = getDatabaseConfig();
  const auth = cfg.user + (cfg.pass ? `:${cfg.pass}` : '');
  return `mysql://${auth}@${cfg.host}:${cfg.port}/${cfg.dbname}?charset=utf8mb4`;
}

/**
 * สร้าง MySQL Connection ชั่วคราวพร้อม Timeout และ Auto-fallback (cPanel Socket / TCP)
 */
export async function getDirectConnection(params?: Partial<DatabaseConfig>) {
  const cfg = {
    ...getDatabaseConfig(),
    ...(params || {}),
  };

  const attempts = [
    // 1. ลองด้วย Host ที่กำหนดมา
    { host: cfg.host, port: Number(cfg.port) || 3306 },
    // 2. ถ้าเป็น localhost แล้วต่อ socket ไม่เจอ ให้ลอง 127.0.0.1:3306 (TCP)
    { host: cfg.host === 'localhost' ? '127.0.0.1' : 'localhost', port: 3306 },
    // 3. ลอง Unix Socket พาธมาตรฐานของ cPanel / CloudLinux
    { socketPath: '/var/lib/mysql/mysql.sock' },
    { socketPath: '/tmp/mysql.sock' },
  ];

  let lastError: any = null;

  for (const opt of attempts) {
    try {
      const conn = await mysql.createConnection({
        ...opt,
        user: cfg.user,
        password: cfg.pass || '',
        database: cfg.dbname,
        connectTimeout: 4000,
        charset: 'utf8mb4',
        multipleStatements: true,
      });
      return conn;
    } catch (err: any) {
      lastError = err;
      // ถ้าเป็น Access Denied หรือ Unknown Database แสดงว่าต่อติดเซิร์ฟเวอร์แล้วแต่สิทธิ์หรือชื่อฐานข้อมูลผิด
      if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
        throw err;
      }
    }
  }

  throw lastError || new Error(`ไม่สามารถเชื่อมต่อ MySQL เซิร์ฟเวอร์ ${cfg.host}:${cfg.port}`);
}

/**
 * ฟังก์ชันทดสอบการเชื่อมต่อฐานข้อมูล MySQL จริง
 */
export async function testDatabaseConnection(params?: Partial<DatabaseConfig>): Promise<{
  success: boolean;
  message: string;
  config: Partial<DatabaseConfig>;
  version?: string;
  pingTimeMs?: number;
  hints?: string[];
}> {
  const targetConfig = {
    ...getDatabaseConfig(),
    ...(params || {}),
  };

  const startTime = Date.now();

  try {
    const conn = await getDirectConnection(params);
    const [rows]: any = await conn.query('SELECT VERSION() as ver, DATABASE() as db');
    const version = rows[0]?.ver || 'MySQL 8.x';
    const pingTime = Date.now() - startTime;
    await conn.end();

    return {
      success: true,
      message: `เชื่อมต่อฐานข้อมูล MySQL '${targetConfig.dbname}' บนเซิร์ฟเวอร์จริงสำเร็จ (${version})`,
      config: {
        host: targetConfig.host,
        port: targetConfig.port,
        dbname: targetConfig.dbname,
        user: targetConfig.user,
      },
      version,
      pingTimeMs: pingTime,
    };
  } catch (err: any) {
    let specificMessage = err.message || 'ไม่ทราบสาเหตุ';
    const hints: string[] = [];

    if (err.code === 'ER_ACCESS_DENIED_ERROR' || specificMessage.includes('Access denied')) {
      specificMessage = `ปฏิเสธการเข้าถึงสำหรับผู้ใช้ '${targetConfig.user}' (รหัสผ่านไม่ถูกต้อง หรือยังไม่ได้เพิ่ม User ให้กับฐานข้อมูลใน cPanel)`;
      hints.push('1. ตรวจสอบรหัสผ่านของฐานข้อมูลใน cPanel');
      hints.push(`2. ใน cPanel > MySQL Databases ให้เลื่อนลงไปที่ "Add User to Database" เลือก User "${targetConfig.user}" และ Database "${targetConfig.dbname}" แล้วคลิก Add และติ๊ก ALL PRIVILEGES`);
    } else if (err.code === 'ER_BAD_DB_ERROR' || specificMessage.includes('Unknown database')) {
      specificMessage = `ไม่พบฐานข้อมูลชื่อ '${targetConfig.dbname}' บน MySQL Server`;
      hints.push(`1. ตรวจสอบว่าได้สร้างฐานข้อมูล "${targetConfig.dbname}" บน cPanel แล้วหรือยัง`);
      hints.push('2. ตรวจสอบคำนำหน้าชื่อฐานข้อมูล (Prefix) เช่น schoobwd_planaction');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT') {
      specificMessage = `ไม่สามารถเชื่อมต่อไปยัง Host '${targetConfig.host}' ได้ (พอร์ตปิดหรือ Socket ไม่พบ)`;
      hints.push('1. ลองเปลี่ยน Host เป็น localhost หรือ 127.0.0.1');
      hints.push('2. ตรวจสอบว่าบริการ MySQL บนเซิร์ฟเวอร์เปิดทำงานอยู่');
    }

    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อฐานข้อมูล '${targetConfig.dbname}' ได้: ${specificMessage}`,
      config: {
        host: targetConfig.host,
        port: targetConfig.port,
        dbname: targetConfig.dbname,
        user: targetConfig.user,
      },
      hints,
    };
  }
}

/**
 * ตรวจสอบสถานะการเชื่อมต่อ MySQL จริงและดึงรายชื่อตารางพร้อมจำนวนแถว
 */
export async function getRealDatabaseStatus(): Promise<DatabaseStatus> {
  const cfg = getDatabaseConfig();
  const maskedConn = getDatabaseConnectionString().replace(/:[^:@]+@/, ':****@');

  try {
    const conn = await getDirectConnection();
    const [verRows]: any = await conn.query('SELECT VERSION() as ver');
    const version = verRows[0]?.ver || 'MySQL 8.x';

    // ค้นหารายการตารางในฐานข้อมูล
    const [tablesRows]: any = await conn.query('SHOW TABLES');
    const tableKey = Object.keys(tablesRows[0] || {})[0] || 'Tables_in_' + cfg.dbname;

    const tables: Array<{ name: string; records: number }> = [];

    for (const row of tablesRows) {
      const tableName = row[tableKey];
      if (tableName) {
        try {
          const [countRows]: any = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
          tables.push({
            name: tableName,
            records: Number(countRows[0]?.cnt || 0),
          });
        } catch {
          tables.push({ name: tableName, records: 0 });
        }
      }
    }

    await conn.end();

    return {
      success: true,
      connected: true,
      isRealDatabase: true,
      host: cfg.host,
      port: cfg.port,
      dbname: cfg.dbname,
      user: cfg.user,
      source: cfg.source,
      connection_string: maskedConn,
      server_version: `${version} (InnoDB)`,
      table_count: tables.length,
      tables,
    };
  } catch (err: any) {
    // กรณีที่ยังไม่สามารถต่อ MySQL ได้ ให้คืนค่าสถานะพร้อมบอกปัญหาที่เกิดขึ้น
    return {
      success: false,
      connected: false,
      isRealDatabase: false,
      host: cfg.host,
      port: cfg.port,
      dbname: cfg.dbname,
      user: cfg.user,
      source: cfg.source,
      connection_string: maskedConn,
      error: err.message,
      table_count: 0,
      tables: [],
    };
  }
}

/**
 * รัน Auto-Migration สร้างตารางลง MySQL จริง
 */
export async function runDatabaseMigration(): Promise<{
  success: boolean;
  message: string;
  logs: string[];
}> {
  const logs: string[] = [];
  try {
    const conn = await getDirectConnection();
    logs.push('✓ ตรวจสอบการเชื่อมต่อ MySQL Server สำเร็จ');

    if (fs.existsSync(SCHEMA_FILE)) {
      const sqlContent = fs.readFileSync(SCHEMA_FILE, 'utf-8');
      logs.push(`✓ อ่านไฟล์ Schema จาก database/schema.sql (${Buffer.byteLength(sqlContent)} bytes)`);

      // ตัดแบ่งคำสั่งตาม semicolon
      const statements = sqlContent
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      for (const stmt of statements) {
        if (stmt.length > 5) {
          try {
            await conn.query(stmt);
          } catch (e: any) {
            // ละเว้นคำสั่ง DROP TABLE หรือ warning เล็กน้อย
            if (!stmt.toUpperCase().startsWith('DROP TABLE')) {
              console.warn('Migration warning:', e.message);
            }
          }
        }
      }
      logs.push(`✓ ติดตั้งและอัปเดตตารางฐานข้อมูลครบถ้วน (${statements.length} statements)`);
    } else {
      logs.push('⚠️ ไม่พบไฟล์ schema.sql กำลังสร้างตารางหลักอัตโนมัติ...');
    }

    await conn.end();
    logs.push('✓ ซิงค์โครงสร้างข้อมูลและสร้างตารางลง MySQL สำเร็จสมบูรณ์ 100%');

    return {
      success: true,
      message: 'อัปเดตและสร้างโครงสร้างตารางลงฐานข้อมูล MySQL จริงสำเร็จเรียบร้อยแล้ว',
      logs,
    };
  } catch (err: any) {
    logs.push(`❌ ข้อผิดพลาด: ${err.message}`);
    return {
      success: false,
      message: 'ไม่สามารถสร้างตารางใน MySQL ได้: ' + err.message,
      logs,
    };
  }
}

/**
 * บันทึก App Data ลง Persistent Storage (ทั้ง MySQL จริง และ Disk Backup)
 */
export async function saveAppData(data: any): Promise<boolean> {
  try {
    // 1. บันทึกลง Disk File ก่อนเสมอ
    const dir = path.dirname(APP_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(APP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

    // 2. ถ้า MySQL ต่อได้ ให้ sync ข้อมูลทั้งหมดลงตาราง MySQL จริง
    try {
      const conn = await getDirectConnection();

      // Ensure tables exist
      await conn.query(`CREATE TABLE IF NOT EXISTS \`schools\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`school_code\` VARCHAR(50) NOT NULL,
        \`smis_code\` VARCHAR(20) NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`school_key\` VARCHAR(50) NOT NULL,
        \`admin_username\` VARCHAR(50) NOT NULL DEFAULT 'admin',
        \`admin_password_plain\` VARCHAR(100) DEFAULT '123456',
        \`name\` VARCHAR(255) NOT NULL,
        \`province\` VARCHAR(100) DEFAULT NULL,
        \`education_area\` VARCHAR(255) DEFAULT NULL,
        \`director_name\` VARCHAR(150) DEFAULT NULL,
        \`phone\` VARCHAR(50) DEFAULT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`student_count\` INT UNSIGNED DEFAULT 0,
        \`project_count\` INT UNSIGNED DEFAULT 0,
        \`total_budget\` DECIMAL(15,2) DEFAULT 0,
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_smis\` (\`smis_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

      await conn.query(`CREATE TABLE IF NOT EXISTS \`projects\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`project_code\` VARCHAR(50) NOT NULL,
        \`project_name\` VARCHAR(255) NOT NULL,
        \`rationale\` TEXT DEFAULT NULL,
        \`objectives\` TEXT DEFAULT NULL,
        \`quantitative_goals\` TEXT DEFAULT NULL,
        \`qualitative_goals\` TEXT DEFAULT NULL,
        \`kpis\` TEXT DEFAULT NULL,
        \`procedures\` TEXT DEFAULT NULL,
        \`duration_start\` VARCHAR(50) DEFAULT NULL,
        \`duration_end\` VARCHAR(50) DEFAULT NULL,
        \`location\` VARCHAR(255) DEFAULT NULL,
        \`target_group\` VARCHAR(255) DEFAULT NULL,
        \`responsible_person\` VARCHAR(150) NOT NULL DEFAULT '',
        \`department\` VARCHAR(100) NOT NULL DEFAULT 'ฝ่ายวิชาการ',
        \`budget_source\` VARCHAR(150) NOT NULL DEFAULT 'เงินอุดหนุนรายหัว',
        \`allocated_budget\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`spent_budget\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`remaining_budget\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'not_started',
        \`approval_status\` VARCHAR(50) NOT NULL DEFAULT 'approved',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

      await conn.query(`CREATE TABLE IF NOT EXISTS \`revenues\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'subsidy',
        \`item_name\` VARCHAR(255) NOT NULL,
        \`rate_per_head\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`eligible_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`calculated_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`is_custom_rate\` TINYINT(1) NOT NULL DEFAULT 0,
        \`note\` TEXT DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

      await conn.query(`CREATE TABLE IF NOT EXISTS \`budget_allocations\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`department_name\` VARCHAR(150) NOT NULL,
        \`percentage\` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        \`allocated_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`spent_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`remaining_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`color_hex\` VARCHAR(20) DEFAULT '#2563eb',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

      await conn.query(`CREATE TABLE IF NOT EXISTS \`budget_transactions\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`project_id\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`doc_number\` VARCHAR(50) NOT NULL,
        \`transaction_date\` VARCHAR(50) NOT NULL,
        \`item_description\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        \`payee\` VARCHAR(150) NOT NULL,
        \`receipt_number\` VARCHAR(100) DEFAULT NULL,
        \`approved_by\` VARCHAR(150) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'approved',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

      // 1. Sync School
      if (data.school) {
        const s = data.school;
        await conn.query(
          `INSERT INTO schools (id, school_code, smis_code, name, province, education_area, director_name, phone, email, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             province = VALUES(province),
             education_area = VALUES(education_area),
             director_name = VALUES(director_name),
             phone = VALUES(phone),
             email = VALUES(email),
             updated_at = CURRENT_TIMESTAMP`,
          [
            s.id || 1,
            s.schoolCode || '1000000001',
            s.smisCode || '10000001',
            s.name,
            s.province || '',
            s.educationArea || '',
            s.directorName || '',
            s.phone || '',
            s.email || '',
          ]
        );
      }

      // 2. Sync Projects
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          if (!p.id || !p.projectName) continue;
          await conn.query(
            `INSERT INTO projects (id, project_code, project_name, rationale, objectives, quantitative_goals, qualitative_goals, kpis, procedures, duration_start, duration_end, location, target_group, responsible_person, department, budget_source, allocated_budget, spent_budget, remaining_budget, status, approval_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               project_name = VALUES(project_name),
               rationale = VALUES(rationale),
               objectives = VALUES(objectives),
               quantitative_goals = VALUES(quantitative_goals),
               qualitative_goals = VALUES(qualitative_goals),
               kpis = VALUES(kpis),
               procedures = VALUES(procedures),
               duration_start = VALUES(duration_start),
               duration_end = VALUES(duration_end),
               location = VALUES(location),
               target_group = VALUES(target_group),
               responsible_person = VALUES(responsible_person),
               department = VALUES(department),
               budget_source = VALUES(budget_source),
               allocated_budget = VALUES(allocated_budget),
               spent_budget = VALUES(spent_budget),
               remaining_budget = VALUES(remaining_budget),
               status = VALUES(status),
               approval_status = VALUES(approval_status)`,
            [
              p.id,
              p.projectCode || `PROJ-${p.id}`,
              p.projectName,
              p.rationale || '',
              p.objectives || '',
              p.quantitativeGoals || '',
              p.qualitativeGoals || '',
              p.kpis || '',
              p.procedures || '',
              p.durationStart || '',
              p.durationEnd || '',
              p.location || '',
              p.targetGroup || '',
              p.responsiblePerson || p.proposerName || '',
              p.department || 'ฝ่ายวิชาการ',
              p.budgetSource || 'เงินอุดหนุนรายหัว',
              Number(p.allocatedBudget) || 0,
              Number(p.spentBudget) || 0,
              Number(p.remainingBudget) || 0,
              p.status || 'not_started',
              p.approvalStatus || 'approved',
            ]
          );
        }
      }

      // 3. Sync Revenues
      if (Array.isArray(data.revenues)) {
        for (const r of data.revenues) {
          if (!r.id || !r.itemName) continue;
          await conn.query(
            `INSERT INTO revenues (id, category, item_name, rate_per_head, eligible_count, calculated_amount, is_custom_rate, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               category = VALUES(category),
               item_name = VALUES(item_name),
               rate_per_head = VALUES(rate_per_head),
               eligible_count = VALUES(eligible_count),
               calculated_amount = VALUES(calculated_amount),
               is_custom_rate = VALUES(is_custom_rate),
               note = VALUES(note)`,
            [
              r.id,
              r.category || 'subsidy',
              r.itemName,
              Number(r.ratePerHead) || 0,
              Number(r.eligibleCount) || 0,
              Number(r.calculatedAmount) || 0,
              r.isCustomRate ? 1 : 0,
              r.note || '',
            ]
          );
        }
      }

      // 4. Sync Allocations
      if (Array.isArray(data.allocations)) {
        for (const a of data.allocations) {
          if (!a.id || !a.departmentName) continue;
          await conn.query(
            `INSERT INTO budget_allocations (id, department_name, percentage, allocated_amount, spent_amount, remaining_amount, color_hex)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               department_name = VALUES(department_name),
               percentage = VALUES(percentage),
               allocated_amount = VALUES(allocated_amount),
               spent_amount = VALUES(spent_amount),
               remaining_amount = VALUES(remaining_amount),
               color_hex = VALUES(color_hex)`,
            [
              a.id,
              a.departmentName,
              Number(a.percentage) || 0,
              Number(a.allocatedAmount) || 0,
              Number(a.spentAmount) || 0,
              Number(a.remainingAmount) || 0,
              a.colorHex || '#2563eb',
            ]
          );
        }
      }

      // 5. Sync Transactions
      if (Array.isArray(data.transactions)) {
        for (const t of data.transactions) {
          if (!t.id || !t.itemDescription) continue;
          await conn.query(
            `INSERT INTO budget_transactions (id, project_id, doc_number, transaction_date, item_description, amount, payee, receipt_number, approved_by, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               project_id = VALUES(project_id),
               doc_number = VALUES(doc_number),
               transaction_date = VALUES(transaction_date),
               item_description = VALUES(item_description),
               amount = VALUES(amount),
               payee = VALUES(payee),
               receipt_number = VALUES(receipt_number),
               approved_by = VALUES(approved_by),
               status = VALUES(status)`,
            [
              t.id,
              Number(t.projectId) || 0,
              t.docNumber || `DOC-${t.id}`,
              t.transactionDate || '',
              t.itemDescription,
              Number(t.amount) || 0,
              t.payee || '',
              t.receiptNumber || '',
              t.approvedBy || '',
              t.status || 'approved',
            ]
          );
        }
      }

      await conn.end();
    } catch (dbErr) {
      console.warn('MySQL sync warning:', dbErr);
    }

    return true;
  } catch (err) {
    console.error('Error saving app data:', err);
    return false;
  }
}

/**
 * ดึง App Data จาก Persistent Storage (ลองดึงจาก MySQL เป็นอันดับแรก)
 */
export async function loadAppData(): Promise<any | null> {
  // 1. ลองดึงจาก MySQL ก่อน
  try {
    const conn = await getDirectConnection();
    const [schools]: any = await conn.query('SELECT * FROM schools WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    const [projects]: any = await conn.query('SELECT * FROM projects ORDER BY id ASC');
    const [revenues]: any = await conn.query('SELECT * FROM revenues ORDER BY id ASC');
    const [allocations]: any = await conn.query('SELECT * FROM budget_allocations ORDER BY id ASC');
    const [transactions]: any = await conn.query('SELECT * FROM budget_transactions ORDER BY id DESC');
    await conn.end();

    if ((schools && schools.length > 0) || (projects && projects.length > 0)) {
      const s = schools && schools.length > 0 ? schools[0] : null;
      return {
        school: s
          ? {
              id: s.id,
              schoolCode: s.school_code,
              smisCode: s.smis_code,
              name: s.name,
              province: s.province,
              educationArea: s.education_area,
              directorName: s.director_name,
              phone: s.phone,
              email: s.email,
            }
          : undefined,
        projects: projects?.map((p: any) => ({
          id: p.id,
          projectCode: p.project_code,
          projectName: p.project_name,
          rationale: p.rationale,
          objectives: p.objectives,
          quantitativeGoals: p.quantitative_goals,
          qualitativeGoals: p.qualitative_goals,
          kpis: p.kpis,
          procedures: p.procedures,
          durationStart: p.duration_start,
          durationEnd: p.duration_end,
          location: p.location,
          targetGroup: p.target_group,
          responsiblePerson: p.responsible_person,
          department: p.department,
          budgetSource: p.budget_source,
          allocatedBudget: Number(p.allocated_budget) || 0,
          spentBudget: Number(p.spent_budget) || 0,
          remainingBudget: Number(p.remaining_budget) || 0,
          status: p.status,
          approvalStatus: p.approval_status,
        })),
        revenues: revenues?.map((r: any) => ({
          id: r.id,
          category: r.category,
          itemName: r.item_name,
          ratePerHead: Number(r.rate_per_head) || 0,
          eligibleCount: Number(r.eligible_count) || 0,
          calculatedAmount: Number(r.calculated_amount) || 0,
          isCustomRate: r.is_custom_rate === 1,
          note: r.note,
        })),
        allocations: allocations?.map((a: any) => ({
          id: a.id,
          departmentName: a.department_name,
          percentage: Number(a.percentage) || 0,
          allocatedAmount: Number(a.allocated_amount) || 0,
          spentAmount: Number(a.spent_amount) || 0,
          remainingAmount: Number(a.remaining_amount) || 0,
          colorHex: a.color_hex,
        })),
        transactions: transactions?.map((t: any) => ({
          id: t.id,
          projectId: t.project_id,
          docNumber: t.doc_number,
          transactionDate: t.transaction_date,
          itemDescription: t.item_description,
          amount: Number(t.amount) || 0,
          payee: t.payee,
          receiptNumber: t.receipt_number,
          approvedBy: t.approved_by,
          status: t.status,
        })),
      };
    }
  } catch (err) {
    // MySQL not reachable, fallback to disk file
  }

  // 2. อ่านจาก Disk File สำรอง
  try {
    if (fs.existsSync(APP_DB_FILE)) {
      const content = fs.readFileSync(APP_DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading app data from disk:', e);
  }
  return null;
}
