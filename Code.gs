/**
 * ==============================================================================
 * Google Apps Script (Code.gs) for School Budget & Action Plan System
 * ระบบบริหารจัดการแผนปฏิบัติการประจำปีและจัดสรรงบประมาณโรงเรียน (สพฐ.)
 * รองรับการเชื่อมต่อ Web App, Google Sheets และ Gemini API บน Google Workspace
 * ==============================================================================
 * 
 * วิธีการติดตั้งบน Google Apps Script:
 * 1. เปิด Google Sheets ใหม่ (หรือที่ต้องการใช้เป็นฐานข้อมูล)
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. วางโค้ดนี้ลงในไฟล์ Code.gs (แทนที่โค้ดเดิมทั้งหมด)
 * 4. ไปที่ Project Settings (ไอคอนรูปฟันเฟือง) > Script Properties (คุณสมบัติของสคริปต์)
 *    - เพิ่มตัวแปร: GEMINI_API_KEY = (API Key ของคุณ)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 *    - ประเภท: เว็บแอป (Web app)
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 * 6. คัดลอก Web App URL นำไปวางในระบบเพื่อซิงค์ข้อมูลสองทางแบบเรียลไทม์
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURATION & CONSTANTS
// -----------------------------------------------------------------------------
var SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
var GEMINI_MODEL = "gemini-2.5-flash";

var SHEETS = {
  METADATA: "System_Config",
  SCHOOL: "School_Profile",
  FISCAL_YEARS: "Fiscal_Years",
  USERS: "Users",
  STUDENTS: "Students",
  REVENUES: "Revenues",
  ALLOCATIONS: "Budget_Allocations",
  LEARNER_ACTIVITIES: "Learner_Activities",
  STRATEGIES: "Strategies",
  PROJECTS: "Projects",
  EXPENSES: "Project_Expenses",
  TRANSACTIONS: "Disbursements"
};

// -----------------------------------------------------------------------------
// 2. WEB APP ENTRY POINTS (doGet & doPost)
// -----------------------------------------------------------------------------

/**
 * Handles HTTP GET requests
 * Parameters:
 *   ?action=ping
 *   ?action=pull_all
 *   ?action=get_projects
 *   ?action=status
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "status";
  var result = {};

  try {
    switch (action) {
      case "ping":
        result = {
          success: true,
          status: "connected",
          message: "Google Apps Script Web App (Code.gs) is online and ready.",
          timestamp: new Date().toISOString()
        };
        break;

      case "status":
        result = getSystemStatus();
        break;

      case "pull_all":
        result = {
          success: true,
          data: getAllSheetData(),
          timestamp: new Date().toISOString()
        };
        break;

      case "get_projects":
        result = {
          success: true,
          projects: getSheetRows(SHEETS.PROJECTS)
        };
        break;

      default:
        result = {
          success: true,
          message: "School Budget GAS API is active. Action: " + action,
          endpoints: ["ping", "status", "pull_all", "get_projects"]
        };
        break;
    }
  } catch (error) {
    result = {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests
 * Supported actions:
 *   - init_database: สร้าง Sheets และ Headers ทั้งหมด
 *   - push_all: บันทึกข้อมูลทั้งหมดจาก React ลง Google Sheets
 *   - generate_project_ai: เรียกใช้ Gemini API ผ่าน UrlFetchApp
 *   - add_project: บันทึกข้อเสนอโครงการใหม่
 *   - record_disbursement: บันทึกการเบิกจ่ายงบประมาณ
 */
function doPost(e) {
  var response = {};

  try {
    var rawData = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawData);
    var action = payload.action || (e.parameter ? e.parameter.action : "");

    switch (action) {
      case "init_database":
        response = initializeAllSheets();
        break;

      case "push_all":
        response = saveAllDataToSheets(payload.data || payload);
        break;

      case "generate_project_ai":
        response = callGeminiAI(payload);
        break;

      case "add_project":
        response = appendProjectRow(payload.project);
        break;

      case "record_disbursement":
        response = appendTransactionRow(payload.transaction);
        break;

      default:
        response = {
          success: false,
          error: "Unknown or missing action: " + action
        };
        break;
    }
  } catch (err) {
    response = {
      success: false,
      error: err.toString(),
      stack: err.stack
    };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// -----------------------------------------------------------------------------
// 3. DATABASE INITIALIZATION & SCHEMA CREATION
// -----------------------------------------------------------------------------

function initializeAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var schemas = [
    {
      name: SHEETS.METADATA,
      headers: ["Key", "Value", "Description", "Last_Updated"]
    },
    {
      name: SHEETS.SCHOOL,
      headers: ["ID", "School_Code", "SMIS_Code", "Name", "Education_Area", "Affiliation", "Director_Name", "Phone", "Email", "Province", "Zipcode"]
    },
    {
      name: SHEETS.FISCAL_YEARS,
      headers: ["ID", "Year", "Is_Active", "Start_Date", "End_Date", "Total_Students", "Teacher_Count", "Is_Proposal_Open", "Proposal_Notice"]
    },
    {
      name: SHEETS.USERS,
      headers: ["ID", "Username", "Citizen_ID", "Full_Name", "Email", "Role", "Department", "Position", "Phone", "Is_Active"]
    },
    {
      name: SHEETS.STUDENTS,
      headers: ["ID", "Grade_Level", "Stage", "Male_Count", "Female_Count", "Total_Count", "Fiscal_Year_ID"]
    },
    {
      name: SHEETS.REVENUES,
      headers: ["ID", "Category", "Item_Name", "Rate_Per_Head", "Eligible_Count", "Calculated_Amount", "Is_Custom_Rate", "Note", "Fiscal_Year_ID"]
    },
    {
      name: SHEETS.ALLOCATIONS,
      headers: ["ID", "Department_Name", "Percentage", "Allocated_Amount", "Spent_Amount", "Remaining_Amount", "Color_Hex", "Is_Cut_Confirmed", "Fiscal_Year_ID"]
    },
    {
      name: SHEETS.LEARNER_ACTIVITIES,
      headers: ["ID", "Activity_Name", "Percentage", "Allocated_Amount", "Spent_Amount", "Remaining_Amount", "Note", "Fiscal_Year_ID"]
    },
    {
      name: SHEETS.STRATEGIES,
      headers: ["ID", "Code", "Name", "Fiscal_Year_ID"]
    },
    {
      name: SHEETS.PROJECTS,
      headers: [
        "ID", "Code", "Name", "Type", "Department", "Strategy", "Proposer_Name", "Proposer_Position",
        "Endorser_Name", "Endorser_Position", "Approver_Name", "Approver_Position", "Allocated_Budget",
        "Spent_Budget", "Remaining_Budget", "Status", "Fiscal_Year", "Rationale", "Objectives", "KPIs", "Is_Cut_Confirmed"
      ]
    },
    {
      name: SHEETS.EXPENSES,
      headers: ["ID", "Project_ID", "Item_Name", "Category", "Quantity", "Unit", "Unit_Price", "Total_Amount"]
    },
    {
      name: SHEETS.TRANSACTIONS,
      headers: ["ID", "Project_ID", "Project_Name", "Doc_Number", "Disbursement_Date", "Item_Name", "Amount", "Recipient", "Payer", "Status"]
    }
  ];

  var createdCount = 0;
  schemas.forEach(function(schema) {
    var sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      createdCount++;
    }
    // Set headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      sheet.getRange(1, 1, 1, schema.headers.length)
        .setBackground("#1e3a8a")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  });

  return {
    success: true,
    message: "เตรียมโครงสร้างฐานข้อมูลใน Google Sheets เรียบร้อยแล้ว (" + schemas.length + " ตาราง)",
    spreadsheetUrl: ss.getUrl()
  };
}

// -----------------------------------------------------------------------------
// 4. DATA SYNCHRONIZATION (Push & Pull)
// -----------------------------------------------------------------------------

function saveAllDataToSheets(data) {
  if (!data) throw new Error("No data payload provided");
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. School Profile
  if (data.school) {
    var schoolSheet = getOrCreateSheet(SHEETS.SCHOOL, [
      "ID", "School_Code", "SMIS_Code", "Name", "Education_Area", "Affiliation", "Director_Name", "Phone", "Email", "Province", "Zipcode"
    ]);
    clearDataRows(schoolSheet);
    var s = data.school;
    schoolSheet.appendRow([
      s.id || 1, s.schoolCode || "", s.smisCode || "", s.name || "", s.educationArea || "",
      s.affiliation || "", s.directorName || "", s.phone || "", s.email || "", s.province || "", s.zipcode || ""
    ]);
  }

  // 2. Fiscal Years
  if (Array.isArray(data.fiscalYears)) {
    var fySheet = getOrCreateSheet(SHEETS.FISCAL_YEARS, [
      "ID", "Year", "Is_Active", "Start_Date", "End_Date", "Total_Students", "Teacher_Count", "Is_Proposal_Open", "Proposal_Notice"
    ]);
    clearDataRows(fySheet);
    data.fiscalYears.forEach(function(fy) {
      fySheet.appendRow([
        fy.id, fy.year, fy.isActive ? 1 : 0, fy.startDate || "", fy.endDate || "",
        fy.totalStudents || 0, fy.teacherCount || 0, fy.isProposalOpen ? 1 : 0, fy.proposalNotice || ""
      ]);
    });
  }

  // 3. Projects
  if (Array.isArray(data.projects)) {
    var pSheet = getOrCreateSheet(SHEETS.PROJECTS, [
      "ID", "Code", "Name", "Type", "Department", "Strategy", "Proposer_Name", "Proposer_Position",
      "Endorser_Name", "Endorser_Position", "Approver_Name", "Approver_Position", "Allocated_Budget",
      "Spent_Budget", "Remaining_Budget", "Status", "Fiscal_Year", "Rationale", "Objectives", "KPIs", "Is_Cut_Confirmed"
    ]);
    clearDataRows(pSheet);
    data.projects.forEach(function(p) {
      pSheet.appendRow([
        p.id, p.code || "", p.name || "", p.type || "ใหม่", p.department || "", p.strategy || "",
        p.proposerName || p.responsiblePerson || "", p.proposerPosition || p.position || "",
        p.endorserName || "", p.endorserPosition || "", p.approverName || "", p.approverPosition || "",
        p.allocatedBudget || 0, p.spentBudget || 0, p.remainingBudget || 0,
        p.status || "approved", p.fiscalYear || 2568,
        p.rationale || "", Array.isArray(p.objectives) ? p.objectives.join("\n") : (p.objectives || ""),
        p.kpis || "", p.isCutConfirmed ? 1 : 0
      ]);
    });
  }

  // 4. Budget Allocations
  if (Array.isArray(data.allocations)) {
    var aSheet = getOrCreateSheet(SHEETS.ALLOCATIONS, [
      "ID", "Department_Name", "Percentage", "Allocated_Amount", "Spent_Amount", "Remaining_Amount", "Color_Hex", "Is_Cut_Confirmed", "Fiscal_Year_ID"
    ]);
    clearDataRows(aSheet);
    data.allocations.forEach(function(a) {
      aSheet.appendRow([
        a.id, a.departmentName || "", a.percentage || 0, a.allocatedAmount || 0,
        a.spentAmount || 0, a.remainingAmount || 0, a.colorHex || "#3b82f6",
        a.isCutConfirmed ? 1 : 0, a.fiscalYearId || 1
      ]);
    });
  }

  // 5. Revenues
  if (Array.isArray(data.revenues)) {
    var rSheet = getOrCreateSheet(SHEETS.REVENUES, [
      "ID", "Category", "Item_Name", "Rate_Per_Head", "Eligible_Count", "Calculated_Amount", "Is_Custom_Rate", "Note", "Fiscal_Year_ID"
    ]);
    clearDataRows(rSheet);
    data.revenues.forEach(function(r) {
      rSheet.appendRow([
        r.id, r.category || "", r.itemName || "", r.ratePerHead || 0,
        r.eligibleCount || 0, r.calculatedAmount || 0, r.isCustomRate ? 1 : 0,
        r.note || "", r.fiscalYearId || 1
      ]);
    });
  }

  return {
    success: true,
    message: "บันทึกและซิงค์ข้อมูลทั้งหมดลง Google Sheets สำเร็จแล้ว",
    updatedAt: new Date().toISOString()
  };
}

function getAllSheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    school: getSheetRows(SHEETS.SCHOOL)[0] || null,
    fiscalYears: getSheetRows(SHEETS.FISCAL_YEARS),
    users: getSheetRows(SHEETS.USERS),
    students: getSheetRows(SHEETS.STUDENTS),
    revenues: getSheetRows(SHEETS.REVENUES),
    allocations: getSheetRows(SHEETS.ALLOCATIONS),
    learnerActivities: getSheetRows(SHEETS.LEARNER_ACTIVITIES),
    projects: getSheetRows(SHEETS.PROJECTS),
    expenses: getSheetRows(SHEETS.EXPENSES),
    transactions: getSheetRows(SHEETS.TRANSACTIONS)
  };
}

// -----------------------------------------------------------------------------
// 5. GEMINI AI PROJECT PROPOSAL GENERATION (Apps Script Native)
// -----------------------------------------------------------------------------

function callGeminiAI(params) {
  var apiKey = params.apiKey || SCRIPT_PROPERTIES.getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return generateFallbackProposalGAS(params);
  }

  var projectName = params.projectName || "โครงการพัฒนาคุณภาพการจัดการศึกษา";
  var dept = params.department || "ฝ่ายบริหารงานวิชาการ";
  var budget = params.estimatedBudget || 30000;
  var target = params.targetGroup || "นักเรียนและครูผู้สอนทุกคน";
  var focus = params.specialFocus || "เน้นการพัฒนาทักษะและการเรียนรู้เชิงรุก";

  var systemInstruction = "คุณคือผู้เชี่ยวชาญการเขียนข้อเสนอโครงการมาตรฐานของสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) กระทรวงศึกษาธิการ " +
    "หน้าที่ของคุณคือเขียนโครงร่างโครงการการศึกษาที่สมบูรณ์ เป็นทางการ ตอบกลับเป็น JSON ภาษาไทยที่มี " +
    "projectCode, projectName, projectType, department, strategyAlignment, responsiblePerson, position, " +
    "proposerName, proposerPosition, endorserName, endorserPosition, approverName, approverPosition, " +
    "rationale, objectives, quantitativeTarget, qualitativeTarget, timeline, location, activities, expenseItems, totalBudget, budgetSource, kpis, evaluationMethods, expectedBenefits";

  var userPrompt = "โปรดช่วยเขียนและเสนอโครงการทางการศึกษาตามข้อมูลต่อไปนี้:\n" +
    "- ชื่อโครงการ: " + projectName + "\n" +
    "- ฝ่ายที่รับผิดชอบ: " + dept + "\n" +
    "- งบประมาณ: " + budget + " บาท\n" +
    "- กลุ่มเป้าหมาย: " + target + "\n" +
    "- จุดเน้นพิเศษ: " + focus + "\n" +
    "- ผู้เสนอ: " + (params.proposerName || "ครูผู้รับผิดชอบโครงการ") + "\n" +
    "- ผู้เห็นชอบ: " + (params.endorserName || "หัวหน้ากลุ่มงาน") + "\n" +
    "- ผู้อนุมัติ: " + (params.approverName || "ผู้อำนวยการโรงเรียน") + "\n" +
    "ตอบเป็น JSON ที่ถูกต้องเท่านั้น";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey);

  var payload = {
    contents: [
      { role: "user", parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch(url, options);
  var statusCode = res.getResponseCode();
  var resText = res.getContentText();

  if (statusCode >= 200 && statusCode < 300) {
    var parsed = JSON.parse(resText);
    var candidateText = parsed.candidates[0].content.parts[0].text;
    var projectData = JSON.parse(candidateText.replace(/```json/g, "").replace(/```/g, "").trim());
    return {
      success: true,
      source: "gemini_ai_gas",
      data: projectData
    };
  } else {
    // If Gemini failed or quota exceeded, return fallback
    return {
      success: true,
      source: "fallback_gas",
      errorMessage: "Gemini HTTP " + statusCode + ": " + resText,
      data: generateFallbackProposalGAS(params).data
    };
  }
}

function generateFallbackProposalGAS(params) {
  var name = params.projectName || "โครงการพัฒนาคุณภาพการศึกษาและศักยภาพผู้เรียน";
  var dept = params.department || "ฝ่ายบริหารงานวิชาการ";
  var budget = Number(params.estimatedBudget) > 0 ? Number(params.estimatedBudget) : 30000;
  var proposer = params.proposerName || "นางสาวกนกพร ใจมั่น";
  var endorser = params.endorserName || "นายพิเชษฐ์ ปัญญาวงศ์";
  var approver = params.approverName || "ดร.สมศักดิ์ พัฒนศึกษา";

  var remBudget = Math.round(budget * 0.2);
  var operBudget = Math.round(budget * 0.45);
  var matBudget = budget - remBudget - operBudget;

  return {
    success: true,
    source: "template_fallback_gas",
    data: {
      projectCode: "กค.01/2568",
      projectName: name,
      projectType: "ใหม่",
      department: dept,
      strategyAlignment: "ยุทธศาสตร์ที่ 1 พัฒนาคุณภาพและมาตรฐานการศึกษาขั้นพื้นฐาน",
      responsiblePerson: proposer,
      position: "ครูชำนาญการพิเศษ",
      proposerName: proposer,
      proposerPosition: "ครูชำนาญการพิเศษ",
      endorserName: endorser,
      endorserPosition: "หัวหน้ากลุ่มงาน" + dept,
      approverName: approver,
      approverPosition: "ผู้อำนวยการโรงเรียน",
      rationale: "ตามพระราชบัญญัติการศึกษาแห่งชาติ พ.ศ. 2542 และนโยบาย สพฐ. มุ่งเน้นการพัฒนาผู้เรียนให้มีสมรรถนะสำคัญตามหลักสูตร จึงได้จัดทำ " + name + " เพื่อขับเคลื่อนการพัฒนาอย่างยั่งยืน",
      objectives: [
        "เพื่อส่งเสริมและพัฒนาศักยภาพของผู้เรียนให้สอดคล้องกับมาตรฐานตามหลักสูตร",
        "เพื่อยกระดับผลสัมฤทธิ์และกระบวนการจัดการเรียนรู้เชิงรุก (Active Learning)",
        "เพื่อส่งเสริมความร่วมมือระหว่างบุคลากรทางการศึกษาในการพัฒนาสถานศึกษา"
      ],
      quantitativeTarget: "นักเรียนและครูผู้สอนไม่น้อยกว่าร้อยละ 85 เข้าร่วมกิจกรรมและผ่านเกณฑ์การประเมิน",
      qualitativeTarget: "ผู้เข้าร่วมโครงการมีความพึงพอใจในระดับดีมาก และมีสมรรถนะผ่านเกณฑ์มาตรฐาน",
      timeline: "ตลอดปีการศึกษา 2568",
      location: "โรงเรียนและแหล่งเรียนรู้ที่เกี่ยวข้อง",
      activities: [
        { phase: "1. ขั้นเตรียมการ (Plan)", description: "ประชุมวางแผน ชี้แจงคณะทำงาน และแต่งตั้งคณะกรรมการดำเนินงาน", duration: "พฤษภาคม 2568", responsible: proposer },
        { phase: "2. ขั้นดำเนินการ (Do)", description: "ดำเนินกิจกรรมหลักตามโครงการ อบรมเชิงปฏิบัติการและพัฒนาทักษะ", duration: "มิถุนายน - ธันวาคม 2568", responsible: "คณะทำงานประจำโครงการ" },
        { phase: "3. ขั้นติดตามประเมินผล (Check)", description: "นิเทศติดตามผลการดำเนินงาน และประเมินตามแบบวัดความสำเร็จ", duration: "มกราคม 2569", responsible: "คณะกรรมการนิเทศติดตาม" },
        { phase: "4. ขั้นรายงานผล (Action)", description: "สรุปและจัดทำรายงานผลการดำเนินโครงการเพื่อนำเสนอผู้บริหาร", duration: "กุมภาพันธ์ - มีนาคม 2569", responsible: proposer }
      ],
      expenseItems: [
        { id: 1, itemName: "ค่าตอบแทนวิทยากรผู้ทรงคุณวุฒิ", category: "ค่าตอบแทน", quantity: 1, unit: "รายการ", unitPrice: remBudget, totalAmount: remBudget },
        { id: 2, itemName: "ค่าอาหารกลางวันและอาหารว่างสำหรับผู้เข้าร่วมกิจกรรม", category: "ค่าใช้สอย", quantity: 1, unit: "รายการ", unitPrice: operBudget, totalAmount: operBudget },
        { id: 3, itemName: "ค่าวัสดุ อุปกรณ์ และเอกสารประกอบการจัดกิจกรรม", category: "ค่าวัสดุ", quantity: 1, unit: "ชุด", unitPrice: matBudget, totalAmount: matBudget }
      ],
      totalBudget: budget,
      budgetSource: "เงินอุดหนุนรายหัว สพฐ. / แผนปฏิบัติการประจำปี",
      kpis: "ร้อยละ 85 ของผู้เข้าร่วมโครงการมีผลการประเมินผ่านเกณฑ์ที่กำหนดในระดับดีขึ้นไป",
      evaluationMethods: "แบบประเมิน แบบสังเกต และแบบสอบถามความพึงพอใจ",
      expectedBenefits: [
        "ผู้เรียนได้รับการพัฒนาทักษะและสมรรถนะอย่างเต็มศักยภาพ",
        "สถานศึกษามีผลสัมฤทธิ์ทางการศึกษาที่สูงขึ้นตามเป้าหมายของ สพฐ."
      ]
    }
  };
}

// -----------------------------------------------------------------------------
// 6. HELPER UTILITIES
// -----------------------------------------------------------------------------

function getSystemStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(s) { return s.getName(); });
  var hasApiKey = Boolean(SCRIPT_PROPERTIES.getProperty("GEMINI_API_KEY"));

  return {
    success: true,
    spreadsheetTitle: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    totalSheets: sheets.length,
    sheets: sheetNames,
    hasGeminiApiKey: hasApiKey,
    geminiModel: GEMINI_MODEL,
    timeZone: ss.getSpreadsheetTimeZone(),
    timestamp: new Date().toISOString()
  };
}

function getOrCreateSheet(sheetName, defaultHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      sheet.getRange(1, 1, 1, defaultHeaders.length)
        .setBackground("#1e3a8a")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function getSheetRows(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = toCamelCase(headers[j]);
      rowObj[key] = values[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

function toCamelCase(str) {
  if (!str) return "";
  return str.toString()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, function(match, chr) {
      return chr.toUpperCase();
    });
}
