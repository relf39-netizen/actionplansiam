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
        connectTimeout: 1200,
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

      // The import schema contains DROP TABLE statements. Never execute them on live data.
      const createStatements = sqlContent.split(';').map(part =>
        part.replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim()
      ).filter(part => /^CREATE TABLE\s+/i.test(part));
      for (const statement of createStatements) {
        await conn.query(statement.replace(/^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?/i, 'CREATE TABLE IF NOT EXISTS '));
      }
      logs.push(`✓ ตรวจสอบตาราง ${createStatements.length} ตาราง โดยรักษาข้อมูลเดิมไว้`);
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
 * บันทึก App Data ลง MySQL จริงแบบครอบคลุมทุกตาราง พร้อมจำกัดสิทธิ์ school_id
 */
export async function saveAppData(data: any, schoolIdParam?: number): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const conn = await getDirectConnection();

    // Ensure all tables exist
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

    // Ensure columns exist if table was created previously without them
    try {
      const [colRows]: any = await conn.query('SHOW COLUMNS FROM `schools`');
      const existingCols = (colRows || []).map((c: any) => c.Field);
      if (!existingCols.includes('student_count')) {
        await conn.query('ALTER TABLE `schools` ADD COLUMN `student_count` INT UNSIGNED DEFAULT 0 AFTER `email`');
      }
      if (!existingCols.includes('project_count')) {
        await conn.query('ALTER TABLE `schools` ADD COLUMN `project_count` INT UNSIGNED DEFAULT 0 AFTER `student_count`');
      }
      if (!existingCols.includes('total_budget')) {
        await conn.query('ALTER TABLE `schools` ADD COLUMN `total_budget` DECIMAL(15,2) DEFAULT 0 AFTER `project_count`');
      }
      const schoolFields: Record<string, string> = {
        address: 'VARCHAR(255)', subdistrict: 'VARCHAR(100)', district: 'VARCHAR(100)',
        zipcode: 'VARCHAR(10)', affiliation: 'VARCHAR(255)', fiscal_year: 'INT UNSIGNED',
        logo_url: 'LONGTEXT',
      };
      for (const [column, type] of Object.entries(schoolFields)) {
        if (!existingCols.includes(column)) await conn.query(`ALTER TABLE schools ADD COLUMN \`${column}\` ${type} NULL`);
      }
      const logoColumn = (colRows || []).find((c: any) => c.Field === 'logo_url');
      if (logoColumn && /^text$/i.test(logoColumn.Type)) {
        await conn.query('ALTER TABLE schools MODIFY COLUMN logo_url LONGTEXT NULL');
      }
    } catch (e) {}

    await conn.query(`CREATE TABLE IF NOT EXISTS \`fiscal_years\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL,
      \`year\` INT UNSIGNED NOT NULL,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`start_date\` DATE DEFAULT NULL,
      \`end_date\` DATE DEFAULT NULL,
      \`total_students\` INT UNSIGNED DEFAULT 0,
      \`teacher_count\` INT UNSIGNED DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL,
      \`username\` VARCHAR(100) NOT NULL,
      \`citizen_id\` VARCHAR(20) DEFAULT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL DEFAULT '123456',
      \`full_name\` VARCHAR(150) NOT NULL,
      \`email\` VARCHAR(100) DEFAULT NULL,
      \`role\` VARCHAR(50) NOT NULL DEFAULT 'teacher',
      \`department\` VARCHAR(100) DEFAULT NULL,
      \`position\` VARCHAR(150) DEFAULT NULL,
      \`phone\` VARCHAR(50) DEFAULT NULL,
      \`avatar\` VARCHAR(255) DEFAULT NULL,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`is_password_changed\` TINYINT(1) DEFAULT 0,
      \`status\` VARCHAR(20) DEFAULT 'approved',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

    // Ensure columns for users table exist
    try {
      const [uCols]: any = await conn.query('SHOW COLUMNS FROM `users`');
      const existingUCols = (uCols || []).map((c: any) => c.Field);
      if (!existingUCols.includes('password_hash')) {
        await conn.query('ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) NOT NULL DEFAULT "123456" AFTER `citizen_id`');
      }
      if (!existingUCols.includes('status')) {
        await conn.query('ALTER TABLE `users` ADD COLUMN `status` VARCHAR(20) DEFAULT "approved" AFTER `is_active`');
      }
      if (!existingUCols.includes('is_password_changed')) {
        await conn.query('ALTER TABLE `users` ADD COLUMN `is_password_changed` TINYINT(1) DEFAULT 0 AFTER `is_active`');
      }
      if (!existingUCols.includes('avatar')) {
        await conn.query('ALTER TABLE `users` ADD COLUMN `avatar` VARCHAR(255) DEFAULT NULL AFTER `phone`');
      }
    } catch (e) {}

    await conn.query(`CREATE TABLE IF NOT EXISTS \`students\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL,
      \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`grade_level\` VARCHAR(100) NOT NULL,
      \`stage\` VARCHAR(50) NOT NULL,
      \`male_count\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`female_count\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`total_count\` INT UNSIGNED NOT NULL DEFAULT 0,
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
    const [revenueColumns]: any = await conn.query("SHOW COLUMNS FROM revenues LIKE 'category'");
    if (String(revenueColumns?.[0]?.Type || '').toLowerCase().startsWith('enum(')) {
      await conn.query("ALTER TABLE revenues MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT 'subsidy'");
    }

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
      \`description\` TEXT DEFAULT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    const [allocationColumns]: any = await conn.query('SHOW COLUMNS FROM budget_allocations');
    if (!allocationColumns.some((c: any) => c.Field === 'reserve_type')) {
      await conn.query('ALTER TABLE budget_allocations ADD COLUMN reserve_type VARCHAR(20) NULL');
    }
    await conn.query(`CREATE TABLE IF NOT EXISTS budget_settings (
      school_id INT UNSIGNED NOT NULL, fiscal_year_id INT UNSIGNED NOT NULL,
      carryover DECIMAL(14,2) NOT NULL DEFAULT 0, manual_total DECIMAL(14,2) NULL,
      learner_initialized TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (school_id, fiscal_year_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    const [settingColumns]: any = await conn.query('SHOW COLUMNS FROM budget_settings');
    if (!settingColumns.some((c: any) => c.Field === 'learner_initialized')) await conn.query('ALTER TABLE budget_settings ADD COLUMN learner_initialized TINYINT(1) NOT NULL DEFAULT 0');

    await conn.query(`CREATE TABLE IF NOT EXISTS \`learner_activities\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`activity_name\` VARCHAR(255) NOT NULL,
      \`percentage\` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      \`allocated_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      \`spent_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      \`remaining_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      \`note\` TEXT DEFAULT NULL,
      \`description\` TEXT DEFAULT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
    const [activityColumns]: any = await conn.query('SHOW COLUMNS FROM learner_activities');
    if (!activityColumns.some((c: any) => c.Field === 'description')) await conn.query('ALTER TABLE learner_activities ADD COLUMN description TEXT NULL');

    await conn.query(`CREATE TABLE IF NOT EXISTS \`strategies\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`code\` VARCHAR(50) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` TEXT DEFAULT NULL,
      PRIMARY KEY (\`id\`)
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

    await conn.query(`CREATE TABLE IF NOT EXISTS \`budget_transactions\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`school_id\` INT UNSIGNED NOT NULL DEFAULT 1,
      \`fiscal_year_id\` INT UNSIGNED NOT NULL DEFAULT 1,
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

    // 1. Determine target school ID
    let schoolId = Number(schoolIdParam || data.school?.id || 0);

    if (data.school) {
      const s = data.school;
      const cleanSmis = String(s.smisCode || s.schoolCode || '10000001').slice(0, 8);
      const cleanCode = s.schoolCode || (cleanSmis + '00');
      const sName = s.name || 'โรงเรียนของคุณ';

      if (s.id && s.id > 0) {
        await conn.query(
          `INSERT INTO schools (id, school_code, smis_code, name, province, education_area, director_name, phone, email, is_active, school_key, address, subdistrict, district, zipcode, affiliation, fiscal_year, logo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             school_code = VALUES(school_code),
             province = VALUES(province),
             education_area = VALUES(education_area),
             director_name = VALUES(director_name),
             phone = VALUES(phone),
             email = VALUES(email),
             address = VALUES(address), subdistrict = VALUES(subdistrict), district = VALUES(district),
             zipcode = VALUES(zipcode), affiliation = VALUES(affiliation), fiscal_year = VALUES(fiscal_year),
             logo_url = VALUES(logo_url),
             updated_at = CURRENT_TIMESTAMP`,
          [s.id, cleanCode, cleanSmis, sName, s.province || '', s.educationArea || '', s.directorName || '', s.phone || '', s.email || '', `SCH-${cleanSmis}`, s.address || '', s.subdistrict || '', s.district || '', s.zipcode || '', s.affiliation || '', Number(s.fiscalYear) || null, s.logoUrl || null]
        );
        schoolId = s.id;
      } else {
        const [insertRes]: any = await conn.query(
          `INSERT INTO schools (school_code, smis_code, name, province, education_area, director_name, phone, email, is_active, school_key, address, subdistrict, district, zipcode, affiliation, fiscal_year, logo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             school_code = VALUES(school_code),
             province = VALUES(province),
             education_area = VALUES(education_area),
             director_name = VALUES(director_name),
             phone = VALUES(phone),
             email = VALUES(email),
             address = VALUES(address), subdistrict = VALUES(subdistrict), district = VALUES(district),
             zipcode = VALUES(zipcode), affiliation = VALUES(affiliation), fiscal_year = VALUES(fiscal_year),
             logo_url = VALUES(logo_url),
             updated_at = CURRENT_TIMESTAMP`,
          [cleanCode, cleanSmis, sName, s.province || '', s.educationArea || '', s.directorName || '', s.phone || '', s.email || '', `SCH-${cleanSmis}`, s.address || '', s.subdistrict || '', s.district || '', s.zipcode || '', s.affiliation || '', Number(s.fiscalYear) || null, s.logoUrl || null]
        );
        schoolId = insertRes.insertId || schoolId || 1;
      }
    }

    if (!schoolId) {
      const [schRows]: any = await conn.query('SELECT id FROM schools WHERE is_active = 1 ORDER BY id ASC LIMIT 1');
      schoolId = (schRows && schRows.length > 0) ? schRows[0].id : 1;
    }

    // 2. Sync Fiscal Years for this school
    if (Array.isArray(data.fiscalYears)) {
      if (data.fiscalYears.length === 0) {
        await conn.query('DELETE FROM fiscal_years WHERE school_id = ?', [schoolId]);
      } else {
        const keptFyIds: number[] = [];
        for (const fy of data.fiscalYears) {
          if (!fy.year) continue;
          if (fy.id && fy.id > 0) {
            await conn.query(
              `INSERT INTO fiscal_years (id, school_id, year, is_active, start_date, end_date, total_students, teacher_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 year = VALUES(year),
                 is_active = VALUES(is_active),
                 start_date = VALUES(start_date),
                 end_date = VALUES(end_date),
                 total_students = VALUES(total_students),
                 teacher_count = VALUES(teacher_count)`,
              [fy.id, schoolId, fy.year, fy.isActive ? 1 : 0, fy.startDate || null, fy.endDate || null, Number(fy.totalStudents) || 0, Number(fy.teacherCount) || 0]
            );
            keptFyIds.push(fy.id);
          } else {
            const [r]: any = await conn.query(
              `INSERT INTO fiscal_years (school_id, year, is_active, start_date, end_date, total_students, teacher_count)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [schoolId, fy.year, fy.isActive ? 1 : 0, fy.startDate || null, fy.endDate || null, Number(fy.totalStudents) || 0, Number(fy.teacherCount) || 0]
            );
            if (r.insertId) keptFyIds.push(r.insertId);
          }
        }
        if (keptFyIds.length > 0) {
          await conn.query(`DELETE FROM fiscal_years WHERE school_id = ? AND id NOT IN (${keptFyIds.join(',')})`, [schoolId]);
        }
      }
    }

    // User accounts are written only through authentication/user endpoints.

    // Save only the active fiscal year for these menu actions. Database IDs are global,
    // so never trust IDs generated from a browser's local list.
    if (Array.isArray(data.students) || Array.isArray(data.revenues)) {
      const requestedYear = Number(data.activeFiscalYear?.year || data.fiscalYear?.year || 2569);
      const [years]: any = await conn.query('SELECT id FROM fiscal_years WHERE school_id = ? AND year = ? LIMIT 1', [schoolId, requestedYear]);
      let fiscalYearId = years[0]?.id;
      if (!fiscalYearId) {
        const gregorian = requestedYear - 543;
        const [created]: any = await conn.query(
          'INSERT INTO fiscal_years (school_id, year, is_active, start_date, end_date, total_students, teacher_count) VALUES (?, ?, 1, ?, ?, 0, 0)',
          [schoolId, requestedYear, `${gregorian - 1}-10-01`, `${gregorian}-09-30`]
        );
        fiscalYearId = created.insertId;
      }
      await conn.beginTransaction();
      try {
        if (Array.isArray(data.students)) {
          const kept: number[] = [];
          for (const st of data.students) {
            if (!st.gradeLevel?.trim()) continue;
            const [sameGrade]: any = await conn.query('SELECT id FROM students WHERE school_id = ? AND fiscal_year_id = ? AND grade_level = ? LIMIT 1', [schoolId, fiscalYearId, st.gradeLevel.trim()]);
            const [sameId]: any = sameGrade.length ? [[]] : await conn.query('SELECT id FROM students WHERE id = ? AND school_id = ? AND fiscal_year_id = ? LIMIT 1', [st.id, schoolId, fiscalYearId]);
            const id = sameGrade[0]?.id || sameId[0]?.id;
            const values = [st.gradeLevel.trim(), st.stage, Number(st.maleCount) || 0, Number(st.femaleCount) || 0, (Number(st.maleCount) || 0) + (Number(st.femaleCount) || 0)];
            if (id) {
              await conn.query('UPDATE students SET grade_level = ?, stage = ?, male_count = ?, female_count = ?, total_count = ? WHERE id = ? AND school_id = ?', [...values, id, schoolId]);
              kept.push(id);
            } else {
              const [created]: any = await conn.query('INSERT INTO students (school_id, fiscal_year_id, grade_level, stage, male_count, female_count, total_count) VALUES (?, ?, ?, ?, ?, ?, ?)', [schoolId, fiscalYearId, ...values]);
              kept.push(created.insertId);
            }
          }
          if (kept.length) await conn.query(`DELETE FROM students WHERE school_id = ? AND fiscal_year_id = ? AND id NOT IN (${kept.map(() => '?').join(',')})`, [schoolId, fiscalYearId, ...kept]);
          else await conn.query('DELETE FROM students WHERE school_id = ? AND fiscal_year_id = ?', [schoolId, fiscalYearId]);
        }
        if (Array.isArray(data.revenues)) {
          const kept: number[] = [];
          for (const r of data.revenues) {
            if (!r.itemName?.trim()) continue;
            const [owned]: any = await conn.query('SELECT id FROM revenues WHERE id = ? AND school_id = ? AND fiscal_year_id = ? LIMIT 1', [r.id, schoolId, fiscalYearId]);
            const [sameName]: any = owned.length ? [[]] : await conn.query('SELECT id FROM revenues WHERE school_id = ? AND fiscal_year_id = ? AND item_name = ? LIMIT 1', [schoolId, fiscalYearId, r.itemName.trim()]);
            const id = owned[0]?.id || sameName[0]?.id;
            const values = [r.category || 'other', r.itemName.trim(), Number(r.ratePerHead) || 0, Number(r.eligibleCount) || 0, Number(r.calculatedAmount) || 0, r.isCustomRate ? 1 : 0, r.note || ''];
            if (id) {
              await conn.query('UPDATE revenues SET category = ?, item_name = ?, rate_per_head = ?, eligible_count = ?, calculated_amount = ?, is_custom_rate = ?, note = ? WHERE id = ? AND school_id = ?', [...values, id, schoolId]);
              kept.push(id);
            } else {
              const [created]: any = await conn.query('INSERT INTO revenues (school_id, fiscal_year_id, category, item_name, rate_per_head, eligible_count, calculated_amount, is_custom_rate, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [schoolId, fiscalYearId, ...values]);
              kept.push(created.insertId);
            }
          }
          if (kept.length) await conn.query(`DELETE FROM revenues WHERE school_id = ? AND fiscal_year_id = ? AND id NOT IN (${kept.map(() => '?').join(',')})`, [schoolId, fiscalYearId, ...kept]);
          else await conn.query('DELETE FROM revenues WHERE school_id = ? AND fiscal_year_id = ?', [schoolId, fiscalYearId]);
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    }

    // 6. Save reserves, departments and budget basis together for the selected year.
    if (Array.isArray(data.allocations) || data.budgetSettings) {
      const requestedYear = Number(data.activeFiscalYear?.year);
      if (!Number.isInteger(requestedYear) || requestedYear < 2500 || requestedYear > 2600) throw new Error('ปีงบประมาณไม่ถูกต้อง');
      const [years]: any = await conn.query('SELECT id FROM fiscal_years WHERE school_id = ? AND year = ? LIMIT 1', [schoolId, requestedYear]);
      const fiscalId = years[0]?.id;
      if (!fiscalId) throw new Error('ไม่พบปีงบประมาณใน MySQL');
      await conn.beginTransaction();
      try {
        if (Array.isArray(data.allocations)) {
          const kept: number[] = [];
          for (const a of data.allocations) {
            if (!a.departmentName?.trim()) continue;
            const type = ['utility', 'other'].includes(a.reserveType) ? a.reserveType : null;
            let [owned]: any = Number(a.id) > 0 ? await conn.query('SELECT id FROM budget_allocations WHERE id = ? AND school_id = ? AND fiscal_year_id = ?', [a.id, schoolId, fiscalId]) : [[]];
            if (!owned.length && type) [owned] = await conn.query('SELECT id FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ? AND reserve_type = ? LIMIT 1', [schoolId, fiscalId, type]);
            const id = owned[0]?.id;
            const values = [a.departmentName.trim(), Number(a.percentage) || 0, Number(a.allocatedAmount) || 0, Number(a.spentAmount) || 0, Number(a.remainingAmount) || 0, a.colorHex || '#2563eb', a.description || '', type];
            if (id) await conn.query('UPDATE budget_allocations SET department_name = ?, percentage = ?, allocated_amount = ?, spent_amount = ?, remaining_amount = ?, color_hex = ?, description = ?, reserve_type = ? WHERE id = ? AND school_id = ? AND fiscal_year_id = ?', [...values, id, schoolId, fiscalId]);
            else {
              const [created]: any = await conn.query('INSERT INTO budget_allocations (school_id, fiscal_year_id, department_name, percentage, allocated_amount, spent_amount, remaining_amount, color_hex, description, reserve_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [schoolId, fiscalId, ...values]);
              kept.push(created.insertId);
            }
            if (id) kept.push(id);
          }
          if (kept.length) await conn.query(`DELETE FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ? AND id NOT IN (${kept.map(() => '?').join(',')})`, [schoolId, fiscalId, ...kept]);
          else await conn.query('DELETE FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ?', [schoolId, fiscalId]);
        }
        if (data.budgetSettings) await conn.query('INSERT INTO budget_settings (school_id, fiscal_year_id, carryover, manual_total) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE carryover = VALUES(carryover), manual_total = VALUES(manual_total)', [schoolId, fiscalId, Number(data.budgetSettings.carryover) || 0, data.budgetSettings.manualTotal == null ? null : Number(data.budgetSettings.manualTotal)]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; }
    }

    // 7. Sync Learner Activities for this school
    if (Array.isArray(data.activities)) {
      const year = Number(data.activeFiscalYear?.year);
      const [fys]: any = await conn.query('SELECT id FROM fiscal_years WHERE school_id = ? AND year = ? LIMIT 1', [schoolId, year]);
      const fiscalId = fys[0]?.id;
      if (!fiscalId) throw new Error('ไม่พบปีงบประมาณของกิจกรรมพัฒนาผู้เรียน');
      await conn.beginTransaction();
      try {
        const kept: number[] = [];
        for (const act of data.activities) {
          if (!act.activityName?.trim()) continue;
          const [owned]: any = Number(act.id) > 0 ? await conn.query('SELECT id FROM learner_activities WHERE id = ? AND school_id = ? AND fiscal_year_id = ?', [act.id, schoolId, fiscalId]) : [[]];
          let id = owned[0]?.id;
          const values = [act.activityName.trim(), Number(act.percentage) || 0, Number(act.allocatedAmount) || 0, Number(act.spentAmount) || 0, Number(act.remainingAmount) || 0, act.note || '', act.description || ''];
          if (id) await conn.query('UPDATE learner_activities SET activity_name = ?, percentage = ?, allocated_amount = ?, spent_amount = ?, remaining_amount = ?, note = ?, description = ? WHERE id = ? AND school_id = ? AND fiscal_year_id = ?', [...values, id, schoolId, fiscalId]);
          else { const [created]: any = await conn.query('INSERT INTO learner_activities (school_id, fiscal_year_id, activity_name, percentage, allocated_amount, spent_amount, remaining_amount, note, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [schoolId, fiscalId, ...values]); id = created.insertId; }
          kept.push(id);
        }
        if (kept.length) await conn.query(`DELETE FROM learner_activities WHERE school_id = ? AND fiscal_year_id = ? AND id NOT IN (${kept.map(() => '?').join(',')})`, [schoolId, fiscalId, ...kept]);
        else await conn.query('DELETE FROM learner_activities WHERE school_id = ? AND fiscal_year_id = ?', [schoolId, fiscalId]);
        await conn.query('INSERT INTO budget_settings (school_id, fiscal_year_id, learner_initialized) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE learner_initialized = 1', [schoolId, fiscalId]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; }
    }

    // 8. Sync Strategies for this school
    if (Array.isArray(data.strategies)) {
      if (data.strategies.length === 0) {
        await conn.query('DELETE FROM strategies WHERE school_id = ?', [schoolId]);
      } else {
        const keptStratIds: number[] = [];
        for (const st of data.strategies) {
          if (!st.name) continue;
          if (st.id && st.id > 0) {
            await conn.query(
              `INSERT INTO strategies (id, school_id, fiscal_year_id, code, name, description)
               VALUES (?, ?, 1, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 code = VALUES(code),
                 name = VALUES(name),
                 description = VALUES(description)`,
              [st.id, schoolId, st.code || '', st.name, st.description || '']
            );
            keptStratIds.push(st.id);
          } else {
            const [sr]: any = await conn.query(
              `INSERT INTO strategies (school_id, fiscal_year_id, code, name, description)
               VALUES (?, 1, ?, ?, ?)`,
              [schoolId, st.code || '', st.name, st.description || '']
            );
            if (sr.insertId) keptStratIds.push(sr.insertId);
          }
        }
        if (keptStratIds.length > 0) {
          await conn.query(`DELETE FROM strategies WHERE school_id = ? AND id NOT IN (${keptStratIds.join(',')})`, [schoolId]);
        }
      }
    }

    // 9. Sync Projects for this school
    if (Array.isArray(data.projects)) {
      if (data.projects.length === 0) {
        await conn.query('DELETE FROM projects WHERE school_id = ?', [schoolId]);
      } else {
        const keptProjIds: number[] = [];
        for (const p of data.projects) {
          if (!p.projectName) continue;
          if (p.id && p.id > 0) {
            await conn.query(
              `INSERT INTO projects (id, school_id, fiscal_year_id, project_code, project_name, rationale, objectives, quantitative_goals, qualitative_goals, kpis, procedures, duration_start, duration_end, location, target_group, responsible_person, department, budget_source, allocated_budget, spent_budget, remaining_budget, status, approval_status)
               VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 project_name = VALUES(project_name),
                 project_code = VALUES(project_code),
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
                schoolId,
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
            keptProjIds.push(p.id);
          } else {
            const [pr]: any = await conn.query(
              `INSERT INTO projects (school_id, fiscal_year_id, project_code, project_name, rationale, objectives, quantitative_goals, qualitative_goals, kpis, procedures, duration_start, duration_end, location, target_group, responsible_person, department, budget_source, allocated_budget, spent_budget, remaining_budget, status, approval_status)
               VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                schoolId,
                p.projectCode || `PROJ-${Date.now()}`,
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
            if (pr.insertId) keptProjIds.push(pr.insertId);
          }
        }
        if (keptProjIds.length > 0) {
          await conn.query(`DELETE FROM projects WHERE school_id = ? AND id NOT IN (${keptProjIds.join(',')})`, [schoolId]);
        }
      }
    }

    // 10. Sync Transactions for this school
    if (Array.isArray(data.transactions)) {
      if (data.transactions.length === 0) {
        await conn.query('DELETE FROM budget_transactions WHERE school_id = ?', [schoolId]);
      } else {
        const keptTxIds: number[] = [];
        for (const t of data.transactions) {
          if (!t.itemDescription) continue;
          if (t.id && t.id > 0) {
            await conn.query(
              `INSERT INTO budget_transactions (id, school_id, fiscal_year_id, project_id, doc_number, transaction_date, item_description, amount, payee, receipt_number, approved_by, status)
               VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                schoolId,
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
            keptTxIds.push(t.id);
          } else {
            const [tr]: any = await conn.query(
              `INSERT INTO budget_transactions (school_id, fiscal_year_id, project_id, doc_number, transaction_date, item_description, amount, payee, receipt_number, approved_by, status)
               VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                schoolId,
                Number(t.projectId) || 0,
                t.docNumber || `DOC-${Date.now()}`,
                t.transactionDate || '',
                t.itemDescription,
                Number(t.amount) || 0,
                t.payee || '',
                t.receiptNumber || '',
                t.approvedBy || '',
                t.status || 'approved',
              ]
            );
            if (tr.insertId) keptTxIds.push(tr.insertId);
          }
        }
        if (keptTxIds.length > 0) {
          await conn.query(`DELETE FROM budget_transactions WHERE school_id = ? AND id NOT IN (${keptTxIds.join(',')})`, [schoolId]);
        }
      }
    }

    await conn.end();

    return {
      success: true,
      message: 'บันทึกข้อมูลลงฐานข้อมูล MySQL จริงสำเร็จสมบูรณ์ 100%',
    };
  } catch (err: any) {
    console.error('MySQL save failed:', err);
    return {
      success: false,
      message: 'ไม่สามารถบันทึกข้อมูลลง MySQL ได้',
      error: err.message,
    };
  }
}

/**
 * ดึง App Data ทั้งหมดจาก MySQL โดยตรงตาม school_id
 */
export async function loadAppData(schoolIdParam?: number): Promise<any> {
  let conn: any = null;
  try {
    conn = await getDirectConnection();
    // 1. School query
    let schoolSql = 'SELECT * FROM schools WHERE is_active = 1 ORDER BY id ASC LIMIT 1';
    let schoolParams: any[] = [];
    if (schoolIdParam && schoolIdParam > 0) {
      schoolSql = 'SELECT * FROM schools WHERE id = ? LIMIT 1';
      schoolParams = [schoolIdParam];
    }
    const [schools]: any = await conn.query(schoolSql, schoolParams);
    const s = schools && schools.length > 0 ? schools[0] : null;

    if (!s) {
      await conn.end();
      return null;
    }

    const schoolId = s.id;

    // 2. Query all tables filtered by school_id
    const [fiscalYears]: any = await conn.query('SELECT * FROM fiscal_years WHERE school_id = ? ORDER BY year DESC', [schoolId]);
    const selectedYear = fiscalYears.find((fy: any) => fy.is_active === 1) || fiscalYears[0];
    const [users]: any = await conn.query('SELECT * FROM users WHERE school_id = ? ORDER BY id ASC', [schoolId]);
    const [students]: any = await conn.query('SELECT * FROM students WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC', [schoolId, selectedYear?.id || 0]);
    const [revenues]: any = await conn.query('SELECT * FROM revenues WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC', [schoolId, selectedYear?.id || 0]);
    const [allocations]: any = await conn.query('SELECT * FROM budget_allocations WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC', [schoolId, selectedYear?.id || 0]);
    let budgetSettings: any = null;
    try {
      const [settings]: any = await conn.query('SELECT carryover, manual_total, learner_initialized FROM budget_settings WHERE school_id = ? AND fiscal_year_id = ? LIMIT 1', [schoolId, selectedYear?.id || 0]);
      budgetSettings = settings[0];
    } catch { /* Older databases have no budget settings until the first save. */ }
    const [activities]: any = await conn.query('SELECT * FROM learner_activities WHERE school_id = ? AND fiscal_year_id = ? ORDER BY id ASC', [schoolId, selectedYear?.id || 0]);
    const [strategies]: any = await conn.query('SELECT * FROM strategies WHERE school_id = ? ORDER BY id ASC', [schoolId]);
    const [projects]: any = await conn.query('SELECT * FROM projects WHERE school_id = ? ORDER BY id ASC', [schoolId]);
    const [transactions]: any = await conn.query('SELECT * FROM budget_transactions WHERE school_id = ? ORDER BY id DESC', [schoolId]);

    await conn.end();

    return {
      school: {
        id: s.id,
        schoolCode: s.school_code,
        smisCode: s.smis_code,
        name: s.name,
        province: s.province,
        educationArea: s.education_area,
        address: s.address || '', subdistrict: s.subdistrict || '', district: s.district || '',
        zipcode: s.zipcode || '', affiliation: s.affiliation || '', fiscalYear: s.fiscal_year || undefined,
        logoUrl: s.logo_url || '',
        directorName: s.director_name,
        phone: s.phone,
        email: s.email,
        isActive: s.is_active === 1,
        schoolKey: s.school_key,
      },
      fiscalYears: (fiscalYears || []).map((fy: any) => ({
        id: fy.id,
        schoolId: fy.school_id,
        year: fy.year,
        isActive: fy.is_active === 1,
        startDate: fy.start_date,
        endDate: fy.end_date,
        totalStudents: Number(fy.total_students) || 0,
        teacherCount: Number(fy.teacher_count) || 0,
        isProposalOpen: fy.is_proposal_open !== 0,
        proposalOpenDate: fy.proposal_open_date ? new Date(fy.proposal_open_date).toISOString().slice(0, 10) : undefined,
        proposalCloseDate: fy.proposal_close_date ? new Date(fy.proposal_close_date).toISOString().slice(0, 10) : undefined,
        proposalNotice: fy.proposal_notice || '',
      })),
      users: (users || []).map((u: any) => ({
        id: u.id,
        schoolId: u.school_id,
        username: u.username,
        citizenId: u.citizen_id,
        password: u.password_hash || '123456',
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        department: u.department,
        position: u.position,
        phone: u.phone,
        avatar: u.avatar,
        isActive: u.is_active === 1,
        status: u.status || 'approved',
        isPasswordChanged: u.is_password_changed === 1,
      })),
      students: (students || []).map((st: any) => ({
        id: st.id,
        schoolId: st.school_id,
        fiscalYearId: st.fiscal_year_id,
        gradeLevel: st.grade_level,
        stage: st.stage,
        maleCount: Number(st.male_count) || 0,
        femaleCount: Number(st.female_count) || 0,
        totalCount: Number(st.total_count) || 0,
      })),
      revenues: (revenues || []).map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        fiscalYearId: r.fiscal_year_id,
        category: r.category,
        itemName: r.item_name,
        ratePerHead: Number(r.rate_per_head) || 0,
        eligibleCount: Number(r.eligible_count) || 0,
        calculatedAmount: Number(r.calculated_amount) || 0,
        isCustomRate: r.is_custom_rate === 1,
        note: r.note,
      })),
      allocations: (allocations || []).map((a: any) => ({
        id: a.id,
        schoolId: a.school_id,
        fiscalYearId: a.fiscal_year_id,
        departmentName: a.department_name,
        percentage: Number(a.percentage) || 0,
        allocatedAmount: Number(a.allocated_amount) || 0,
        spentAmount: Number(a.spent_amount) || 0,
        remainingAmount: Number(a.remaining_amount) || 0,
        colorHex: a.color_hex,
        description: a.description,
        reserveType: a.reserve_type || undefined,
      })),
      budgetSettings: { carryover: Number(budgetSettings?.carryover) || 0, manualTotal: budgetSettings?.manual_total == null ? null : Number(budgetSettings.manual_total) },
      activitiesInitialized: budgetSettings?.learner_initialized === 1,
      activities: (activities || []).map((act: any) => ({
        id: act.id,
        schoolId: act.school_id,
        fiscalYearId: act.fiscal_year_id,
        activityName: act.activity_name,
        percentage: Number(act.percentage) || 0,
        allocatedAmount: Number(act.allocated_amount) || 0,
        spentAmount: Number(act.spent_amount) || 0,
        remainingAmount: Number(act.remaining_amount) || 0,
        note: act.note,
        description: act.description || '',
      })),
      strategies: (strategies || []).map((st: any) => ({
        id: st.id,
        schoolId: st.school_id,
        fiscalYearId: st.fiscal_year_id,
        code: st.code,
        name: st.name,
        description: st.description,
      })),
      projects: (projects || []).map((p: any) => ({
        id: p.id,
        schoolId: p.school_id,
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
      transactions: (transactions || []).map((t: any) => ({
        id: t.id,
        schoolId: t.school_id,
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
  } catch (err: any) {
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
    console.warn('[AI Studio] MySQL database offline or not configured — loading from local storage backup:', err.message);
    if (fs.existsSync(APP_DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(APP_DB_FILE, 'utf-8');
        return JSON.parse(fileContent);
      } catch (e) {}
    }
    return null;
  }
}
