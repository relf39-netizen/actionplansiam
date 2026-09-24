import React, { useState } from 'react';
import {
  School,
  FiscalYear,
  StudentLevel,
  RevenueItem,
  BudgetAllocation,
  LearnerActivity,
  Project,
  BudgetTransaction,
} from '../types';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';

interface ReportsViewProps {
  school: School;
  activeFiscalYear: FiscalYear;
  students: StudentLevel[];
  revenues: RevenueItem[];
  allocations: BudgetAllocation[];
  activities: LearnerActivity[];
  projects: Project[];
  transactions: BudgetTransaction[];
}

export type ReportType =
  | 'annual_plan'
  | 'revenue'
  | 'department_allocation'
  | 'all_projects'
  | 'project_expenses'
  | 'disbursements'
  | 'budget_summary';

export const ReportsView: React.FC<ReportsViewProps> = ({
  school,
  activeFiscalYear,
  students,
  revenues,
  allocations,
  activities,
  projects,
  transactions,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('annual_plan');

  const reportList: { id: ReportType; title: string; desc: string }[] = [
    {
      id: 'annual_plan',
      title: '1. รายงานแผนปฏิบัติการประจำปี',
      desc: 'สรุปโครงการตามแผน วัตถุประสงค์ ตัวชี้วัด และงบประมาณจัดสรร',
    },
    {
      id: 'revenue',
      title: '2. รายงานประมาณการรายรับ',
      desc: 'เงินอุดหนุนรายหัว Top Up หนังสือ เครื่องแบบ อุปกรณ์ กิจกรรมพัฒนาผู้เรียน',
    },
    {
      id: 'department_allocation',
      title: '3. รายงานการจัดสรรงบประมาณตามฝ่าย',
      desc: 'สรุปสัดส่วนร้อยละ วงเงินจัดสรร และการใช้จ่ายตามกลุ่มงานบริหาร',
    },
    {
      id: 'all_projects',
      title: '4. รายงานงบประมาณโครงการทั้งหมด',
      desc: 'รหัสโครงการ ผู้รับผิดชอบ งบจัดสรร งบใช้ไป และงบคงเหลือ',
    },
    {
      id: 'project_expenses',
      title: '5. รายงานรายละเอียดค่าใช้จ่ายโครงการ',
      desc: 'จำแนกหมวดค่าตอบแทน ค่าใช้สอย ค่าวัสดุ ค่าครุภัณฑ์ รายโครงการ',
    },
    {
      id: 'disbursements',
      title: '6. รายงานการเบิกจ่ายงบประมาณ',
      desc: 'ประวัติบันทึกการเบิกจ่าย เลขที่เอกสาร ร้านค้า/ผู้รับเงิน',
    },
    {
      id: 'budget_summary',
      title: '7. รายงานสรุปงบประมาณคงเหลือ',
      desc: 'เปรียบเทียบงบประมาณที่ได้รับ กับงบประมาณใช้ไปจริงและยอดคงเหลือ',
    },
  ];

  const currentReportObj = reportList.find((r) => r.id === selectedReport) || reportList[0];

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    let sheetName = currentReportObj.title.substring(3);
    let fileName = `รายงาน_${sheetName}_ปี${activeFiscalYear.year}`;
    let data: any[] = [];

    switch (selectedReport) {
      case 'annual_plan':
        data = projects.map((p, i) => ({
          ลำดับ: i + 1,
          รหัส: p.projectCode,
          ชื่อโครงการ: p.projectName,
          ฝ่าย: p.department,
          วัตถุประสงค์: p.objectives,
          'ตัวชี้วัด (KPI)': p.kpi,
          'งบจัดสรร (บาท)': p.allocatedBudget,
          ผู้รับผิดชอบ: p.responsiblePerson,
          ระยะเวลา: p.duration,
          สถานะ: p.status,
        }));
        break;
      case 'revenue':
        data = revenues.map((r, i) => ({
          ลำดับ: i + 1,
          รายการรายรับ: r.itemName,
          'อัตราต่อคน (บาท)': r.ratePerHead,
          'จำนวนผู้มีสิทธิ์ (คน)': r.eligibleCount,
          'จำนวนเงินรวม (บาท)': r.calculatedAmount,
          หมายเหตุ: r.note || '',
        }));
        break;
      case 'department_allocation':
        data = allocations.map((a, i) => ({
          ลำดับ: i + 1,
          ฝ่ายงาน: a.departmentName,
          'สัดส่วน (%)': a.percentage,
          'งบจัดสรร (บาท)': a.allocatedAmount,
          'ใช้ไปแล้ว (บาท)': a.spentAmount,
          'คงเหลือ (บาท)': a.remainingAmount,
        }));
        break;
      case 'all_projects':
        data = projects.map((p, i) => ({
          ลำดับ: i + 1,
          รหัส: p.projectCode,
          โครงการ: p.projectName,
          ฝ่าย: p.department,
          'งบจัดสรร (บาท)': p.allocatedBudget,
          'ใช้ไป (บาท)': p.spentBudget,
          'คงเหลือ (บาท)': p.remainingBudget,
          ผู้รับผิดชอบ: p.responsiblePerson,
          สถานะ: p.status,
        }));
        break;
      case 'project_expenses':
        data = projects.flatMap((p) =>
          (p.expenses || []).map((exp, idx) => ({
            รหัสโครงการ: p.projectCode,
            ชื่อโครงการ: p.projectName,
            รายการค่าใช้จ่าย: exp.itemName,
            หมวด: exp.category,
            จำนวน: exp.quantity,
            หน่วยนับ: exp.unit,
            'ราคาต่อหน่วย (บาท)': exp.unitPrice,
            'รวมเงิน (บาท)': exp.totalAmount,
          }))
        );
        break;
      case 'disbursements':
        data = transactions.map((t, i) => ({
          ลำดับ: i + 1,
          เลขที่เอกสาร: t.docNumber,
          วันที่: t.transactionDate,
          รายการเบิกจ่าย: t.itemDescription,
          'ผู้รับเงิน/ร้านค้า': t.payee,
          'จำนวนเงิน (บาท)': t.amount,
          ผู้บันทึก: t.recordedBy,
        }));
        break;
      case 'budget_summary':
        data = allocations.map((a, i) => ({
          ลำดับ: i + 1,
          ฝ่ายงาน: a.departmentName,
          'งบจัดสรร (บาท)': a.allocatedAmount,
          'ใช้ไป (บาท)': a.spentAmount,
          'คงเหลือ (บาท)': a.remainingAmount,
          'อัตราเบิกจ่าย (%)': ((a.spentAmount / (a.allocatedAmount || 1)) * 100).toFixed(2),
        }));
        break;
    }

    exportToExcel(sheetName, fileName, data);
  };

  // Export PDF Handler
  const handleExportPdf = () => {
    let title = `${currentReportObj.title} ประจำปีงบประมาณ พ.ศ. ${activeFiscalYear.year}`;
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (selectedReport) {
      case 'annual_plan':
        headers = ['รหัส', 'โครงการ', 'ฝ่าย', 'KPI', 'งบจัดสรร (บาท)', 'ผู้รับผิดชอบ', 'สถานะ'];
        rows = projects.map((p) => [
          p.projectCode || '',
          p.projectName || '',
          p.department || '',
          p.kpi || p.kpis || '',
          p.allocatedBudget.toLocaleString(),
          p.responsiblePerson || '',
          p.status === 'completed' ? 'เสร็จสิ้น' : p.status === 'in_progress' ? 'กำลังทำ' : 'ยังไม่ทำ',
        ]);
        break;
      case 'revenue':
        headers = ['ที่', 'รายการรายรับ', 'อัตรา/คน (บาท)', 'ผู้มีสิทธิ์ (คน)', 'รวมเงิน (บาท)', 'หมายเหตุ'];
        rows = revenues.map((r, i) => [
          String(i + 1),
          r.itemName,
          r.ratePerHead.toLocaleString(),
          r.eligibleCount.toLocaleString(),
          r.calculatedAmount.toLocaleString(),
          r.note || '-',
        ]);
        break;
      case 'department_allocation':
        headers = ['ที่', 'ฝ่าย/งาน', 'สัดส่วน (%)', 'งบจัดสรร (บาท)', 'ใช้ไป (บาท)', 'คงเหลือ (บาท)'];
        rows = allocations.map((a, i) => [
          String(i + 1),
          a.departmentName,
          `${a.percentage}%`,
          a.allocatedAmount.toLocaleString(),
          a.spentAmount.toLocaleString(),
          a.remainingAmount.toLocaleString(),
        ]);
        break;
      case 'all_projects':
        headers = ['รหัส', 'โครงการ', 'ฝ่าย', 'งบจัดสรร (บาท)', 'ใช้ไป (บาท)', 'คงเหลือ (บาท)', 'สถานะ'];
        rows = projects.map((p) => [
          p.projectCode,
          p.projectName,
          p.department,
          p.allocatedBudget.toLocaleString(),
          p.spentBudget.toLocaleString(),
          p.remainingBudget.toLocaleString(),
          p.status,
        ]);
        break;
      case 'project_expenses':
        headers = ['โครงการ', 'รายการค่าใช้จ่าย', 'หมวด', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'รวมเงิน'];
        rows = projects.flatMap((p) =>
          (p.expenses || p.expenseItems || []).map((exp) => [
            p.projectCode,
            exp.itemName,
            exp.category,
            String(exp.quantity),
            exp.unit,
            exp.unitPrice.toLocaleString(),
            exp.totalAmount.toLocaleString(),
          ])
        );
        break;
      case 'disbursements':
        headers = ['เลขที่เอกสาร', 'วันที่', 'รายการเบิกจ่าย', 'ผู้รับเงิน', 'จำนวนเงิน (บาท)', 'ผู้บันทึก'];
        rows = transactions.map((t) => [
          t.docNumber || '',
          t.transactionDate || '',
          t.itemDescription || '',
          t.payee || '',
          t.amount.toLocaleString(),
          t.recordedBy || 'เจ้าหน้าที่',
        ]);
        break;
      case 'budget_summary':
        headers = ['ที่', 'ฝ่าย/งาน', 'งบจัดสรร (บาท)', 'ใช้ไปแล้ว (บาท)', 'คงเหลือ (บาท)', '% เบิกจ่าย'];
        rows = allocations.map((a, i) => [
          String(i + 1),
          a.departmentName,
          a.allocatedAmount.toLocaleString(),
          a.spentAmount.toLocaleString(),
          a.remainingAmount.toLocaleString(),
          `${((a.spentAmount / (a.allocatedAmount || 1)) * 100).toFixed(1)}%`,
        ]);
        break;
    }

    exportToPdf(title, school.name, activeFiscalYear.year, headers, rows, `รายงาน_${selectedReport}_ปี${activeFiscalYear.year}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-700" />
            <span>ระบบรายงานแผนปฏิบัติการและงบประมาณ (7 รายงานมาตรฐาน)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            รองรับการพิมพ์เอกสารราชการ ส่งออก Excel (.xlsx) และส่งออก PDF (.pdf) ครบถ้วน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-report-print"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>
          <button
            id="btn-report-export-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            id="btn-report-export-pdf"
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Select Report Buttons Grid */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {reportList.map((rep) => {
          const isSelected = selectedReport === rep.id;
          return (
            <button
              key={rep.id}
              id={`btn-select-report-${rep.id}`}
              type="button"
              onClick={() => setSelectedReport(rep.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <div className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-amber-300' : 'text-slate-900'}`}>
                {rep.title}
              </div>
              <div className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                {rep.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Official Printable Report Document */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 print-container">
        {/* Government Header */}
        <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-5 mb-6">
          <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            เอกสารราชการ • แผนปฏิบัติการและงบประมาณสถานศึกษา
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{school.name}</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {school.affiliation} • {school.educationArea}
          </p>
          <div className="text-base font-extrabold text-blue-900 mt-2">
            {currentReportObj.title.substring(3)}
          </div>
          <div className="text-xs text-slate-500">
            ประจำปีงบประมาณ พ.ศ. {activeFiscalYear.year} | ผู้อำนวยการ: {school.directorName} | วันที่ออกรายงาน:{' '}
            {new Date().toLocaleDateString('th-TH')}
          </div>
        </div>

        {/* Dynamic Report Table Render */}
        {selectedReport === 'annual_plan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 w-24">รหัส</th>
                  <th className="py-2.5 px-3 min-w-[200px]">ชื่อโครงการ</th>
                  <th className="py-2.5 px-3 w-32">ฝ่าย</th>
                  <th className="py-2.5 px-3 min-w-[180px]">วัตถุประสงค์</th>
                  <th className="py-2.5 px-3 min-w-[160px]">ตัวชี้วัด (KPI)</th>
                  <th className="py-2.5 px-3 w-32 text-right">งบจัดสรร (บาท)</th>
                  <th className="py-2.5 px-3 w-32">ผู้รับผิดชอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.map((p, i) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3 text-center">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">{p.projectCode}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{p.projectName}</td>
                    <td className="py-2 px-3 text-slate-600">{p.department}</td>
                    <td className="py-2 px-3 text-xs text-slate-600">{p.objectives}</td>
                    <td className="py-2 px-3 text-xs text-slate-600">{p.kpi}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {p.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{p.responsiblePerson}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={6} className="py-3 px-3 text-right">งบประมาณรวมทั้งสิ้น:</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-blue-900">
                    {projects.reduce((s, p) => s + p.allocatedBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3">บาท</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {selectedReport === 'revenue' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 min-w-[260px]">รายการรายรับ</th>
                  <th className="py-2.5 px-3 w-32 text-right">อัตราต่อคน (บาท)</th>
                  <th className="py-2.5 px-3 w-28 text-center">จำนวนผู้มีสิทธิ์ (คน)</th>
                  <th className="py-2.5 px-3 w-40 text-right">จำนวนเงินรวม (บาท)</th>
                  <th className="py-2.5 px-3 min-w-[180px]">หมายเหตุ / แหล่งเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {revenues.map((r, i) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 text-center">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.itemName}</td>
                    <td className="py-2 px-3 text-right font-mono">{r.ratePerHead.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center font-mono">{r.eligibleCount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {r.calculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={4} className="py-3 px-3 text-right">ประมาณการรายรับรวมทั้งสิ้น:</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-blue-900">
                    {revenues.reduce((s, r) => s + r.calculatedAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3">บาท</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {selectedReport === 'department_allocation' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 min-w-[200px]">ฝ่าย / งานบริหาร</th>
                  <th className="py-2.5 px-3 w-28 text-center">สัดส่วน (%)</th>
                  <th className="py-2.5 px-3 w-36 text-right">งบประมาณจัดสรร (บาท)</th>
                  <th className="py-2.5 px-3 w-36 text-right">เบิกจ่ายไปแล้ว (บาท)</th>
                  <th className="py-2.5 px-3 w-36 text-right">งบประมาณคงเหลือ (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((a, i) => (
                  <tr key={a.id}>
                    <td className="py-2 px-3 text-center">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{a.departmentName}</td>
                    <td className="py-2 px-3 text-center font-mono">{a.percentage}%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {a.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-700">
                      {a.spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {a.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={2} className="py-3 px-3 text-right">รวมทั้งสิ้น:</td>
                  <td className="py-3 px-3 text-center font-mono">
                    {allocations.reduce((s, a) => s + a.percentage, 0)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-blue-900">
                    {allocations.reduce((s, a) => s + a.allocatedAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700">
                    {allocations.reduce((s, a) => s + a.spentAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700">
                    {allocations.reduce((s, a) => s + a.remainingAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {selectedReport === 'all_projects' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 w-24">รหัส</th>
                  <th className="py-2.5 px-3 min-w-[220px]">โครงการ</th>
                  <th className="py-2.5 px-3 w-32">ฝ่าย</th>
                  <th className="py-2.5 px-3 w-32 text-right">งบจัดสรร (บาท)</th>
                  <th className="py-2.5 px-3 w-32 text-right">ใช้ไป (บาท)</th>
                  <th className="py-2.5 px-3 w-32 text-right">คงเหลือ (บาท)</th>
                  <th className="py-2.5 px-3 w-28 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.map((p, i) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3 text-center">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">{p.projectCode}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{p.projectName}</td>
                    <td className="py-2 px-3 text-slate-600">{p.department}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {p.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-700">
                      {p.spentBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {p.remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center text-xs">
                      {p.status === 'completed' ? 'ดำเนินการแล้ว' : p.status === 'in_progress' ? 'อยู่ระหว่างทำ' : 'ยังไม่ทำ'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={4} className="py-3 px-3 text-right">งบประมาณรวม:</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-blue-900">
                    {projects.reduce((s, p) => s + p.allocatedBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700">
                    {projects.reduce((s, p) => s + p.spentBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700">
                    {projects.reduce((s, p) => s + p.remainingBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {selectedReport === 'project_expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-24">รหัสโครงการ</th>
                  <th className="py-2.5 px-3 min-w-[200px]">โครงการ</th>
                  <th className="py-2.5 px-3 min-w-[220px]">รายการค่าใช้จ่าย</th>
                  <th className="py-2.5 px-3 w-28">หมวด</th>
                  <th className="py-2.5 px-3 w-20 text-center">จำนวน</th>
                  <th className="py-2.5 px-3 w-20 text-center">หน่วย</th>
                  <th className="py-2.5 px-3 w-28 text-right">ราคา/หน่วย</th>
                  <th className="py-2.5 px-3 w-32 text-right font-bold">รวมเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.flatMap((p) =>
                  (p.expenses || []).map((exp) => (
                    <tr key={`${p.id}-${exp.id}`}>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{p.projectCode}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{p.projectName}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{exp.itemName}</td>
                      <td className="py-2 px-3 text-xs text-slate-600">
                        {exp.category === 'remuneration' ? 'ค่าตอบแทน' : exp.category === 'operational' ? 'ค่าใช้สอย' : exp.category === 'material' ? 'ค่าวัสดุ' : 'ค่าครุภัณฑ์'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{exp.quantity}</td>
                      <td className="py-2 px-3 text-center">{exp.unit}</td>
                      <td className="py-2 px-3 text-right font-mono">{exp.unitPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {exp.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'disbursements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 w-32">เลขที่เอกสาร</th>
                  <th className="py-2.5 px-3 w-28">วันที่</th>
                  <th className="py-2.5 px-3 min-w-[220px]">รายการเบิกจ่าย</th>
                  <th className="py-2.5 px-3 w-36">ผู้รับเงิน / ร้านค้า</th>
                  <th className="py-2.5 px-3 w-32 text-right">จำนวนเงิน (บาท)</th>
                  <th className="py-2.5 px-3 w-28 text-center">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.map((t, i) => (
                  <tr key={t.id}>
                    <td className="py-2 px-3 text-center">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">{t.docNumber}</td>
                    <td className="py-2 px-3 text-slate-600">{t.transactionDate}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{t.itemDescription}</td>
                    <td className="py-2 px-3 text-slate-600">{t.payee}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                      {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center text-xs text-slate-500">{t.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={5} className="py-3 px-3 text-right">ยอดเบิกจ่ายรวมทั้งสิ้น:</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-amber-700">
                    {transactions.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3">บาท</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {selectedReport === 'budget_summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">ที่</th>
                  <th className="py-2.5 px-3 min-w-[200px]">ฝ่าย / งานบริหาร</th>
                  <th className="py-2.5 px-3 w-36 text-right">งบประมาณจัดสรร (บาท)</th>
                  <th className="py-2.5 px-3 w-36 text-right">เบิกจ่ายไปแล้ว (บาท)</th>
                  <th className="py-2.5 px-3 w-36 text-right font-bold text-emerald-700">งบประมาณคงเหลือ (บาท)</th>
                  <th className="py-2.5 px-3 w-28 text-center">อัตราเบิกจ่าย (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((a, i) => {
                  const rate = ((a.spentAmount / (a.allocatedAmount || 1)) * 100).toFixed(1);
                  return (
                    <tr key={a.id}>
                      <td className="py-2 px-3 text-center">{i + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{a.departmentName}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {a.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-700">
                        {a.spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {a.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                  <td colSpan={2} className="py-3 px-3 text-right">สรุปภาพรวมสถานศึกษา:</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-blue-900">
                    {allocations.reduce((s, a) => s + a.allocatedAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700">
                    {allocations.reduce((s, a) => s + a.spentAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700">
                    {allocations.reduce((s, a) => s + a.remainingAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {((allocations.reduce((s, a) => s + a.spentAmount, 0) / (allocations.reduce((s, a) => s + a.allocatedAmount, 0) || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature Footer for Official Printing */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-12">
            <div>ลงชื่อ....................................................................</div>
            <div>
              <div className="font-semibold text-slate-800">ผู้จัดทำ / เจ้าหน้าที่แผนงานและงบประมาณ</div>
              <div className="text-slate-500 mt-0.5">วันที่ ........ / .................... / พ.ศ. ............</div>
            </div>
          </div>

          <div className="space-y-12">
            <div>ลงชื่อ....................................................................</div>
            <div>
              <div className="font-semibold text-slate-800">({school.directorName})</div>
              <div className="text-slate-700 font-medium">ผู้อำนวยการ{school.name}</div>
              <div className="text-slate-500 mt-0.5">วันที่ ........ / .................... / พ.ศ. ............</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
