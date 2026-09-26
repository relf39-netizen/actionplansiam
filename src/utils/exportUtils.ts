import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { School, FiscalYear, StudentLevel, RevenueItem, BudgetAllocation, Project, BudgetTransaction } from '../types';

/**
 * ส่งออกตารางข้อมูลเป็นไฟล์ Excel (.xlsx)
 */
export function exportToExcel(
  sheetName: string,
  fileName: string,
  data: Record<string, any>[]
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * ส่งออกรายงานเป็น PDF แบบภาษาไทยพร้อมหัวเอกสารราชการ
 */
export function exportToPdf(
  title: string,
  schoolName: string,
  fiscalYear: number,
  headers: string[],
  rows: string[][],
  fileName: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(11);
  doc.text(`${schoolName} | ประจำปีงบประมาณ พ.ศ. ${fiscalYear}`, 14, 25);
  doc.text(`วันที่พิมพ์รายงาน: ${new Date().toLocaleDateString('th-TH')}`, 14, 31);

  let startY = 38;
  const colWidth = 270 / headers.length;

  // Header row
  doc.setFillColor(37, 99, 235);
  doc.rect(14, startY, 270, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  headers.forEach((h, i) => {
    doc.text(h, 16 + i * colWidth, startY + 6);
  });

  startY += 9;
  doc.setTextColor(30, 41, 59);

  rows.forEach((row, rowIndex) => {
    if (startY > 185) {
      doc.addPage();
      startY = 20;
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, startY, 270, 8, 'F');
    }
    row.forEach((cell, cellIndex) => {
      const text = String(cell || '').substring(0, 32);
      doc.text(text, 16 + cellIndex * colWidth, startY + 5.5);
    });
    startY += 8;
  });

  doc.save(`${fileName}.pdf`);
}

function sqlEscape(val?: string | null): string {
  if (!val) return '';
  return val.split("'").join("''");
}

/**
 * สร้างไฟล์ SQL Dump จากข้อมูลปัจจุบันในระบบ
 */
export function generateSqlDump(
  school: School,
  fiscalYear: FiscalYear,
  students: StudentLevel[],
  revenues: RevenueItem[],
  allocations: BudgetAllocation[],
  projects: Project[],
  transactions: BudgetTransaction[]
): string {
  const lines: string[] = [
    '-- ==========================================================',
    `-- SQL Dump: ข้อมูลแผนปฏิบัติการประจำปีและจัดสรรงบประมาณ`,
    `-- โรงเรียน: ${school.name} (ปีงบประมาณ ${fiscalYear.year})`,
    `-- ส่งออกเมื่อ: ${new Date().toISOString()}`,
    '-- ==========================================================',
    '',
    `UPDATE schools SET name='${sqlEscape(school.name)}', director_name='${sqlEscape(school.directorName)}', phone='${sqlEscape(school.phone)}', email='${sqlEscape(school.email)}' WHERE id=${school.id};`,
    '',
  ];

  // Students
  students.forEach((s) => {
    lines.push(
      `INSERT INTO students (id, school_id, fiscal_year_id, grade_level, male_count, female_count, total_count) VALUES (${s.id}, ${s.schoolId}, ${s.fiscalYearId}, '${sqlEscape(s.gradeLevel)}', ${s.maleCount}, ${s.femaleCount}, ${s.totalCount}) ON DUPLICATE KEY UPDATE male_count=${s.maleCount}, female_count=${s.femaleCount}, total_count=${s.totalCount};`
    );
  });
  lines.push('');

  // Revenues
  revenues.forEach((r) => {
    lines.push(
      `INSERT INTO revenues (id, school_id, fiscal_year_id, category, item_name, rate_per_head, eligible_count, calculated_amount, note) VALUES (${r.id}, ${r.schoolId}, ${r.fiscalYearId}, '${sqlEscape(r.category)}', '${sqlEscape(r.itemName)}', ${r.ratePerHead}, ${r.eligibleCount}, ${r.calculatedAmount}, '${sqlEscape(r.note || '')}') ON DUPLICATE KEY UPDATE calculated_amount=${r.calculatedAmount};`
    );
  });
  lines.push('');

  // Allocations
  allocations.forEach((a) => {
    lines.push(
      `INSERT INTO budget_allocations (id, school_id, fiscal_year_id, department_name, percentage, allocated_amount, spent_amount, remaining_amount) VALUES (${a.id}, ${a.schoolId}, ${a.fiscalYearId}, '${sqlEscape(a.departmentName)}', ${a.percentage}, ${a.allocatedAmount}, ${a.spentAmount}, ${a.remainingAmount}) ON DUPLICATE KEY UPDATE percentage=${a.percentage}, allocated_amount=${a.allocatedAmount};`
    );
  });
  lines.push('');

  // Projects
  projects.forEach((p) => {
    lines.push(
      `INSERT INTO projects (id, school_id, fiscal_year_id, project_code, project_name, department, budget_source, allocated_budget, spent_budget, remaining_budget, status, responsible_person) VALUES (${p.id}, ${p.schoolId}, ${p.fiscalYearId}, '${sqlEscape(p.projectCode)}', '${sqlEscape(p.projectName)}', '${sqlEscape(p.department)}', '${sqlEscape(p.budgetSource)}', ${p.allocatedBudget}, ${p.spentBudget}, ${p.remainingBudget}, '${sqlEscape(p.status)}', '${sqlEscape(p.responsiblePerson)}') ON DUPLICATE KEY UPDATE allocated_budget=${p.allocatedBudget}, spent_budget=${p.spentBudget};`
    );
  });
  lines.push('');

  // Transactions
  transactions.forEach((t) => {
    lines.push(
      `INSERT INTO budget_transactions (id, school_id, fiscal_year_id, project_id, transaction_date, item_description, amount, payee, doc_number, note, recorded_by) VALUES (${t.id}, ${t.schoolId}, ${t.fiscalYearId}, ${t.projectId}, '${t.transactionDate}', '${sqlEscape(t.itemDescription)}', ${t.amount}, '${sqlEscape(t.payee)}', '${sqlEscape(t.docNumber)}', '${sqlEscape(t.note || '')}', '${sqlEscape(t.recordedBy || '')}');`
    );
  });

  return lines.join('\n');
}

/**
 * ส่งออกข้อเสนอโครงการเป็นไฟล์เอกสาร Word (.doc / .docx compatible) 
 * ที่สามารถเปิดและแก้ไขต่อใน Microsoft Word / Google Docs ได้ทันที
 */
export function exportProjectProposalToWordDoc(
  proposal: any,
  school: School,
  fiscalYear: FiscalYear
) {
  const expenseRowsHtml = (proposal.expenseItems || [])
    .map(
      (it: any, idx: number) => `
    <tr>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${idx + 1}</td>
      <td style="border: 1px solid #333; padding: 3px;">${it.itemName || ''}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${it.category || ''}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${it.quantity || 1}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${it.unit || 'ชุด'}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: right;">${Number(it.unitPrice || 0).toLocaleString()}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: right; font-weight: bold;">${Number(it.totalAmount || 0).toLocaleString()}</td>
    </tr>
  `
    )
    .join('');

  const activityRowsHtml = (proposal.activities || [])
    .map(
      (act: any) => `
    <tr>
      <td style="border: 1px solid #333; padding: 3px; font-weight: bold;">${act.phase || ''}</td>
      <td style="border: 1px solid #333; padding: 3px;">${act.description || ''}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${act.duration || ''}</td>
      <td style="border: 1px solid #333; padding: 3px; text-align: center;">${act.responsible || ''}</td>
    </tr>
  `
    )
    .join('');

  const objectivesHtml = (proposal.objectives || [])
    .map((obj: string, i: number) => `<p style="margin: 4px 0 4px 24px;">5.${i + 1} ${obj}</p>`)
    .join('');

  const benefitsHtml = (proposal.expectedBenefits || [])
    .map((b: string, i: number) => `<p style="margin: 4px 0 4px 24px;">11.${i + 1} ${b}</p>`)
    .join('');

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${proposal.projectName || 'แบบเสนอโครงการ'}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm;
          margin: 25.4mm 25.4mm 25.4mm 25.4mm;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', 'Angsana New', sans-serif;
          font-size: 16pt;
          line-height: 1.5;
          color: #000000;
        }
        h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 4px; font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif; }
        h2 { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 0; margin-bottom: 24px; font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif; }
        p { margin: 6px 0; text-align: justify; font-size: 16pt; }
        .section-title { font-weight: bold; margin-top: 14px; margin-bottom: 4px; font-size: 16pt; }
        table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 12px 0; font-size: 11pt; overflow-wrap: anywhere; }
        th { border: 1px solid #333; padding: 3px; background-color: #f2f2f2; text-align: center; font-weight: bold; }
        td { border: 1px solid #333; padding: 3px; }
      </style>
    </head>
    <body>
      <div class="Section1">
        <h1>${String(proposal.projectName || '').startsWith('โครงการ') ? proposal.projectName : `โครงการ${proposal.projectName || ''}`}</h1>
        <h2>ตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${fiscalYear.year}</h2>
        <h2>${school.name} (${school.educationArea || school.affiliation})</h2>

        <p class="section-title">1. ชื่อโครงการ: <span style="font-weight: normal;">${proposal.projectName || ''}</span></p>
        <p class="section-title">2. ลักษณะโครงการ: <span style="font-weight: normal;">โครงการ${proposal.projectType || 'ใหม่'}</span></p>
        <p class="section-title">3. ความสอดคล้องกับยุทธศาสตร์ / นโยบาย:</p>
        <p style="margin-left: 24px;">- ${proposal.strategyAlignment || 'ยุทธศาสตร์พัฒนาคุณภาพการศึกษา สพฐ.'}</p>
        
        <p class="section-title">กลุ่มงาน / ผู้รับผิดชอบโครงการ:</p>
        <p style="margin-left: 24px;">กลุ่มงาน/ฝ่าย: <strong>${proposal.department || ''}</strong> | ผู้รับผิดชอบ: <strong>${proposal.responsiblePerson || ''}</strong> ${proposal.position ? `(${proposal.position})` : ''}</p>

        <p class="section-title">5. วัตถุประสงค์:</p>
        ${objectivesHtml || '<p style="margin-left: 24px;">- เพื่อพัฒนาคุณภาพการจัดการเรียนรู้</p>'}

        <p class="section-title">4. หลักการและเหตุผล:</p>
        ${(String(proposal.rationale || '').split(/\n\s*\n/).filter(Boolean).map((paragraph: string) => `<p style="text-indent: 40px; margin-left: 10px;">${paragraph.replace(/\n/g, '<br>')}</p>`).join(''))}

        <p class="section-title">6. เป้าหมาย:</p>
        <p style="margin-left: 24px;"><strong>6.1 เป้าหมายเชิงปริมาณ:</strong> ${proposal.quantitativeTarget || ''}</p>
        <p style="margin-left: 24px;"><strong>6.2 เป้าหมายเชิงคุณภาพ:</strong> ${proposal.qualitativeTarget || ''}</p>

        <p class="section-title">7. สถานที่และระยะเวลาดำเนินการ:</p>
        <p style="margin-left: 24px;">สถานที่: ${proposal.location || 'โรงเรียน'} | ระยะเวลา: ${proposal.timeline || 'ตลอดปีการศึกษา'}</p>

        <p class="section-title">8. ขั้นตอนและปฏิทินการดำเนินงาน (PDCA):</p>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">ขั้นตอนการดำเนินงาน</th>
              <th style="width: 45%;">รายละเอียดกิจกรรม</th>
              <th style="width: 15%;">ระยะเวลา</th>
              <th style="width: 15%;">ผู้รับผิดชอบ</th>
            </tr>
          </thead>
          <tbody>
            ${activityRowsHtml}
          </tbody>
        </table>

        <p class="section-title">9. งบประมาณและรายละเอียดค่าใช้จ่าย:</p>
        <p style="margin-left: 10px;">งบประมาณรวมทั้งสิ้น <strong>${Number(proposal.totalBudget || 0).toLocaleString()} บาท</strong> จากแหล่งงบประมาณ: ${proposal.budgetSource || 'เงินอุดหนุน สพฐ.'}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 6%;">ที่</th>
              <th style="width: 38%;">รายการค่าใช้จ่าย</th>
              <th style="width: 16%;">หมวดรายจ่าย</th>
              <th style="width: 8%;">จำนวน</th>
              <th style="width: 8%;">หน่วย</th>
              <th style="width: 12%;">ราคา/หน่วย</th>
              <th style="width: 12%;">รวมเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="6" style="border: 1px solid #333; padding: 3px; text-align: right;">รวมงบประมาณทั้งสิ้น</td>
              <td style="border: 1px solid #333; padding: 3px; text-align: right;">${Number(proposal.totalBudget || 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <p class="section-title">10. การประเมินผลและตัวชี้วัดความสำเร็จ:</p>
        <p style="margin-left: 24px;"><strong>ตัวชี้วัด (KPI):</strong> ${proposal.kpis || ''}</p>
        <p style="margin-left: 24px;"><strong>วิธีการและเครื่องมือประเมิน:</strong> ${proposal.evaluationMethods || ''}</p>

        <p class="section-title">11. ผลที่คาดว่าจะได้รับ:</p>
        ${benefitsHtml}

        <table style="width: 100%; border: none; margin-top: 40px; page-break-inside: avoid;">
          <tr style="border: none;">
            <td style="width: 50%; border: none; text-align: center; vertical-align: top; padding: 10px;">
              <p style="font-weight: bold; text-align: center;">ผู้เสนอโครงการ</p>
              <p style="margin-top: 14px;">ลงชื่อ..........................................................</p>
              <p>(${proposal.proposerName || proposal.responsiblePerson || '..........................................................'})</p>
              <p>ตำแหน่ง ${proposal.proposerPosition || proposal.position || 'ครูผู้รับผิดชอบโครงการ'}</p>
              <p>วันที่ ..... เดือน .................... พ.ศ. .........</p>
            </td>
            <td style="width: 50%; border: none; text-align: center; vertical-align: top; padding: 10px;">
              <p style="font-weight: bold; text-align: center;">ผู้เห็นชอบโครงการ</p>
              <p style="margin-top: 14px;">ลงชื่อ..........................................................</p>
              <p>(${proposal.endorserName || '..........................................................'})</p>
              <p>ตำแหน่ง ${proposal.endorserPosition || `หัวหน้ากลุ่มงาน${proposal.department || ''}`}</p>
              <p>วันที่ ..... เดือน .................... พ.ศ. .........</p>
            </td>
          </tr>
          <tr style="border: none;">
            <td colspan="2" style="border: none; text-align: center; vertical-align: top; padding-top: 25px;">
              <p style="font-weight: bold; font-size: 16pt;">คำอนุมัติของผู้อำนวยการสถานศึกษา</p>
              <p style="margin: 10px 0;">[ &nbsp; ] อนุมัติ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] ไม่อนุมัติ เนื่องจาก ..............................................................</p>
              <br/>
              <p>(ลงชื่อ).......................................................... ผู้อนุมัติโครงการ</p>
              <p style="font-weight: bold;">(${proposal.approverName || school.directorName})</p>
              <p>ตำแหน่ง ${proposal.approverPosition || `ผู้อำนวยการโรงเรียน${school.name}`}</p>
              <p>วันที่ ..... เดือน .................... พ.ศ. .........</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = (proposal.projectName || 'โครงการ').replace(/[\/\\?%*:|"<>]/g, '_');
  link.download = `${safeTitle}_ปี${fiscalYear.year}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ส่งออกบันทึกรายการค่าใช้จ่ายโครงการเป็นไฟล์ Microsoft Word (.doc)
 */
export function exportProjectExpenseRecordToWordDoc(
  project: Project,
  school: School,
  fiscalYear: FiscalYear
) {
  const items = project.expenseItems && project.expenseItems.length > 0
    ? project.expenseItems
    : (project.fullProposalDetails?.expenseItems || []);

  const expenseRowsHtml = items.length > 0
    ? items.map((item: any, idx: number) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${item.itemName}</td>
          <td style="text-align: center;">${item.category || 'ค่าใช้สอย'}</td>
          <td style="text-align: right;">${item.quantity.toLocaleString()}</td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: right;">${item.unitPrice.toLocaleString()}</td>
          <td style="text-align: right;">${item.totalAmount.toLocaleString()}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="7" style="text-align: center; color: #666; padding: 12px;">ยังไม่มีรายการค่าใช้จ่ายย่อย</td>
        </tr>
      `;

  const totalBudget = Number(project.allocatedBudget || 0);
  const spentBudget = Number(project.spentBudget || 0);
  const remainingBudget = Number(project.remainingBudget ?? (totalBudget - spentBudget));

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>บันทึกรายการค่าใช้จ่าย - ${project.projectName}</title>
      <style>
        @page Section1 {
          size: 210mm 297mm;
          margin: 25.4mm 25.4mm 25.4mm 25.4mm;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
          font-size: 16pt;
          line-height: 1.5;
          color: #000000;
        }
        h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 0; margin-bottom: 18px; }
        p { margin: 6px 0; text-align: justify; font-size: 16pt; }
        .memo-header { font-weight: bold; font-size: 17pt; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14pt; }
        th { border: 1px solid #333; padding: 6px; background-color: #f2f2f2; text-align: center; font-weight: bold; }
        td { border: 1px solid #333; padding: 6px; }
      </style>
    </head>
    <body>
      <div class="Section1">
        <div class="memo-header">
          บันทึกรายการค่าใช้จ่ายตามโครงการที่ได้รับอนุมัติ<br/>
          แผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${fiscalYear.year}
        </div>
        <h2>${school.name} (${school.educationArea || school.affiliation})</h2>

        <p><strong>โครงการ:</strong> ${project.projectName}</p>
        <p><strong>รหัสโครงการ:</strong> ${project.projectCode} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>กลุ่มงาน/ฝ่าย:</strong> ${project.department}</p>
        <p><strong>ผู้รับผิดชอบโครงการ:</strong> ${project.responsiblePerson}</p>
        <p><strong>ผู้อนุมัติโครงการ:</strong> ${project.approvedBy || school.directorName} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>วันที่อนุมัติ:</strong> ${project.approvedDate || 'อนุมัติตามแผน'}</p>

        <p style="margin-top: 14px; font-weight: bold;">สรุปวงเงินงบประมาณโครงการ:</p>
        <p style="margin-left: 20px;">
          - วงเงินงบประมาณที่ได้รับอนุมัติ: <strong>${totalBudget.toLocaleString()} บาท</strong><br/>
          - งบประมาณที่เบิกจ่าย/ใช้ไปแล้ว: <strong>${spentBudget.toLocaleString()} บาท</strong><br/>
          - งบประมาณคงเหลือ: <strong style="color: #059669;">${remainingBudget.toLocaleString()} บาท</strong>
        </p>

        <p style="margin-top: 14px; font-weight: bold;">รายละเอียดรายการค่าใช้จ่ายจำแนกตามหมวด (4 หมวด สพฐ.):</p>
        <table>
          <thead>
            <tr>
              <th style="width: 6%;">ที่</th>
              <th style="width: 38%;">รายการค่าใช้จ่าย</th>
              <th style="width: 16%;">หมวดรายจ่าย</th>
              <th style="width: 8%;">จำนวน</th>
              <th style="width: 8%;">หน่วย</th>
              <th style="width: 12%;">ราคา/หน่วย</th>
              <th style="width: 12%;">รวมเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="6" style="border: 1px solid #333; padding: 6px; text-align: right;">รวมงบประมาณทั้งสิ้น</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: right;">${totalBudget.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; border: none; margin-top: 40px; page-break-inside: avoid;">
          <tr style="border: none;">
            <td style="width: 33%; border: none; text-align: center; vertical-align: top; padding: 8px;">
              <p>(ลงชื่อ)..........................................................</p>
              <p>(${project.responsiblePerson})</p>
              <p>ผู้รับผิดชอบโครงการ</p>
              <p>วันที่ ...../...../.........</p>
            </td>
            <td style="width: 33%; border: none; text-align: center; vertical-align: top; padding: 8px;">
              <p>(ลงชื่อ)..........................................................</p>
              <p>(นายวางแผน รอบคอบ)</p>
              <p>เจ้าหน้าที่แผนงานและงบประมาณ</p>
              <p>วันที่ ...../...../.........</p>
            </td>
            <td style="width: 33%; border: none; text-align: center; vertical-align: top; padding: 8px;">
              <p>(ลงชื่อ)..........................................................</p>
              <p>(${school.directorName})</p>
              <p>ผู้อำนวยการสถานศึกษา</p>
              <p>วันที่ ...../...../.........</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = (project.projectName || 'บันทึกค่าใช้จ่ายโครงการ').replace(/[\/\\?%*:|"<>]/g, '_');
  link.download = `บันทึกค่าใช้จ่าย_${safeTitle}_${project.projectCode}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
