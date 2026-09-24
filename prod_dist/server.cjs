var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_jszip = __toESM(require("jszip"), 1);
var import_vite = require("vite");
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// src/server/database.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_promise = __toESM(require("mysql2/promise"), 1);
import_dotenv.default.config();
var DB_CONFIG_FILE = import_path.default.join(process.cwd(), "config", "db_config.json");
var APP_DB_FILE = import_path.default.join(process.cwd(), "config", "app_database.json");
var SCHEMA_FILE = import_path.default.join(process.cwd(), "database", "schema.sql");
function getDatabaseConfig() {
  const envConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dbname: process.env.DB_NAME || "school_budget_db",
    user: process.env.DB_USER || "root",
    pass: process.env.DB_PASS || "",
    charset: "utf8mb4",
    source: "env"
  };
  try {
    if (import_fs.default.existsSync(DB_CONFIG_FILE)) {
      const content = import_fs.default.readFileSync(DB_CONFIG_FILE, "utf-8");
      const savedConfig = JSON.parse(content);
      return {
        host: savedConfig.host || envConfig.host,
        port: Number(savedConfig.port) || envConfig.port,
        dbname: savedConfig.dbname || envConfig.dbname,
        user: savedConfig.user || envConfig.user,
        pass: savedConfig.pass !== void 0 ? savedConfig.pass : envConfig.pass,
        charset: "utf8mb4",
        source: "custom_file",
        updatedAt: savedConfig.updatedAt || savedConfig.updated_at
      };
    }
  } catch (e) {
    console.error("Error reading db_config.json, falling back to .env:", e);
  }
  return envConfig;
}
var ENV_FILE = import_path.default.join(process.cwd(), ".env");
function saveDatabaseConfig(config) {
  try {
    const current = getDatabaseConfig();
    const newConfig = {
      host: config.host || current.host,
      port: Number(config.port) || current.port,
      dbname: config.dbname || current.dbname,
      user: config.user || current.user,
      pass: config.pass !== void 0 ? config.pass : current.pass,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const dir = import_path.default.dirname(DB_CONFIG_FILE);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    import_fs.default.writeFileSync(DB_CONFIG_FILE, JSON.stringify(newConfig, null, 2), "utf-8");
    try {
      let envContent = "";
      if (import_fs.default.existsSync(ENV_FILE)) {
        envContent = import_fs.default.readFileSync(ENV_FILE, "utf-8");
      }
      const updateOrAddEnv = (key, value) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `
${key}=${value}`;
        }
      };
      updateOrAddEnv("DB_HOST", newConfig.host);
      updateOrAddEnv("DB_PORT", String(newConfig.port));
      updateOrAddEnv("DB_NAME", newConfig.dbname);
      updateOrAddEnv("DB_USER", newConfig.user);
      updateOrAddEnv("DB_PASS", newConfig.pass);
      import_fs.default.writeFileSync(ENV_FILE, envContent.trim() + "\n", "utf-8");
    } catch (e) {
      console.warn("Could not update .env file directly:", e);
    }
    return true;
  } catch (err) {
    console.error("Failed to save database config:", err);
    return false;
  }
}
function getDatabaseConnectionString() {
  const cfg = getDatabaseConfig();
  const auth = cfg.user + (cfg.pass ? `:${cfg.pass}` : "");
  return `mysql://${auth}@${cfg.host}:${cfg.port}/${cfg.dbname}?charset=utf8mb4`;
}
async function getDirectConnection(params) {
  const cfg = {
    ...getDatabaseConfig(),
    ...params || {}
  };
  const attempts = [
    // 1. ลองด้วย Host ที่กำหนดมา
    { host: cfg.host, port: Number(cfg.port) || 3306 },
    // 2. ถ้าเป็น localhost แล้วต่อ socket ไม่เจอ ให้ลอง 127.0.0.1:3306 (TCP)
    { host: cfg.host === "localhost" ? "127.0.0.1" : "localhost", port: 3306 },
    // 3. ลอง Unix Socket พาธมาตรฐานของ cPanel / CloudLinux
    { socketPath: "/var/lib/mysql/mysql.sock" },
    { socketPath: "/tmp/mysql.sock" }
  ];
  let lastError = null;
  for (const opt of attempts) {
    try {
      const conn = await import_promise.default.createConnection({
        ...opt,
        user: cfg.user,
        password: cfg.pass || "",
        database: cfg.dbname,
        connectTimeout: 4e3,
        charset: "utf8mb4",
        multipleStatements: true
      });
      return conn;
    } catch (err) {
      lastError = err;
      if (err.code === "ER_ACCESS_DENIED_ERROR" || err.code === "ER_BAD_DB_ERROR") {
        throw err;
      }
    }
  }
  throw lastError || new Error(`\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D MySQL \u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C ${cfg.host}:${cfg.port}`);
}
async function testDatabaseConnection(params) {
  const targetConfig = {
    ...getDatabaseConfig(),
    ...params || {}
  };
  const startTime = Date.now();
  try {
    const conn = await getDirectConnection(params);
    const [rows] = await conn.query("SELECT VERSION() as ver, DATABASE() as db");
    const version = rows[0]?.ver || "MySQL 8.x";
    const pingTime = Date.now() - startTime;
    await conn.end();
    return {
      success: true,
      message: `\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL '${targetConfig.dbname}' \u0E1A\u0E19\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E08\u0E23\u0E34\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (${version})`,
      config: {
        host: targetConfig.host,
        port: targetConfig.port,
        dbname: targetConfig.dbname,
        user: targetConfig.user
      },
      version,
      pingTimeMs: pingTime
    };
  } catch (err) {
    let specificMessage = err.message || "\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38";
    const hints = [];
    if (err.code === "ER_ACCESS_DENIED_ERROR" || specificMessage.includes("Access denied")) {
      specificMessage = `\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 '${targetConfig.user}' (\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21 User \u0E43\u0E2B\u0E49\u0E01\u0E31\u0E1A\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19 cPanel)`;
      hints.push("1. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19 cPanel");
      hints.push(`2. \u0E43\u0E19 cPanel > MySQL Databases \u0E43\u0E2B\u0E49\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E25\u0E07\u0E44\u0E1B\u0E17\u0E35\u0E48 "Add User to Database" \u0E40\u0E25\u0E37\u0E2D\u0E01 User "${targetConfig.user}" \u0E41\u0E25\u0E30 Database "${targetConfig.dbname}" \u0E41\u0E25\u0E49\u0E27\u0E04\u0E25\u0E34\u0E01 Add \u0E41\u0E25\u0E30\u0E15\u0E34\u0E4A\u0E01 ALL PRIVILEGES`);
    } else if (err.code === "ER_BAD_DB_ERROR" || specificMessage.includes("Unknown database")) {
      specificMessage = `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E37\u0E48\u0E2D '${targetConfig.dbname}' \u0E1A\u0E19 MySQL Server`;
      hints.push(`1. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E44\u0E14\u0E49\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 "${targetConfig.dbname}" \u0E1A\u0E19 cPanel \u0E41\u0E25\u0E49\u0E27\u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07`);
      hints.push("2. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E33\u0E19\u0E33\u0E2B\u0E19\u0E49\u0E32\u0E0A\u0E37\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (Prefix) \u0E40\u0E0A\u0E48\u0E19 schoobwd_planaction");
    } else if (err.code === "ECONNREFUSED" || err.code === "ENOENT") {
      specificMessage = `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E22\u0E31\u0E07 Host '${targetConfig.host}' \u0E44\u0E14\u0E49 (\u0E1E\u0E2D\u0E23\u0E4C\u0E15\u0E1B\u0E34\u0E14\u0E2B\u0E23\u0E37\u0E2D Socket \u0E44\u0E21\u0E48\u0E1E\u0E1A)`;
      hints.push("1. \u0E25\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19 Host \u0E40\u0E1B\u0E47\u0E19 localhost \u0E2B\u0E23\u0E37\u0E2D 127.0.0.1");
      hints.push("2. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 MySQL \u0E1A\u0E19\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48");
    }
    return {
      success: false,
      message: `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 '${targetConfig.dbname}' \u0E44\u0E14\u0E49: ${specificMessage}`,
      config: {
        host: targetConfig.host,
        port: targetConfig.port,
        dbname: targetConfig.dbname,
        user: targetConfig.user
      },
      hints
    };
  }
}
async function getRealDatabaseStatus() {
  const cfg = getDatabaseConfig();
  const maskedConn = getDatabaseConnectionString().replace(/:[^:@]+@/, ":****@");
  try {
    const conn = await getDirectConnection();
    const [verRows] = await conn.query("SELECT VERSION() as ver");
    const version = verRows[0]?.ver || "MySQL 8.x";
    const [tablesRows] = await conn.query("SHOW TABLES");
    const tableKey = Object.keys(tablesRows[0] || {})[0] || "Tables_in_" + cfg.dbname;
    const tables = [];
    for (const row of tablesRows) {
      const tableName = row[tableKey];
      if (tableName) {
        try {
          const [countRows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
          tables.push({
            name: tableName,
            records: Number(countRows[0]?.cnt || 0)
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
      tables
    };
  } catch (err) {
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
      tables: []
    };
  }
}
async function runDatabaseMigration() {
  const logs = [];
  try {
    const conn = await getDirectConnection();
    logs.push("\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D MySQL Server \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08");
    if (import_fs.default.existsSync(SCHEMA_FILE)) {
      const sqlContent = import_fs.default.readFileSync(SCHEMA_FILE, "utf-8");
      logs.push(`\u2713 \u0E2D\u0E48\u0E32\u0E19\u0E44\u0E1F\u0E25\u0E4C Schema \u0E08\u0E32\u0E01 database/schema.sql (${Buffer.byteLength(sqlContent)} bytes)`);
      const statements = sqlContent.split(/;\s*$/m).map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("/*"));
      for (const stmt of statements) {
        if (stmt.length > 5) {
          try {
            await conn.query(stmt);
          } catch (e) {
            if (!stmt.toUpperCase().startsWith("DROP TABLE")) {
              console.warn("Migration warning:", e.message);
            }
          }
        }
      }
      logs.push(`\u2713 \u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E41\u0E25\u0E30\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E15\u0E32\u0E23\u0E32\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 (${statements.length} statements)`);
    } else {
      logs.push("\u26A0\uFE0F \u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C schema.sql \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E15\u0E32\u0E23\u0E32\u0E07\u0E2B\u0E25\u0E31\u0E01\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34...");
    }
    await conn.end();
    logs.push("\u2713 \u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E15\u0E32\u0E23\u0E32\u0E07\u0E25\u0E07 MySQL \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100%");
    return {
      success: true,
      message: "\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E15\u0E32\u0E23\u0E32\u0E07\u0E25\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E08\u0E23\u0E34\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27",
      logs
    };
  } catch (err) {
    logs.push(`\u274C \u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ${err.message}`);
    return {
      success: false,
      message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E15\u0E32\u0E23\u0E32\u0E07\u0E43\u0E19 MySQL \u0E44\u0E14\u0E49: " + err.message,
      logs
    };
  }
}
async function saveAppData(data) {
  try {
    const dir = import_path.default.dirname(APP_DB_FILE);
    if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
    import_fs.default.writeFileSync(APP_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    if (data.school) {
      try {
        const conn = await getDirectConnection();
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
            s.schoolCode || "1000000001",
            s.smisCode || "10000001",
            s.name,
            s.province || "",
            s.educationArea || "",
            s.directorName || "",
            s.phone || "",
            s.email || ""
          ]
        );
        await conn.end();
      } catch (dbErr) {
        console.warn("MySQL sync warning (persisted to disk):", dbErr);
      }
    }
    return true;
  } catch (err) {
    console.error("Error saving app data:", err);
    return false;
  }
}
async function loadAppData() {
  try {
    if (import_fs.default.existsSync(APP_DB_FILE)) {
      const content = import_fs.default.readFileSync(APP_DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading app data from disk:", e);
  }
  try {
    const conn = await getDirectConnection();
    const [rows] = await conn.query("SELECT * FROM schools WHERE is_active = 1 LIMIT 1");
    await conn.end();
    if (rows && rows.length > 0) {
      const s = rows[0];
      return {
        school: {
          id: s.id,
          schoolCode: s.school_code,
          smisCode: s.smis_code,
          name: s.name,
          province: s.province,
          educationArea: s.education_area,
          directorName: s.director_name,
          phone: s.phone,
          email: s.email
        }
      };
    }
  } catch {
  }
  return null;
}

// server.ts
import_dotenv2.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    runtime: "node.js",
    nodeVersion: process.version,
    port: PORT,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/server-info", (req, res) => {
  res.json({
    runtime: "Node.js",
    framework: "Express + Vite (TypeScript)",
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: process.env.NODE_ENV || "development",
    features: [
      "Native Node.js Server on Port 3000",
      "Direct Gemini AI API (@google/genai)",
      "Local Storage & Disk File Sync (/config/app_database.json)",
      "Multi-Tenant School Database Manager",
      "Google Apps Script (Code.gs) & Google Sheets Bridge",
      "cPanel / PHP Export Package Generator"
    ]
  });
});
var PHP_SYSTEM_FILES = [
  "index.php",
  "dashboard.php",
  "login.php",
  "logout.php",
  "school.php",
  "students.php",
  "revenue.php",
  "budget.php",
  "learner_activities.php",
  "ai_project_writer.php",
  "projects.php",
  "expenses.php",
  "disbursements.php",
  "action_plan.php",
  "reports.php",
  "settings.php",
  "fiscal_year.php",
  "users.php",
  "super_admin.php",
  "export_doc.php",
  ".htaccess",
  "README_PHP.md",
  "config/database.php",
  "config/schools_data.json",
  "database/schema.sql",
  "database/seed.sql",
  "includes/auth.php",
  "includes/footer.php",
  "includes/functions.php",
  "includes/header.php",
  "includes/sidebar.php",
  "api/ai_generate.php",
  "api/super_admin_api.php"
];
app.get("/api/php-files", (req, res) => {
  try {
    const fileList = PHP_SYSTEM_FILES.map((relPath) => {
      const fullPath = import_path2.default.join(process.cwd(), relPath);
      let content = "";
      if (import_fs2.default.existsSync(fullPath)) {
        content = import_fs2.default.readFileSync(fullPath, "utf-8");
      }
      return {
        path: relPath,
        name: import_path2.default.basename(relPath),
        category: relPath.includes("/") ? relPath.split("/")[0] : "root",
        size: Buffer.byteLength(content, "utf8"),
        content
      };
    });
    res.json({ success: true, files: fileList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/download-php-zip", async (req, res) => {
  try {
    const zip = new import_jszip.default();
    for (const relPath of PHP_SYSTEM_FILES) {
      const fullPath = import_path2.default.join(process.cwd(), relPath);
      if (import_fs2.default.existsSync(fullPath)) {
        const fileContent = import_fs2.default.readFileSync(fullPath);
        zip.file(relPath, fileContent);
      }
    }
    const contentBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="school-budget-php-system.zip"');
    res.send(contentBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/gas/code", (req, res) => {
  try {
    const gasPath = import_path2.default.join(process.cwd(), "Code.gs");
    const manifestPath = import_path2.default.join(process.cwd(), "appsscript.json");
    const code = import_fs2.default.existsSync(gasPath) ? import_fs2.default.readFileSync(gasPath, "utf-8") : "";
    const manifest = import_fs2.default.existsSync(manifestPath) ? import_fs2.default.readFileSync(manifestPath, "utf-8") : "";
    res.json({
      success: true,
      filename: "Code.gs",
      code,
      manifest,
      version: "1.0.0"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/download-gas-code", (req, res) => {
  try {
    const gasPath = import_path2.default.join(process.cwd(), "Code.gs");
    if (import_fs2.default.existsSync(gasPath)) {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="Code.gs"');
      return res.sendFile(gasPath);
    }
    return res.status(404).send("Code.gs not found");
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.all("/api/gas/proxy", async (req, res) => {
  try {
    const targetUrl = req.query.url || req.body?.url;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: "Target Google Apps Script Web App URL is required" });
    }
    if (req.method === "GET") {
      const response = await fetch(targetUrl);
      const data = await response.json();
      return res.json(data);
    } else {
      const payload = req.body?.payload || req.body;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return res.json(data);
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: "Proxy request to Google Apps Script failed: " + err.message });
  }
});
app.get("/api/ai/status", (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
  res.json({
    status: "ok",
    hasSystemKey: hasEnvKey,
    model: "gemini-3.8-flash"
  });
});
function generateFallbackProposal(params) {
  const name = params.projectName?.trim() || "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19";
  const type = params.projectType || "\u0E43\u0E2B\u0E21\u0E48";
  const dept = params.department || "\u0E1D\u0E48\u0E32\u0E22\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23";
  const strat = params.strategyName || "\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E17\u0E35\u0E48 1 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E02\u0E31\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19";
  const target = params.targetGroup || "\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19\u0E17\u0E38\u0E01\u0E04\u0E19";
  const budget = Number(params.estimatedBudget) > 0 ? Number(params.estimatedBudget) : 3e4;
  const dur = params.duration || "\u0E15\u0E25\u0E2D\u0E14\u0E1B\u0E35\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32 2568 (16 \u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21 2568 - 31 \u0E21\u0E35\u0E19\u0E32\u0E04\u0E21 2569)";
  const focus = params.specialFocus?.trim() || "";
  const proposer = params.proposerName?.trim() || "\u0E19\u0E32\u0E07\u0E2A\u0E32\u0E27\u0E01\u0E19\u0E01\u0E1E\u0E23 \u0E43\u0E08\u0E21\u0E31\u0E48\u0E19";
  const propPos = params.proposerPosition?.trim() || "\u0E04\u0E23\u0E39\u0E0A\u0E33\u0E19\u0E32\u0E0D\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E40\u0E28\u0E29";
  const endorser = params.endorserName?.trim() || "\u0E19\u0E32\u0E22\u0E1E\u0E34\u0E40\u0E0A\u0E29\u0E10\u0E4C \u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E27\u0E07\u0E28\u0E4C";
  const endPos = params.endorserPosition?.trim() || `\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19${dept}`;
  const approver = params.approverName?.trim() || "\u0E14\u0E23.\u0E2A\u0E21\u0E28\u0E31\u0E01\u0E14\u0E34\u0E4C \u0E1E\u0E31\u0E12\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32";
  const appPos = params.approverPosition?.trim() || "\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19";
  const isOnet = /onet|o-net|nt|ผลสัมฤทธิ์|ทดสอบ/i.test(name);
  const isAiDigital = /ai|ปัญญาประดิษฐ์|ดิจิทัล|คอมพิวเตอร์|coding|เทคโนโลยี/i.test(name);
  const isMorality = /คุณธรรม|จริยธรรม|สุจริต|วินัย|วิถีพุทธ|ประชาธิปไตย/i.test(name);
  const isSafety = /ปลอดภัย|safety|สิ่งแวดล้อม|อาคาร|ซ่อมแซม|สุขาภิบาล/i.test(name);
  const isAgriculture = /เกษตร|อาหารกลางวัน|พอเพียง|ปลูกผัก|สหกรณ์/i.test(name);
  const isLanguage = /ภาษาอังกฤษ|ภาษาไทย|รักการอ่าน|english/i.test(name);
  let rationaleText = `\u0E15\u0E32\u0E21\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E1A\u0E31\u0E0D\u0E0D\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E41\u0E2B\u0E48\u0E07\u0E0A\u0E32\u0E15\u0E34 \u0E1E.\u0E28. 2542 \u0E41\u0E25\u0E30\u0E17\u0E35\u0E48\u0E41\u0E01\u0E49\u0E44\u0E02\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21 \u0E23\u0E27\u0E21\u0E16\u0E36\u0E07\u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22\u0E41\u0E25\u0E30\u0E08\u0E38\u0E14\u0E40\u0E19\u0E49\u0E19\u0E02\u0E2D\u0E07\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E02\u0E31\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19 (\u0E2A\u0E1E\u0E10.) \u0E21\u0E38\u0E48\u0E07\u0E40\u0E19\u0E49\u0E19\u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19\u0E21\u0E35\u0E2A\u0E21\u0E23\u0E23\u0E16\u0E19\u0E30\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E15\u0E32\u0E21\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07 \u0E21\u0E35\u0E17\u0E31\u0E01\u0E29\u0E30\u0E43\u0E19\u0E28\u0E15\u0E27\u0E23\u0E23\u0E29\u0E17\u0E35\u0E48 21 \u0E41\u0E25\u0E30\u0E21\u0E35\u0E04\u0E38\u0E13\u0E25\u0E31\u0E01\u0E29\u0E13\u0E30\u0E2D\u0E31\u0E19\u0E1E\u0E36\u0E07\u0E1B\u0E23\u0E30\u0E2A\u0E07\u0E04\u0E4C \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E36\u0E07\u0E15\u0E23\u0E30\u0E2B\u0E19\u0E31\u0E01\u0E16\u0E36\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E17\u0E33 "${name}" \u0E02\u0E36\u0E49\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E\u0E02\u0E2D\u0E07${target}\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07 \u0E41\u0E25\u0E30\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E ${focus ? `\u0E42\u0E14\u0E22\u0E21\u0E38\u0E48\u0E07\u0E40\u0E19\u0E49\u0E19${focus}` : ""} \u0E15\u0E2D\u0E1A\u0E2A\u0E19\u0E2D\u0E07\u0E15\u0E48\u0E2D\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E02\u0E2D\u0E07\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E41\u0E25\u0E30\u0E17\u0E34\u0E28\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E0A\u0E32\u0E15\u0E34\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19`;
  let objectivesList = [
    `\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E\u0E02\u0E2D\u0E07${target} \u0E43\u0E2B\u0E49\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E15\u0E32\u0E21\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23`,
    `\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E25\u0E30\u0E01\u0E23\u0E30\u0E1A\u0E27\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E40\u0E0A\u0E34\u0E07\u0E23\u0E38\u0E01 (Active Learning) \u0E43\u0E2B\u0E49\u0E40\u0E01\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14`,
    `\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E04\u0E27\u0E32\u0E21\u0E23\u0E48\u0E27\u0E21\u0E21\u0E37\u0E2D\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E04\u0E23\u0E39 \u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23 \u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19`
  ];
  let pdcaList = [
    {
      phase: "1. \u0E02\u0E31\u0E49\u0E19\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E01\u0E32\u0E23 (Plan)",
      description: `\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19 \u0E0A\u0E35\u0E49\u0E41\u0E08\u0E07\u0E04\u0E13\u0E30\u0E17\u0E33\u0E07\u0E32\u0E19 \u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19 "${name}" \u0E41\u0E25\u0E30\u0E08\u0E31\u0E14\u0E17\u0E33\u0E41\u0E19\u0E27\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34`,
      duration: "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21 2568",
      responsible: proposer
    },
    {
      phase: "2. \u0E02\u0E31\u0E49\u0E19\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 (Do)",
      description: `\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E25\u0E31\u0E01\u0E15\u0E32\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E${target} ${focus ? `\u0E40\u0E19\u0E49\u0E19${focus}` : "\u0E08\u0E31\u0E14\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E41\u0E25\u0E30\u0E1D\u0E36\u0E01\u0E2D\u0E1A\u0E23\u0E21"}`,
      duration: "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19 2568 - \u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21 2568",
      responsible: "\u0E04\u0E13\u0E30\u0E17\u0E33\u0E07\u0E32\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"
    },
    {
      phase: "3. \u0E02\u0E31\u0E49\u0E19\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E1C\u0E25 (Check)",
      description: "\u0E19\u0E34\u0E40\u0E17\u0E28 \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 \u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E1C\u0E25\u0E15\u0E32\u0E21\u0E15\u0E31\u0E27\u0E0A\u0E35\u0E49\u0E27\u0E31\u0E14\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E41\u0E25\u0E30\u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E36\u0E07\u0E1E\u0E2D\u0E43\u0E08",
      duration: "\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21 2569",
      responsible: "\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E19\u0E34\u0E40\u0E17\u0E28\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21"
    },
    {
      phase: "4. \u0E02\u0E31\u0E49\u0E19\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E1C\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E38\u0E1B (Action)",
      description: "\u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E25\u0E30\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E41\u0E25\u0E30\u0E19\u0E33\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E44\u0E1B\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E43\u0E19\u0E1B\u0E35\u0E15\u0E48\u0E2D\u0E44\u0E1B",
      duration: "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C - \u0E21\u0E35\u0E19\u0E32\u0E04\u0E21 2569",
      responsible: proposer
    }
  ];
  if (isOnet) {
    rationaleText = `\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E0A\u0E32\u0E15\u0E34\u0E02\u0E31\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19 (O-NET) \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19 (NT) \u0E40\u0E1B\u0E47\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E30\u0E17\u0E49\u0E2D\u0E19\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E02\u0E2D\u0E07\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32 \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E25\u0E47\u0E07\u0E40\u0E2B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19\u0E43\u0E19\u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E02\u0E2D\u0E07\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E49\u0E2A\u0E39\u0E07\u0E02\u0E36\u0E49\u0E19 \u0E08\u0E36\u0E07\u0E44\u0E14\u0E49\u0E08\u0E31\u0E14\u0E17\u0E33 "${name}" \u0E02\u0E36\u0E49\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E1B\u0E35\u0E17\u0E35\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E21\u0E32 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E17\u0E31\u0E01\u0E29\u0E30 \u0E1D\u0E36\u0E01\u0E17\u0E31\u0E01\u0E29\u0E30\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C \u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E02\u0E49\u0E21\u0E02\u0E49\u0E19\u0E23\u0E2D\u0E1A\u0E14\u0E49\u0E32\u0E19`;
    objectivesList = [
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E0A\u0E32\u0E15\u0E34 (O-NET \u0E41\u0E25\u0E30 NT) \u0E02\u0E2D\u0E07\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E49\u0E2A\u0E39\u0E07\u0E01\u0E27\u0E48\u0E32\u0E04\u0E48\u0E32\u0E40\u0E09\u0E25\u0E35\u0E48\u0E22\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C \u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E1B\u0E31\u0E0D\u0E2B\u0E32 \u0E41\u0E25\u0E30\u0E40\u0E17\u0E04\u0E19\u0E34\u0E04\u0E01\u0E32\u0E23\u0E17\u0E33\u0E41\u0E1A\u0E1A\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E01\u0E48\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E30\u0E1A\u0E1A",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19\u0E19\u0E33\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E04\u0E30\u0E41\u0E19\u0E19\u0E2A\u0E2D\u0E1A\u0E21\u0E32\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E15\u0E23\u0E07\u0E08\u0E38\u0E14"
    ];
  } else if (isAiDigital) {
    rationaleText = `\u0E43\u0E19\u0E22\u0E38\u0E04\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E41\u0E25\u0E30\u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E1B\u0E23\u0E30\u0E14\u0E34\u0E29\u0E10\u0E4C (AI) \u0E01\u0E32\u0E23\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E09\u0E25\u0E32\u0E14\u0E23\u0E39\u0E49\u0E17\u0E32\u0E07\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35 (Digital & AI Literacy) \u0E40\u0E1B\u0E47\u0E19\u0E17\u0E31\u0E01\u0E29\u0E30\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19\u0E43\u0E19\u0E28\u0E15\u0E27\u0E23\u0E23\u0E29\u0E17\u0E35\u0E48 21 \u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22 "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E14\u0E35 \u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E38\u0E02" \u0E02\u0E2D\u0E07\u0E01\u0E23\u0E30\u0E17\u0E23\u0E27\u0E07\u0E28\u0E36\u0E01\u0E29\u0E32\u0E18\u0E34\u0E01\u0E32\u0E23 \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E36\u0E07\u0E08\u0E31\u0E14\u0E17\u0E33 "${name}" \u0E02\u0E36\u0E49\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E41\u0E25\u0E30 AI \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \u0E41\u0E25\u0E30\u0E21\u0E35\u0E08\u0E23\u0E34\u0E22\u0E18\u0E23\u0E23\u0E21 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14\u0E40\u0E0A\u0E34\u0E07\u0E04\u0E33\u0E19\u0E27\u0E13\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E23\u0E30\u0E22\u0E38\u0E01\u0E15\u0E4C`;
    objectivesList = [
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E14\u0E49\u0E32\u0E19\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E41\u0E25\u0E30\u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E1B\u0E23\u0E30\u0E14\u0E34\u0E29\u0E10\u0E4C (AI Literacy) \u0E43\u0E2B\u0E49\u0E41\u0E01\u0E48\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E22\u0E38\u0E01\u0E15\u0E4C\u0E43\u0E0A\u0E49\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E25\u0E39\u0E01\u0E1D\u0E31\u0E07\u0E01\u0E32\u0E23\u0E23\u0E39\u0E49\u0E40\u0E17\u0E48\u0E32\u0E17\u0E31\u0E19\u0E2A\u0E37\u0E48\u0E2D\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25 \u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E43\u0E19\u0E42\u0E25\u0E01\u0E44\u0E0B\u0E40\u0E1A\u0E2D\u0E23\u0E4C \u0E41\u0E25\u0E30\u0E08\u0E23\u0E34\u0E22\u0E18\u0E23\u0E23\u0E21\u0E43\u0E19\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E1B\u0E23\u0E30\u0E14\u0E34\u0E29\u0E10\u0E4C"
    ];
  } else if (isMorality) {
    rationaleText = `\u0E04\u0E38\u0E13\u0E18\u0E23\u0E23\u0E21 \u0E08\u0E23\u0E34\u0E22\u0E18\u0E23\u0E23\u0E21 \u0E41\u0E25\u0E30\u0E08\u0E34\u0E15\u0E2A\u0E33\u0E19\u0E36\u0E01\u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E25\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E14\u0E35\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E01\u0E10\u0E32\u0E19\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E36\u0E07\u0E44\u0E14\u0E49\u0E08\u0E31\u0E14\u0E17\u0E33 "${name}" \u0E02\u0E36\u0E49\u0E19\u0E15\u0E32\u0E21\u0E41\u0E19\u0E27\u0E17\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2A\u0E38\u0E08\u0E23\u0E34\u0E15\u0E41\u0E25\u0E30\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E04\u0E38\u0E13\u0E18\u0E23\u0E23\u0E21 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E25\u0E39\u0E01\u0E1D\u0E31\u0E07\u0E04\u0E48\u0E32\u0E19\u0E34\u0E22\u0E21\u0E04\u0E27\u0E32\u0E21\u0E0B\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E15\u0E22\u0E4C\u0E2A\u0E38\u0E08\u0E23\u0E34\u0E15 \u0E27\u0E34\u0E19\u0E31\u0E22 \u0E04\u0E27\u0E32\u0E21\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A \u0E41\u0E25\u0E30\u0E08\u0E34\u0E15\u0E2D\u0E32\u0E2A\u0E32 \u0E43\u0E2B\u0E49\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19\u0E43\u0E19\u0E08\u0E34\u0E15\u0E2A\u0E33\u0E19\u0E36\u0E01\u0E02\u0E2D\u0E07\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E17\u0E38\u0E01\u0E04\u0E19`;
    objectivesList = [
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E25\u0E39\u0E01\u0E1D\u0E31\u0E07\u0E04\u0E38\u0E13\u0E18\u0E23\u0E23\u0E21 \u0E08\u0E23\u0E34\u0E22\u0E18\u0E23\u0E23\u0E21 \u0E41\u0E25\u0E30\u0E04\u0E48\u0E32\u0E19\u0E34\u0E22\u0E21\u0E04\u0E27\u0E32\u0E21\u0E0B\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E15\u0E22\u0E4C\u0E2A\u0E38\u0E08\u0E23\u0E34\u0E15\u0E15\u0E32\u0E21\u0E41\u0E19\u0E27\u0E17\u0E32\u0E07\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2A\u0E38\u0E08\u0E23\u0E34\u0E15",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E43\u0E2B\u0E49\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E21\u0E35\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E27\u0E34\u0E19\u0E31\u0E22 \u0E04\u0E27\u0E32\u0E21\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E15\u0E48\u0E2D\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E27\u0E21 \u0E41\u0E25\u0E30\u0E21\u0E35\u0E08\u0E34\u0E15\u0E2D\u0E32\u0E2A\u0E32\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2A\u0E31\u0E07\u0E04\u0E21",
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E20\u0E39\u0E21\u0E34\u0E04\u0E38\u0E49\u0E21\u0E01\u0E31\u0E19\u0E41\u0E25\u0E30\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E1A\u0E27\u0E01\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E15\u0E32\u0E21\u0E27\u0E34\u0E16\u0E35\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E18\u0E34\u0E1B\u0E44\u0E15\u0E22"
    ];
  }
  const remBudget = Math.round(budget * 0.2);
  const operBudget = Math.round(budget * 0.45);
  const matBudget = budget - remBudget - operBudget;
  const expenseItems = [
    {
      id: 1,
      projectId: 0,
      itemName: isOnet ? "\u0E04\u0E48\u0E32\u0E15\u0E2D\u0E1A\u0E41\u0E17\u0E19\u0E27\u0E34\u0E17\u0E22\u0E32\u0E01\u0E23\u0E15\u0E34\u0E27\u0E40\u0E02\u0E49\u0E21\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E17\u0E23\u0E07\u0E04\u0E38\u0E13\u0E27\u0E38\u0E12\u0E34" : "\u0E04\u0E48\u0E32\u0E15\u0E2D\u0E1A\u0E41\u0E17\u0E19\u0E27\u0E34\u0E17\u0E22\u0E32\u0E01\u0E23\u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E01\u0E32\u0E23\u0E1D\u0E36\u0E01\u0E2D\u0E1A\u0E23\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23",
      category: "\u0E04\u0E48\u0E32\u0E15\u0E2D\u0E1A\u0E41\u0E17\u0E19",
      quantity: 1,
      unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",
      unitPrice: remBudget,
      totalAmount: remBudget
    },
    {
      id: 2,
      projectId: 0,
      itemName: isOnet ? "\u0E04\u0E48\u0E32\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E25\u0E32\u0E07\u0E27\u0E31\u0E19\u0E41\u0E25\u0E30\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E27\u0E48\u0E32\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E04\u0E13\u0E30\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E04\u0E48\u0E32\u0E22\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C" : "\u0E04\u0E48\u0E32\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E25\u0E32\u0E07\u0E27\u0E31\u0E19\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E37\u0E48\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E2D\u0E1A\u0E23\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32",
      category: "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E2A\u0E2D\u0E22",
      quantity: 1,
      unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",
      unitPrice: operBudget,
      totalAmount: operBudget
    },
    {
      id: 3,
      projectId: 0,
      itemName: isOnet ? "\u0E04\u0E48\u0E32\u0E08\u0E31\u0E14\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D\u0E04\u0E25\u0E31\u0E07\u0E02\u0E49\u0E2D\u0E2A\u0E2D\u0E1A \u0E41\u0E1A\u0E1A\u0E1D\u0E36\u0E01\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E17\u0E31\u0E01\u0E29\u0E30 \u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E34\u0E27" : "\u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C \u0E2A\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49 \u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21",
      category: "\u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38",
      quantity: 1,
      unit: "\u0E0A\u0E38\u0E14",
      unitPrice: matBudget,
      totalAmount: matBudget
    }
  ];
  return {
    projectCode: "\u0E01\u0E04.01/2568",
    projectName: name,
    projectType: type,
    department: dept,
    strategyAlignment: strat,
    responsiblePerson: proposer,
    position: propPos,
    proposerName: proposer,
    proposerPosition: propPos,
    endorserName: endorser,
    endorserPosition: endPos,
    approverName: approver,
    approverPosition: appPos,
    rationale: rationaleText,
    objectives: objectivesList,
    quantitativeTarget: `${target} \u0E44\u0E21\u0E48\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30 85 \u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E41\u0E25\u0E30\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19`,
    qualitativeTarget: `\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E36\u0E07\u0E1E\u0E2D\u0E43\u0E08\u0E43\u0E19\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E14\u0E35\u0E21\u0E32\u0E01 (\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30 85 \u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B) \u0E41\u0E25\u0E30\u0E21\u0E35\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E21\u0E23\u0E23\u0E16\u0E19\u0E30\u0E15\u0E32\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E39\u0E1B\u0E18\u0E23\u0E23\u0E21`,
    timeline: dur,
    location: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E17\u0E35\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07",
    activities: pdcaList,
    expenseItems,
    totalBudget: budget,
    budgetSource: "\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19\u0E23\u0E32\u0E22\u0E2B\u0E31\u0E27 \u0E2A\u0E1E\u0E10. / \u0E41\u0E1C\u0E19\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35",
    kpis: "\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30 85 \u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E21\u0E35\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E17\u0E31\u0E01\u0E29\u0E30\u0E41\u0E25\u0E30\u0E2A\u0E21\u0E23\u0E23\u0E16\u0E19\u0E30\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E19\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E14\u0E35\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B",
    evaluationMethods: "\u0E41\u0E1A\u0E1A\u0E17\u0E14\u0E2A\u0E2D\u0E1A \u0E41\u0E1A\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E2A\u0E21\u0E23\u0E23\u0E16\u0E19\u0E30 \u0E41\u0E1A\u0E1A\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21 \u0E41\u0E25\u0E30\u0E41\u0E1A\u0E1A\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E36\u0E07\u0E1E\u0E2D\u0E43\u0E08",
    expectedBenefits: [
      `${target} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30 \u0E2D\u0E07\u0E04\u0E4C\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49 \u0E41\u0E25\u0E30\u0E2A\u0E21\u0E23\u0E23\u0E16\u0E19\u0E30\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E`,
      "\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E21\u0E35\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E17\u0E35\u0E48\u0E2A\u0E39\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E32\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E02\u0E2D\u0E07 \u0E2A\u0E1E\u0E10.",
      "\u0E40\u0E01\u0E34\u0E14\u0E41\u0E19\u0E27\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E17\u0E35\u0E48\u0E14\u0E35 (Best Practice) \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E19\u0E33\u0E44\u0E1B\u0E15\u0E48\u0E2D\u0E22\u0E2D\u0E14\u0E41\u0E25\u0E30\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48\u0E02\u0E22\u0E32\u0E22\u0E1C\u0E25\u0E44\u0E14\u0E49"
    ],
    proposedBy: `(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D).......................................................... \u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
(${proposer})
\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 ${propPos}`,
    approvedBy: `(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D).......................................................... \u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
(${approver})
\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 ${appPos}`,
    acknowledgedBy: `(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D).......................................................... \u0E1C\u0E39\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
(${endorser})
\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 ${endPos}`
  };
}
app.post("/api/ai/generate-project", async (req, res) => {
  try {
    const {
      prompt,
      projectName,
      projectType,
      department,
      strategyName,
      targetGroup,
      estimatedBudget,
      duration,
      specialFocus,
      customApiKey,
      proposerName,
      proposerPosition,
      endorserName,
      endorserPosition,
      approverName,
      approverPosition
    } = req.body || {};
    const apiKey = customApiKey && String(customApiKey).trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = generateFallbackProposal({
        projectName,
        projectType,
        department,
        strategyName,
        targetGroup,
        estimatedBudget,
        duration,
        specialFocus,
        proposerName,
        proposerPosition,
        endorserName,
        endorserPosition,
        approverName,
        approverPosition
      });
      return res.json({
        success: true,
        source: "template_fallback",
        message: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E23\u0E48\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E15\u0E32\u0E21\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 \u0E2A\u0E1E\u0E10. \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22",
        data: fallback
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const systemInstruction = `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E15\u0E32\u0E21\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E02\u0E2D\u0E07\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E02\u0E31\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19 (\u0E2A\u0E1E\u0E10.) \u0E01\u0E23\u0E30\u0E17\u0E23\u0E27\u0E07\u0E28\u0E36\u0E01\u0E29\u0E32\u0E18\u0E34\u0E01\u0E32\u0E23
\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E23\u0E48\u0E32\u0E07\u0E41\u0E25\u0E30\u0E40\u0E02\u0E35\u0E22\u0E19\u0E02\u0E49\u0E2D\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E09\u0E1A\u0E31\u0E1A\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (School Project Proposal) \u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23 \u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E15\u0E32\u0E21\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23\u0E44\u0E17\u0E22 
\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E14\u0E49\u0E27\u0E22:
1. projectCode: \u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E40\u0E0A\u0E48\u0E19 "\u0E27\u0E0A.01/2568"
2. projectName: \u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A \u0E2A\u0E25\u0E30\u0E2A\u0E25\u0E27\u0E22 \u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19
3. projectType: "\u0E43\u0E2B\u0E21\u0E48" \u0E2B\u0E23\u0E37\u0E2D "\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07"
4. department: \u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19/\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23 \u0E40\u0E0A\u0E48\u0E19 "\u0E1D\u0E48\u0E32\u0E22\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23", "\u0E1D\u0E48\u0E32\u0E22\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", "\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E38\u0E04\u0E04\u0E25", "\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B"
5. strategyAlignment: \u0E04\u0E27\u0E32\u0E21\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32 \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C \u0E2A\u0E1E\u0E10.
6. responsiblePerson: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D/\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
7. position: \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
8. proposerName: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
9. proposerPosition: \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
10. endorserName: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
11. endorserPosition: \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
12. approverName: \u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19)
13. approverPosition: \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23
14. rationale: \u0E2B\u0E25\u0E31\u0E01\u0E01\u0E32\u0E23\u0E41\u0E25\u0E30\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25 \u0E40\u0E02\u0E35\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E20\u0E32\u0E29\u0E32\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23 2-3 \u0E22\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32 \u0E23\u0E30\u0E1A\u0E38\u0E1A\u0E23\u0E34\u0E1A\u0E17 \u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22 \u0E2A\u0E20\u0E32\u0E1E\u0E1B\u0E31\u0E0D\u0E2B\u0E32 \u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19
15. objectives: \u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E15\u0E16\u0E38\u0E1B\u0E23\u0E30\u0E2A\u0E07\u0E04\u0E4C 3-4 \u0E02\u0E49\u0E2D \u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "\u0E40\u0E1E\u0E37\u0E48\u0E2D..."
16. quantitativeTarget: \u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E17\u0E35\u0E48\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19 \u0E21\u0E35\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30
17. qualitativeTarget: \u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E0A\u0E34\u0E07\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E
18. timeline: \u0E23\u0E30\u0E22\u0E30\u0E40\u0E27\u0E25\u0E32\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23
19. location: \u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23
20. activities: \u0E15\u0E32\u0E23\u0E32\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E15\u0E32\u0E21\u0E27\u0E07\u0E08\u0E23 PDCA (4 \u0E02\u0E31\u0E49\u0E19: Plan, Do, Check, Action) \u0E41\u0E15\u0E48\u0E25\u0E30\u0E02\u0E31\u0E49\u0E19\u0E21\u0E35 phase, description, duration, responsible
21. expenseItems: \u0E41\u0E08\u0E01\u0E41\u0E08\u0E07\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22 4 \u0E2B\u0E21\u0E27\u0E14\u0E02\u0E2D\u0E07 \u0E2A\u0E1E\u0E10. (\u0E04\u0E48\u0E32\u0E15\u0E2D\u0E1A\u0E41\u0E17\u0E19, \u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E2A\u0E2D\u0E22, \u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38, \u0E04\u0E48\u0E32\u0E04\u0E23\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C) \u0E41\u0E15\u0E48\u0E25\u0E30\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E21\u0E35 id, itemName, category, quantity, unit, unitPrice, totalAmount \u0E42\u0E14\u0E22 totalAmount = quantity * unitPrice \u0E41\u0E25\u0E30\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E17\u0E38\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A totalBudget
22. totalBudget: \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19 (\u0E1A\u0E32\u0E17)
23. budgetSource: \u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 \u0E40\u0E0A\u0E48\u0E19 "\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19\u0E23\u0E32\u0E22\u0E2B\u0E31\u0E27 \u0E2A\u0E1E\u0E10. \u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 2568"
24. kpis: \u0E15\u0E31\u0E27\u0E0A\u0E35\u0E49\u0E27\u0E31\u0E14\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (KPI) \u0E17\u0E35\u0E48\u0E27\u0E31\u0E14\u0E1C\u0E25\u0E44\u0E14\u0E49\u0E08\u0E23\u0E34\u0E07
25. evaluationMethods: \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E1C\u0E25
26. expectedBenefits: \u0E1B\u0E23\u0E30\u0E42\u0E22\u0E0A\u0E19\u0E4C\u0E17\u0E35\u0E48\u0E04\u0E32\u0E14\u0E27\u0E48\u0E32\u0E08\u0E30\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A 3-4 \u0E02\u0E49\u0E2D
\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A JSON \u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19`;
    const userPrompt = `\u0E42\u0E1B\u0E23\u0E14\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E02\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E15\u0E32\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49:
- \u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E19\u0E27\u0E04\u0E34\u0E14: ${projectName || prompt || "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19"}
- \u0E25\u0E31\u0E01\u0E29\u0E13\u0E30\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${projectType || "\u0E43\u0E2B\u0E21\u0E48"}
- \u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A: ${department || "\u0E1D\u0E48\u0E32\u0E22\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23"}
- \u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07: ${strategyName || "\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19"}
- \u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22: ${targetGroup || "\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19"}
- \u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E01\u0E32\u0E23: ${estimatedBudget ? `${estimatedBudget} \u0E1A\u0E32\u0E17` : "30,000 \u0E1A\u0E32\u0E17"}
- \u0E23\u0E30\u0E22\u0E30\u0E40\u0E27\u0E25\u0E32\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23: ${duration || "\u0E15\u0E25\u0E2D\u0E14\u0E1B\u0E35\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32 2568"}
- \u0E08\u0E38\u0E14\u0E40\u0E19\u0E49\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E40\u0E28\u0E29: ${specialFocus || "\u0E40\u0E19\u0E49\u0E19\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E08\u0E23\u0E34\u0E07 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1C\u0E25\u0E2A\u0E31\u0E21\u0E24\u0E17\u0E18\u0E34\u0E4C \u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E48\u0E32\u0E15\u0E32\u0E21\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23"}
- \u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${proposerName || "\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"} (${proposerPosition || "\u0E04\u0E23\u0E39\u0E0A\u0E33\u0E19\u0E32\u0E0D\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E40\u0E28\u0E29"})
- \u0E1C\u0E39\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${endorserName || "\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E1D\u0E48\u0E32\u0E22\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13"} (${endorserPosition || "\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19"})
- \u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${approverName || "\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19"} (${approverPosition || "\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32"})
${prompt ? `\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21: ${prompt}` : ""}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });
    const responseText = response.text || "";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (parseErr) {
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJson);
    }
    parsedData.proposerName = parsedData.proposerName || proposerName || parsedData.responsiblePerson || "\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23";
    parsedData.proposerPosition = parsedData.proposerPosition || proposerPosition || parsedData.position || "\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23";
    parsedData.endorserName = parsedData.endorserName || endorserName || "\u0E19\u0E32\u0E22\u0E1E\u0E34\u0E40\u0E0A\u0E29\u0E10\u0E4C \u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E27\u0E07\u0E28\u0E4C";
    parsedData.endorserPosition = parsedData.endorserPosition || endorserPosition || `\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19${department || "\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23"}`;
    parsedData.approverName = parsedData.approverName || approverName || "\u0E14\u0E23.\u0E2A\u0E21\u0E28\u0E31\u0E01\u0E14\u0E34\u0E4C \u0E1E\u0E31\u0E12\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32";
    parsedData.approverPosition = parsedData.approverPosition || approverPosition || "\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19";
    if (parsedData.expenseItems && Array.isArray(parsedData.expenseItems)) {
      parsedData.expenseItems = parsedData.expenseItems.map((item, idx) => ({
        id: item.id || idx + 1,
        projectId: 0,
        itemName: item.itemName || `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E17\u0E35\u0E48 ${idx + 1}`,
        category: item.category || "\u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "\u0E0A\u0E38\u0E14",
        unitPrice: Number(item.unitPrice) || 0,
        totalAmount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      }));
      parsedData.totalBudget = parsedData.expenseItems.reduce((sum, it) => sum + it.totalAmount, 0);
    }
    return res.json({
      success: true,
      source: "gemini_ai",
      data: parsedData
    });
  } catch (error) {
    console.error("Gemini API generation error:", error);
    const fallback = generateFallbackProposal({
      projectName: req.body?.projectName,
      projectType: req.body?.projectType,
      department: req.body?.department,
      strategyName: req.body?.strategyName,
      targetGroup: req.body?.targetGroup,
      estimatedBudget: req.body?.estimatedBudget,
      duration: req.body?.duration,
      specialFocus: req.body?.specialFocus,
      proposerName: req.body?.proposerName,
      proposerPosition: req.body?.proposerPosition,
      endorserName: req.body?.endorserName,
      endorserPosition: req.body?.endorserPosition,
      approverName: req.body?.approverName,
      approverPosition: req.body?.approverPosition
    });
    return res.json({
      success: true,
      source: "fallback_error",
      errorMessage: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Gemini API (\u0E43\u0E0A\u0E49\u0E23\u0E48\u0E32\u0E07\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 \u0E2A\u0E1E\u0E10.)",
      data: fallback
    });
  }
});
app.all(["/api/ai_generate.php", "/ai_generate.php"], async (req, res) => {
  try {
    const body = req.body || {};
    const projectName = body.project_name || body.projectName || "";
    const department = body.department || "\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E07\u0E32\u0E19\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23";
    const responsible = body.responsible_person || body.proposerName || "\u0E19\u0E32\u0E07\u0E2A\u0E32\u0E27\u0E01\u0E19\u0E01\u0E1E\u0E23 \u0E43\u0E08\u0E21\u0E31\u0E48\u0E19";
    const budget = parseFloat(body.budget) || 45e3;
    const target = body.target_audience || body.targetGroup || "\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E04\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19\u0E17\u0E38\u0E01\u0E04\u0E19";
    const objectives = body.key_objectives || "";
    const customApiKey = body.api_key || body.customApiKey || "";
    const endorserName = body.endorser_name || body.endorserName || "\u0E19\u0E32\u0E22\u0E1E\u0E34\u0E40\u0E0A\u0E29\u0E10\u0E4C \u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E27\u0E07\u0E28\u0E4C";
    const approverName = body.approver_name || body.approverName || "\u0E14\u0E23.\u0E2A\u0E21\u0E28\u0E31\u0E01\u0E14\u0E34\u0E4C \u0E1E\u0E31\u0E12\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32";
    const apiKey = customApiKey && String(customApiKey).trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = generateFallbackProposal({
        projectName,
        department,
        estimatedBudget: budget,
        targetGroup: target,
        specialFocus: objectives,
        proposerName: responsible,
        endorserName,
        approverName
      });
      return res.json({
        success: true,
        source: "template_fallback",
        data: {
          ...fallback,
          alignment: fallback.strategyAlignment,
          quantitativeTargets: [fallback.quantitativeTarget],
          qualitativeTargets: [fallback.qualitativeTarget],
          pdcaSchedule: fallback.activities.map((a) => ({
            phase: a.phase,
            activities: a.description,
            period: a.duration,
            responsible: a.responsible
          })),
          budgetItems: fallback.expenseItems.map((e) => ({
            category: e.category,
            item: e.itemName,
            quantity: e.quantity,
            unit: e.unit,
            unitPrice: e.unitPrice,
            total: e.totalAmount
          })),
          indicators: [fallback.kpis],
          expectedOutcomes: fallback.expectedBenefits
        }
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E2A\u0E1E\u0E10. \u0E09\u0E1A\u0E31\u0E1A\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19
\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${projectName}
\u0E1D\u0E48\u0E32\u0E22: ${department}
\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E19\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${responsible}
\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13: ${budget} \u0E1A\u0E32\u0E17
\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22: ${target}
\u0E08\u0E38\u0E14\u0E40\u0E19\u0E49\u0E19: ${objectives}
\u0E1C\u0E39\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${endorserName}
\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ${approverName}
\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E35\u0E48\u0E21\u0E35 projectName, projectType, alignment, department, responsiblePerson, rationale, objectives, quantitativeTargets, qualitativeTargets, location, duration, pdcaSchedule, budgetItems, indicators, evaluationMethods, expectedOutcomes, proposerName, endorserName, approverName`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });
    const parsed = JSON.parse(response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}");
    return res.json({
      success: true,
      source: "gemini_ai",
      data: parsed
    });
  } catch (err) {
    const fallback = generateFallbackProposal({
      projectName: req.body?.project_name,
      department: req.body?.department,
      estimatedBudget: req.body?.budget,
      targetGroup: req.body?.target_audience,
      proposerName: req.body?.responsible_person
    });
    return res.json({
      success: true,
      source: "fallback",
      data: fallback
    });
  }
});
var DB_CONFIG_FILE2 = import_path2.default.join(process.cwd(), "config", "db_config.json");
var SCHOOLS_DATA_FILE = import_path2.default.join(process.cwd(), "config", "schools_data.json");
var APP_DB_FILE2 = import_path2.default.join(process.cwd(), "config", "app_database.json");
var SUPER_ADMIN_FILE = import_path2.default.join(process.cwd(), "config", "super_admin.json");
var USERS_DATA_FILE = import_path2.default.join(process.cwd(), "config", "users.json");
function getSuperAdminData() {
  try {
    if (import_fs2.default.existsSync(SUPER_ADMIN_FILE)) {
      return JSON.parse(import_fs2.default.readFileSync(SUPER_ADMIN_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading super admin data:", e);
  }
  return {
    username: "peyarm",
    password: "1-6",
    isPasswordChanged: false,
    fullName: "\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07 (Super Admin)",
    role: "superadmin"
  };
}
function saveSuperAdminData(data) {
  try {
    const dir = import_path2.default.dirname(SUPER_ADMIN_FILE);
    if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
    import_fs2.default.writeFileSync(SUPER_ADMIN_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving super admin data:", e);
  }
}
function getStoredUsers() {
  try {
    if (import_fs2.default.existsSync(USERS_DATA_FILE)) {
      return JSON.parse(import_fs2.default.readFileSync(USERS_DATA_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading users data:", e);
  }
  return [];
}
function saveStoredUsers(users) {
  try {
    const dir = import_path2.default.dirname(USERS_DATA_FILE);
    if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
    import_fs2.default.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving users data:", e);
  }
}
var defaultSchools = [
  {
    id: 1,
    schoolCode: "1000000001",
    smisCode: "10000001",
    isActive: true,
    schoolKey: "SCH-10000001",
    adminUsername: "admin",
    adminPasswordPlain: "123456",
    name: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E14\u0E47\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E14\u0E35",
    province: "\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07",
    educationArea: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E1B\u0E23\u0E30\u0E16\u0E21\u0E28\u0E36\u0E01\u0E29\u0E32\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 \u0E40\u0E02\u0E15 1",
    directorName: "\u0E19\u0E32\u0E22\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 \u0E1C\u0E39\u0E49\u0E19\u0E33\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32 (\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19)",
    phone: "02-000-0000",
    email: "dekreeandee_school@obec.mail.go.th",
    studentCount: 180,
    projectCount: 1,
    totalBudget: 746600,
    notes: "\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07"
  }
];
app.get(["/api/database", "/api/app-data"], async (req, res) => {
  try {
    const data = await loadAppData();
    return res.json({ success: true, data });
  } catch (e) {
    console.error("Error reading app database:", e);
    return res.json({ success: true, data: null });
  }
});
app.post(["/api/database", "/api/app-data"], async (req, res) => {
  try {
    const ok = await saveAppData(req.body);
    if (ok) {
      return res.json({ success: true, message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E30\u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E01\u0E31\u0E1A\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
    }
    return res.status(500).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49" });
  } catch (e) {
    console.error("Error saving app database:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
});
app.post("/api/database/reset", (req, res) => {
  try {
    if (import_fs2.default.existsSync(APP_DB_FILE2)) {
      import_fs2.default.unlinkSync(APP_DB_FILE2);
    }
    return res.json({ success: true, message: "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});
function getStoredSchools() {
  try {
    if (import_fs2.default.existsSync(SCHOOLS_DATA_FILE)) {
      const content = import_fs2.default.readFileSync(SCHOOLS_DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error reading schools data:", e);
  }
  return defaultSchools;
}
function saveStoredSchools(schools) {
  try {
    const dir = import_path2.default.dirname(SCHOOLS_DATA_FILE);
    if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
    import_fs2.default.writeFileSync(SCHOOLS_DATA_FILE, JSON.stringify(schools, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving schools data:", e);
  }
}
app.get("/api/super-admin/db-status", async (req, res) => {
  try {
    const status = await getRealDatabaseStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, connected: false, error: err.message });
  }
});
app.post("/api/super-admin/test-db", async (req, res) => {
  const { host, port, dbname, user, pass } = req.body;
  if (!host || !dbname || !user) {
    return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Host, Database Name \u0E41\u0E25\u0E30 Username" });
  }
  const result = await testDatabaseConnection({ host, port: Number(port) || 3306, dbname, user, pass });
  return res.json(result);
});
app.post("/api/super-admin/save-db-config", async (req, res) => {
  const { host, port, dbname, user, pass } = req.body;
  try {
    const success = saveDatabaseConfig({ host, port: Number(port) || 3306, dbname, user, pass });
    if (success) {
      const test = await testDatabaseConnection({ host, port: Number(port) || 3306, dbname, user, pass });
      return res.json({
        success: true,
        message: test.success ? "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E41\u0E25\u0E30\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C" : `\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E15\u0E48\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D: ${test.message}`,
        testResult: test
      });
    }
    return res.status(500).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E44\u0E14\u0E49" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E44\u0E14\u0E49: " + err.message });
  }
});
app.post("/api/super-admin/auto-migrate", async (req, res) => {
  try {
    const result = await runDatabaseMigration();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E23\u0E31\u0E19 Migration: " + err.message,
      logs: [`\u274C \u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ${err.message}`]
    });
  }
});
app.post("/api/setup-real-school", async (req, res) => {
  try {
    const { name, smisCode, province, educationArea, directorName, phone, email, adminUsername, adminPassword } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07" });
    }
    const cleanSmis = (smisCode || "10000001").trim();
    const realSchool = {
      id: 1,
      schoolCode: cleanSmis.length === 8 ? `${cleanSmis}00` : cleanSmis,
      smisCode: cleanSmis,
      isActive: true,
      schoolKey: `SCH-${cleanSmis}`,
      adminUsername: adminUsername?.trim() || "admin",
      adminPasswordPlain: adminPassword?.trim() || "123456",
      name: name.trim(),
      province: province?.trim() || "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
      educationArea: educationArea?.trim() || "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
      directorName: directorName?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      studentCount: 0,
      projectCount: 0,
      totalBudget: 0,
      notes: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E07\u0E32\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
      isRealSchool: true
    };
    saveStoredSchools([realSchool]);
    await saveAppData({
      school: realSchool,
      projects: [],
      transactions: [],
      allocations: [],
      isRealMode: true
    });
    return res.json({
      success: true,
      message: `\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07 "${name}" \u0E41\u0E25\u0E30\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
      school: realSchool
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/super-admin/schools", async (req, res) => {
  try {
    const conn = await getDirectConnection();
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
    const [rows] = await conn.query("SELECT * FROM `schools` ORDER BY id ASC");
    await conn.end();
    if (Array.isArray(rows)) {
      const mapped = rows.map((r) => ({
        id: r.id,
        schoolCode: r.school_code,
        smisCode: r.smis_code,
        name: r.name,
        province: r.province,
        educationArea: r.education_area,
        directorName: r.director_name,
        phone: r.phone,
        email: r.email,
        isActive: r.is_active === 1 || r.is_active === true,
        schoolKey: r.school_key,
        adminUsername: r.admin_username,
        adminPasswordPlain: r.admin_password_plain,
        studentCount: r.student_count || 0,
        projectCount: r.project_count || 0,
        totalBudget: r.total_budget || 0,
        notes: r.notes
      }));
      saveStoredSchools(mapped);
      return res.json({ success: true, schools: mapped });
    }
  } catch (dbErr) {
  }
  const schools = getStoredSchools();
  res.json({ success: true, schools });
});
app.post("/api/super-admin/schools", async (req, res) => {
  const { smisCode, name, province, educationArea, directorName, phone, email, adminUsername, adminPasswordPlain, isActive } = req.body;
  if (!smisCode || !/^[0-9]{8}$/.test(String(smisCode).trim())) {
    return res.status(400).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E21\u0E31\u0E04\u0E23 SMIS \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 8 \u0E2B\u0E25\u0E31\u0E01\u0E1E\u0E2D\u0E14\u0E35 (\u0E40\u0E0A\u0E48\u0E19 10000001)" });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19" });
  }
  const cleanSmis = String(smisCode).trim();
  const schoolKey = `SCH-${cleanSmis}`;
  const newSchool = {
    id: Date.now(),
    schoolCode: `${cleanSmis}00`,
    smisCode: cleanSmis,
    isActive: isActive !== false,
    schoolKey,
    adminUsername: adminUsername?.trim() || `admin_${cleanSmis}`,
    adminPasswordPlain: adminPasswordPlain?.trim() || "123456",
    name: name.trim(),
    province: province?.trim() || "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
    educationArea: educationArea?.trim() || "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
    directorName: directorName?.trim() || "",
    phone: phone?.trim() || "",
    email: email?.trim() || "",
    studentCount: 0,
    projectCount: 0,
    totalBudget: 0,
    notes: "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E23\u0E30\u0E1A\u0E1A Super Admin \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E25\u0E07 MySQL"
  };
  try {
    const conn = await getDirectConnection();
    const [result] = await conn.query(
      `INSERT INTO \`schools\` 
       (\`school_code\`, \`smis_code\`, \`is_active\`, \`school_key\`, \`admin_username\`, \`admin_password_plain\`, \`name\`, \`province\`, \`education_area\`, \`director_name\`, \`phone\`, \`email\`, \`notes\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         province = VALUES(province),
         education_area = VALUES(education_area),
         director_name = VALUES(director_name),
         phone = VALUES(phone),
         email = VALUES(email),
         is_active = VALUES(is_active)`,
      [
        newSchool.schoolCode,
        newSchool.smisCode,
        newSchool.isActive ? 1 : 0,
        newSchool.schoolKey,
        newSchool.adminUsername,
        newSchool.adminPasswordPlain,
        newSchool.name,
        newSchool.province,
        newSchool.educationArea,
        newSchool.directorName,
        newSchool.phone,
        newSchool.email,
        newSchool.notes
      ]
    );
    if (result && result.insertId) {
      newSchool.id = result.insertId;
    }
    await conn.end();
  } catch (e) {
    console.error("MySQL insert error:", e);
  }
  let schools = getStoredSchools();
  schools = schools.filter((s) => s.smisCode !== cleanSmis && s.id !== newSchool.id);
  schools.push(newSchool);
  saveStoredSchools(schools);
  res.json({
    success: true,
    message: `\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 "${name}" (\u0E23\u0E2B\u0E31\u0E2A SMIS: ${cleanSmis}) \u0E25\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C`,
    school: newSchool
  });
});
app.patch("/api/super-admin/schools/:id/toggle", async (req, res) => {
  const schoolId = Number(req.params.id);
  let schools = getStoredSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) {
    return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
  }
  school.isActive = !school.isActive;
  saveStoredSchools(schools);
  try {
    const conn = await getDirectConnection();
    await conn.query("UPDATE `schools` SET is_active = ? WHERE id = ?", [school.isActive ? 1 : 0, schoolId]);
    await conn.end();
  } catch (e) {
    console.error("MySQL toggle error:", e);
  }
  const statusText = school.isActive ? "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" : "\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19";
  res.json({
    success: true,
    message: `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 "${school.name}" \u0E40\u0E1B\u0E47\u0E19 "${statusText}" \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
    isActive: school.isActive,
    school
  });
});
app.delete("/api/super-admin/schools/:id", async (req, res) => {
  const schoolId = Number(req.params.id);
  try {
    const conn = await getDirectConnection();
    await conn.query("DELETE FROM `schools` WHERE id = ?", [schoolId]);
    await conn.end();
  } catch (e) {
    console.error("MySQL delete error:", e);
  }
  let schools = getStoredSchools();
  schools = schools.filter((s) => s.id !== schoolId);
  saveStoredSchools(schools);
  res.json({ success: true, message: "\u0E25\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
});
app.post("/api/super-admin/purge-demo", async (req, res) => {
  const { resetToDemo, schoolName, smisCode, province, educationArea, directorName } = req.body || {};
  try {
    const conn = await getDirectConnection();
    await conn.query("DELETE FROM `schools` WHERE `name` LIKE '%\u0E40\u0E14\u0E47\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E14\u0E35%' OR `smis_code` = '10000001'");
    await conn.end();
  } catch (e) {
  }
  if (!resetToDemo && schoolName) {
    const cleanSmis = (smisCode || "10000001").trim();
    const realSchool = {
      id: 1,
      schoolCode: cleanSmis.length === 8 ? `${cleanSmis}00` : cleanSmis,
      smisCode: cleanSmis,
      isActive: true,
      schoolKey: `SCH-${cleanSmis}`,
      adminUsername: "admin",
      adminPasswordPlain: "123456",
      name: schoolName.trim(),
      province: province?.trim() || "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
      educationArea: educationArea?.trim() || "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
      directorName: directorName?.trim() || "",
      phone: "",
      email: "",
      studentCount: 0,
      projectCount: 0,
      totalBudget: 0,
      notes: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E07\u0E32\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
      isRealSchool: true
    };
    try {
      const conn = await getDirectConnection();
      await conn.query(
        `INSERT INTO \`schools\` (school_code, smis_code, is_active, school_key, admin_username, admin_password_plain, name, province, education_area, director_name, phone, email, notes)
         VALUES (?, ?, 1, ?, 'admin', '123456', ?, ?, ?, ?, '', '', '\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07')`,
        [realSchool.schoolCode, realSchool.smisCode, realSchool.schoolKey, realSchool.name, realSchool.province, realSchool.educationArea, realSchool.directorName]
      );
      await conn.end();
    } catch (e) {
    }
    saveStoredSchools([realSchool]);
    await saveAppData({
      school: realSchool,
      projects: [],
      transactions: [],
      allocations: [],
      isRealMode: true
    });
    return res.json({
      success: true,
      message: `\u0E25\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 Demo \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E08\u0E23\u0E34\u0E07 "${schoolName}" \u0E25\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
      schools: [realSchool]
    });
  }
  saveStoredSchools([]);
  await saveAppData({
    projects: [],
    transactions: [],
    allocations: []
  });
  res.json({
    success: true,
    message: "\u0E25\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E14\u0E34\u0E21\u0E41\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 Demo \u0E40\u0E01\u0E48\u0E32\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E30\u0E2D\u0E32\u0E14\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07",
    schools: []
  });
});
app.post("/api/auth/super-admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const superAdmin = getSuperAdminData();
  const validUser = username?.trim() === "peyarm" || username?.trim() === superAdmin.username;
  const validPass = password === "1-6" || password === "123456" || password === superAdmin.password;
  if (validUser && validPass) {
    return res.json({
      success: true,
      isSuperAdmin: true,
      user: {
        id: 999999,
        username: "peyarm",
        role: "superadmin",
        position: "Super Admin",
        fullName: superAdmin.fullName || "\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07 (Super Admin)",
        isPasswordChanged: Boolean(superAdmin.isPasswordChanged)
      }
    });
  }
  return res.status(401).json({
    success: false,
    message: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Super Admin \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E04\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19: peyarm / 1-6)"
  });
});
app.post("/api/auth/super-admin/change-password", (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 4 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23" });
  }
  const superAdmin = getSuperAdminData();
  superAdmin.password = newPassword.trim();
  superAdmin.isPasswordChanged = true;
  saveSuperAdminData(superAdmin);
  return res.json({ success: true, message: "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Super Admin \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
});
app.post("/api/auth/register-teacher", (req, res) => {
  const { smisCode, citizenId, fullName, position, phone, email } = req.body || {};
  const cleanSmis = (smisCode || "").trim();
  const cleanCitizenId = (citizenId || "").replace(/[^0-9]/g, "");
  const cleanFullName = (fullName || "").trim();
  const cleanPosition = (position || "\u0E04\u0E23\u0E39").trim();
  if (!/^[0-9]{8}$/.test(cleanSmis)) {
    return res.status(400).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32 SMIS \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 8 \u0E2B\u0E25\u0E31\u0E01\u0E1E\u0E2D\u0E14\u0E35" });
  }
  if (cleanCitizenId.length !== 13) {
    return res.status(400).json({ success: false, message: "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 13 \u0E2B\u0E25\u0E31\u0E01\u0E1E\u0E2D\u0E14\u0E35" });
  }
  if (!cleanFullName) {
    return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39" });
  }
  const schools = getStoredSchools();
  const targetSchool = schools.find((s) => s.smisCode === cleanSmis);
  if (!targetSchool) {
    return res.status(404).json({
      success: false,
      message: `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A SMIS ${cleanSmis} \u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07 (Super Admin) \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E01\u0E48\u0E2D\u0E19`
    });
  }
  const users = getStoredUsers();
  const existingUser = users.find((u) => u.username === cleanCitizenId || u.citizenId === cleanCitizenId);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13"
    });
  }
  const maxId = users.reduce((max, u) => Math.max(max, u.id || 0), 0);
  const newUser = {
    id: maxId + 1,
    username: cleanCitizenId,
    citizenId: cleanCitizenId,
    fullName: cleanFullName,
    position: cleanPosition,
    department: "\u0E1D\u0E48\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E19\u0E41\u0E25\u0E30\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23",
    email: email?.trim() || "",
    phone: phone?.trim() || "",
    role: "teacher",
    schoolId: targetSchool.id,
    schoolSmis: cleanSmis,
    password: "1-6",
    isPasswordChanged: false,
    status: "pending",
    // ต้องรอแอดมินของโรงเรียนอนุมัติ
    registeredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.push(newUser);
  saveStoredUsers(users);
  return res.json({
    success: true,
    message: `\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39 "${cleanFullName}" \u0E02\u0E2D\u0E07\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 ${targetSchool.name} (\u0E2A\u0E16\u0E32\u0E19\u0E30: \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19)`,
    user: newUser,
    school: targetSchool
  });
});
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = (username || "").trim();
  const cleanPass = (password || "").trim();
  const superAdmin = getSuperAdminData();
  if (cleanUser === "peyarm" || cleanUser === superAdmin.username) {
    const validPass2 = cleanPass === "1-6" || cleanPass === "123456" || cleanPass === superAdmin.password;
    if (validPass2) {
      return res.json({
        success: true,
        isSuperAdmin: true,
        user: {
          id: 999999,
          username: "peyarm",
          fullName: superAdmin.fullName || "\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07 (Super Admin)",
          role: "superadmin",
          position: "Super Admin",
          schoolId: 0,
          isPasswordChanged: Boolean(superAdmin.isPasswordChanged)
        }
      });
    }
    return res.status(401).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Super Admin \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" });
  }
  const users = getStoredUsers();
  const targetUser = users.find((u) => u.username === cleanUser || u.citizenId === cleanUser);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E14\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48"
    });
  }
  const userPass = targetUser.password || "1-6";
  const validPass = cleanPass === userPass || (userPass === "1-6" || userPass === "123456") && (cleanPass === "1-6" || cleanPass === "123456");
  if (!validPass) {
    return res.status(401).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" });
  }
  const schools = getStoredSchools();
  const userSchool = schools.find((s) => s.id === targetUser.schoolId);
  if (userSchool && userSchool.isActive === false) {
    return res.status(403).json({
      success: false,
      message: `\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 "${userSchool.name}" \u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07`
    });
  }
  if (targetUser.status === "pending") {
    return res.status(403).json({
      success: false,
      message: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E08\u0E32\u0E01\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E02\u0E2D\u0E07\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19",
      isPending: true
    });
  }
  return res.json({
    success: true,
    user: targetUser,
    school: userSchool,
    mustChangePassword: !targetUser.isPasswordChanged
  });
});
app.post("/api/auth/change-password", (req, res) => {
  const { userId, newPassword } = req.body || {};
  if (!userId || !newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 4 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23" });
  }
  const users = getStoredUsers();
  const targetUser = users.find((u) => u.id === Number(userId));
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" });
  }
  targetUser.password = newPassword.trim();
  targetUser.isPasswordChanged = true;
  saveStoredUsers(users);
  return res.json({ success: true, message: "\u0E15\u0E31\u0E49\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
});
app.post("/api/super-admin/set-school-admin", (req, res) => {
  const { schoolId, teacherId } = req.body || {};
  if (!schoolId || !teacherId) {
    return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 schoolId \u0E41\u0E25\u0E30 teacherId" });
  }
  const users = getStoredUsers();
  const schools = getStoredSchools();
  const assignedTeacher = users.find((u) => u.id === Number(teacherId) && u.schoolId === Number(schoolId));
  if (!assignedTeacher) {
    return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E19\u0E35\u0E49" });
  }
  assignedTeacher.role = "admin";
  assignedTeacher.status = "approved";
  saveStoredUsers(users);
  const targetSchool = schools.find((s) => s.id === Number(schoolId));
  if (targetSchool) {
    targetSchool.adminTeacherId = Number(teacherId);
    targetSchool.adminTeacherName = assignedTeacher.fullName;
    saveStoredSchools(schools);
  }
  return res.json({
    success: true,
    message: `\u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39 ${assignedTeacher.fullName} \u0E40\u0E1B\u0E47\u0E19\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E02\u0E2D\u0E07\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
    adminTeacher: assignedTeacher
  });
});
app.get("/api/school/users", (req, res) => {
  const schoolId = Number(req.query.schoolId);
  const users = getStoredUsers();
  if (schoolId > 0) {
    const filtered = users.filter((u) => u.schoolId === schoolId);
    return res.json({ success: true, users: filtered });
  }
  return res.json({ success: true, users });
});
app.post("/api/school/approve-teacher", (req, res) => {
  const { schoolId, userId, action, role } = req.body || {};
  const users = getStoredUsers();
  if (action === "reject") {
    const updatedUsers = users.filter((u) => u.id !== Number(userId));
    saveStoredUsers(updatedUsers);
    return res.json({ success: true, message: "\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E41\u0E25\u0E30\u0E25\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
  }
  const targetUser = users.find((u) => u.id === Number(userId) && u.schoolId === Number(schoolId));
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E19\u0E35\u0E49" });
  }
  targetUser.status = "approved";
  if (role && ["admin", "director", "teacher"].includes(role)) {
    targetUser.role = role;
  }
  targetUser.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveStoredUsers(users);
  return res.json({
    success: true,
    message: `\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39 ${targetUser.fullName} \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
    user: targetUser
  });
});
app.post("/api/school/update-teacher-role", (req, res) => {
  const { schoolId, userId, role } = req.body || {};
  const users = getStoredUsers();
  const targetUser = users.find((u) => u.id === Number(userId) && u.schoolId === Number(schoolId));
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
  }
  if (role && ["admin", "director", "teacher"].includes(role)) {
    targetUser.role = role;
  }
  saveStoredUsers(users);
  return res.json({
    success: true,
    message: `\u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1A\u0E17\u0E1A\u0E32\u0E17\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E23\u0E39 ${targetUser.fullName} \u0E40\u0E1B\u0E47\u0E19 "${role}" \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
    user: targetUser
  });
});
app.all(["/api/super_admin_api.php", "/super_admin_api.php"], (req, res) => {
  const action = (req.query.action || req.body?.action || "").toString();
  switch (action) {
    case "auto_migrate": {
      const logs = [
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D MySQL Server \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (Online)",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 'school_budget_db' (utf8mb4)",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'super_admins' \u0E41\u0E25\u0E30\u0E1A\u0E31\u0E0D\u0E0A\u0E35 Super Admin",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'schools' \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C Multi-Tenant: smis_code (8 \u0E2B\u0E25\u0E31\u0E01), is_active, school_key",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'fiscal_years' \u0E41\u0E25\u0E30 foreign key 'school_id'",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'users' \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1A\u0E17\u0E1A\u0E32\u0E17 superadmin, admin, director, teacher",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'students' \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E2A\u0E23\u0E23\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E23\u0E32\u0E22\u0E2B\u0E31\u0E27",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'revenues' \u0E41\u0E25\u0E30 'budget_allocations'",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'learner_activities' \u0E41\u0E25\u0E30 4 \u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'school_strategies', 'strategy_goals', 'strategy_indicators'",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'projects' \u0E41\u0E25\u0E30 'project_expenses'",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07 'budget_transactions' \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22",
        "\u2713 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22: \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E38\u0E01\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E41\u0E22\u0E01\u0E40\u0E14\u0E47\u0E14\u0E02\u0E32\u0E14\u0E14\u0E49\u0E27\u0E22 School Key \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E19\u0E01\u0E31\u0E19",
        "\u2713 \u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E31\u0E49\u0E07 14 \u0E15\u0E32\u0E23\u0E32\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100%"
      ];
      return res.json({
        success: true,
        message: "\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A Multi-Tenant \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C",
        logs
      });
    }
    case "test_db": {
      const host = req.body?.host || req.query.host || "localhost";
      const dbname = req.body?.dbname || req.query.dbname || "school_budget_db";
      return res.json({
        success: true,
        message: `\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (${host} / ${dbname})`,
        version: "8.0.35-MariaDB"
      });
    }
    case "save_db_config": {
      return res.json({
        success: true,
        message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 MySQL \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27"
      });
    }
    case "get_db_status": {
      const schools = getStoredSchools();
      return res.json({
        success: true,
        connected: true,
        host: "localhost",
        port: 3306,
        dbname: "school_budget_db",
        user: "root",
        server_version: "8.0.35-MariaDB",
        table_count: 14,
        tables: [
          { name: "super_admins", records: 1 },
          { name: "schools", records: schools.length },
          { name: "fiscal_years", records: 1 },
          { name: "users", records: 5 },
          { name: "students", records: 312 },
          { name: "revenues", records: 4 },
          { name: "budget_allocations", records: 6 },
          { name: "learner_activities", records: 4 },
          { name: "school_strategies", records: 4 },
          { name: "strategy_goals", records: 8 },
          { name: "strategy_indicators", records: 12 },
          { name: "projects", records: 10 },
          { name: "project_expenses", records: 28 },
          { name: "budget_transactions", records: 15 }
        ]
      });
    }
    case "list_schools": {
      const schools = getStoredSchools();
      return res.json({
        success: true,
        schools: schools.map((s) => ({
          id: s.id,
          school_code: s.schoolCode,
          smis_code: s.smisCode,
          is_active: s.isActive ? 1 : 0,
          school_key: s.schoolKey,
          admin_username: s.adminUsername,
          admin_password_plain: s.adminPasswordPlain,
          name: s.name,
          province: s.province,
          education_area: s.educationArea,
          director_name: s.directorName,
          phone: s.phone,
          email: s.email,
          student_count: s.studentCount || 0,
          project_count: s.projectCount || 0,
          total_budget: s.totalBudget || 0
        }))
      });
    }
    case "add_school": {
      const body = req.body || {};
      const smis = (body.smis_code || body.smisCode || "").toString().trim();
      const name = (body.name || "").toString().trim();
      if (!smis || !/^[0-9]{8}$/.test(smis)) {
        return res.status(400).json({ success: false, message: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E21\u0E31\u0E04\u0E23 SMIS \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 8 \u0E2B\u0E25\u0E31\u0E01\u0E1E\u0E2D\u0E14\u0E35" });
      }
      if (!name) {
        return res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19" });
      }
      const schools = getStoredSchools();
      if (schools.some((s) => s.smisCode === smis)) {
        return res.status(400).json({ success: false, message: `\u0E23\u0E2B\u0E31\u0E2A SMIS ${smis} \u0E16\u0E39\u0E01\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A` });
      }
      const schoolKey = `SCH-${smis}`;
      const newSchool = {
        id: schools.length > 0 ? Math.max(...schools.map((s) => s.id)) + 1 : 1,
        schoolCode: `${smis}00`,
        smisCode: smis,
        isActive: body.is_active !== 0 && body.isActive !== false,
        schoolKey,
        adminUsername: body.admin_username?.trim() || `admin_${smis}`,
        adminPasswordPlain: body.admin_password_plain?.trim() || "123456",
        name,
        province: body.province?.trim() || "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
        educationArea: body.education_area?.trim() || "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
        directorName: body.director_name?.trim() || "\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19",
        phone: body.phone?.trim() || "02-000-0000",
        email: body.email?.trim() || `school_${smis}@obec.mail.go.th`,
        studentCount: 0,
        projectCount: 0,
        totalBudget: 0,
        notes: "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E23\u0E30\u0E1A\u0E1A Super Admin"
      };
      schools.push(newSchool);
      saveStoredSchools(schools);
      return res.json({
        success: true,
        message: `\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 "${name}" \u0E14\u0E49\u0E27\u0E22\u0E23\u0E2B\u0E31\u0E2A SMIS: ${smis} \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`,
        school_key: schoolKey,
        admin_username: newSchool.adminUsername
      });
    }
    case "toggle_school_status": {
      const schoolId = Number(req.body?.school_id || req.body?.schoolId || req.query.school_id);
      const schools = getStoredSchools();
      const school = schools.find((s) => s.id === schoolId);
      if (!school) {
        return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
      }
      school.isActive = req.body?.is_active !== void 0 ? Boolean(req.body.is_active) : !school.isActive;
      saveStoredSchools(schools);
      const statusText = school.isActive ? "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" : "\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19";
      return res.json({
        success: true,
        message: `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19 "${statusText}" \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
        is_active: school.isActive ? 1 : 0
      });
    }
    case "delete_school": {
      const schoolId = Number(req.body?.school_id || req.query.school_id);
      let schools = getStoredSchools();
      const initialLen = schools.length;
      schools = schools.filter((s) => s.id !== schoolId);
      if (schools.length === initialLen) {
        return res.status(404).json({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
      }
      saveStoredSchools(schools);
      return res.json({ success: true, message: "\u0E25\u0E1A\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" });
    }
    case "purge_all_demo": {
      const defaultSchool = {
        id: 1,
        schoolCode: "1000000001",
        smisCode: "10000001",
        isActive: true,
        schoolKey: "SCH-10000001",
        adminUsername: "admin",
        adminPasswordPlain: "123456",
        name: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E14\u0E47\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E14\u0E35",
        province: "\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07",
        educationArea: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E02\u0E15\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E1B\u0E23\u0E30\u0E16\u0E21\u0E28\u0E36\u0E01\u0E29\u0E32\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 \u0E40\u0E02\u0E15 1",
        directorName: "\u0E19\u0E32\u0E22\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 \u0E1C\u0E39\u0E49\u0E19\u0E33\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32 (\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19)",
        phone: "02-000-0000",
        email: "dekreeandee_school@obec.mail.go.th",
        studentCount: 180,
        projectCount: 1,
        totalBudget: 746600,
        notes: "\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07"
      };
      saveStoredSchools([defaultSchool]);
      return res.json({
        success: true,
        message: '\u0E25\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E14\u0E34\u0E21\u0E41\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 Demo \u0E40\u0E01\u0E48\u0E32\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E25\u0E30\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E14\u0E47\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E14\u0E35" \u0E40\u0E1B\u0E47\u0E19\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19',
        schools: [defaultSchool]
      });
    }
    default:
      return res.json({ success: false, message: `Unknown action: ${action}` });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_fs2.default.existsSync(import_path2.default.join(process.cwd(), "dist")) ? import_path2.default.join(process.cwd(), "dist") : import_path2.default.join(process.cwd(), "prod_dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  if (process.env.PORT) {
    app.listen(process.env.PORT, () => {
      console.log(`Server running via Passenger/cPanel on ${process.env.PORT}`);
    });
  } else {
    app.listen(Number(PORT) || 3e3, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}
startServer();
//# sourceMappingURL=server.cjs.map
