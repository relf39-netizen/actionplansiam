import React, { useState } from 'react';
import { Project, School, FiscalYear } from '../types';
import { 
  Target, 
  Layers, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';

interface ActionPlanViewProps {
  projects: Project[];
  school: School;
  activeFiscalYear: FiscalYear;
  onSelectProject?: (project: Project) => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  projects,
  school,
  activeFiscalYear,
  onSelectProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('all');

  // Hardcoded strategies for OBEC standard
  const strategies = [
    { id: 1, name: 'ยุทธศาสตร์ที่ 1: พัฒนาคุณภาพและมาตรฐานการศึกษาทุกระดับ' },
    { id: 2, name: 'ยุทธศาสตร์ที่ 2: ปลูกฝังคุณธรรม จริยธรรม และความเป็นไทย' },
    { id: 3, name: 'ยุทธศาสตร์ที่ 3: พัฒนาครูและบุคลากรทางการศึกษาสู่มืออาชีพ' },
    { id: 4, name: 'ยุทธศาสตร์ที่ 4: พัฒนาระบบบริหารจัดการด้วยเทคโนโลยีและธรรมาภิบาล' },
  ];

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const data = filteredProjects.map((p, idx) => ({
      ที่: idx + 1,
      รหัสโครงการ: p.projectCode,
      ชื่อโครงการ: p.projectName,
      ฝ่ายที่รับผิดชอบ: p.department,
      วัตถุประสงค์: p.objectives,
      ตัวชี้วัดความสำเร็จ: p.kpi,
      'งบประมาณที่จัดสรร (บาท)': p.allocatedBudget,
      ผู้รับผิดชอบ: p.responsiblePerson,
      ระยะเวลาดำเนินงาน: p.duration,
      สถานะโครงการ:
        p.status === 'completed'
          ? 'ดำเนินการแล้ว'
          : p.status === 'in_progress'
          ? 'อยู่ระหว่างดำเนินการ'
          : 'ยังไม่ดำเนินการ',
    }));
    exportToExcel('แผนปฏิบัติการประจำปี', `แผนปฏิบัติการ_${school.name}_ปี${activeFiscalYear.year}`, data);
  };

  const handleExportPdf = () => {
    const headers = ['รหัส', 'โครงการ', 'ฝ่าย', 'ตัวชี้วัด (KPI)', 'งบประมาณ (บาท)', 'ผู้รับผิดชอบ', 'ระยะเวลา'];
    const rows: string[][] = filteredProjects.map((p) => [
      p.projectCode || '',
      p.projectName || '',
      p.department || '',
      p.kpi || p.kpis || '',
      p.allocatedBudget.toLocaleString(),
      p.responsiblePerson || '',
      p.duration || (p.durationStart ? `${p.durationStart} ถึง ${p.durationEnd}` : 'ตลอดปี'),
    ]);
    exportToPdf(
      `แผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${activeFiscalYear.year}`,
      school.name,
      activeFiscalYear.year,
      headers,
      rows,
      `แผนปฏิบัติการ_${school.name}_ปี${activeFiscalYear.year}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-700" />
            <span>แผนปฏิบัติการประจำปี (Annual Operational Action Plan)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            โครงสร้างเชื่อมโยงยุทธศาสตร์ กลยุทธ์ เป้าประสงค์ ตัวชี้วัด โครงการ กิจกรรม งบประมาณ และผู้รับผิดชอบ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-print-action-plan"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์เอกสารราชการ</span>
          </button>
          <button
            id="btn-export-action-plan-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            id="btn-export-action-plan-pdf"
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Strategic Hierarchy Matrix Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-xs">
        <div className="border-r border-blue-800/80 pr-3">
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">ระดับที่ 1: ยุทธศาสตร์</div>
          <div className="text-xs font-semibold mt-1">ยุทธศาสตร์พัฒนาคุณภาพการศึกษา สพฐ. 4 ด้าน</div>
        </div>
        <div className="border-r border-blue-800/80 pr-3">
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">ระดับที่ 2: กลยุทธ์ & เป้าประสงค์</div>
          <div className="text-xs font-semibold mt-1">มุ่งเน้นผลสัมฤทธิ์ทางการเรียนและคุณธรรม</div>
        </div>
        <div className="border-r border-blue-800/80 pr-3">
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">ระดับที่ 3: ตัวชี้วัด (KPI)</div>
          <div className="text-xs font-semibold mt-1">ประเมินเชิงปริมาณและคุณภาพอย่างชัดเจน</div>
        </div>
        <div>
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">ระดับที่ 4: โครงการ & งบประมาณ</div>
          <div className="text-xs font-semibold mt-1">{projects.length} โครงการรองรับทุกฝ่ายงาน</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-action-plan"
            type="text"
            placeholder="ค้นหาโครงการ, ผู้รับผิดชอบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          แสดง {filteredProjects.length} จากทั้งหมด {projects.length} โครงการ
        </div>
      </div>

      {/* Master Action Plan Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-semibold">
                <th className="py-3 px-3 w-12 text-center">ที่</th>
                <th className="py-3 px-3 w-24">รหัส</th>
                <th className="py-3 px-3 min-w-[200px]">โครงการตามแผน</th>
                <th className="py-3 px-3 w-32">ฝ่ายที่รับผิดชอบ</th>
                <th className="py-3 px-3 min-w-[200px]">วัตถุประสงค์</th>
                <th className="py-3 px-3 min-w-[180px]">ตัวชี้วัดความสำเร็จ (KPI)</th>
                <th className="py-3 px-3 w-32 text-right bg-blue-50/60 text-blue-950 font-bold">งบจัดสรร (บาท)</th>
                <th className="py-3 px-3 w-32">ผู้รับผิดชอบ</th>
                <th className="py-3 px-3 w-32">ระยะเวลา</th>
                <th className="py-3 px-3 w-28 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">{p.projectCode}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div>{p.projectName}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">แหล่งเงิน: {p.budgetSource}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {p.department}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-xs line-clamp-2 max-w-xs">{p.objectives}</td>
                  <td className="py-3 px-3 text-slate-600 text-xs line-clamp-2 max-w-xs">{p.kpi || p.kpis}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">
                    {p.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{p.responsiblePerson}</td>
                  <td className="py-3 px-3 text-slate-600 text-xs">{p.duration || (p.durationStart ? `${p.durationStart} ถึง ${p.durationEnd}` : 'ตลอดปี')}</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.status === 'completed'
                        ? 'ดำเนินการแล้ว'
                        : p.status === 'in_progress'
                        ? 'อยู่ระหว่างทำ'
                        : 'ยังไม่ทำ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs sm:text-sm">
                <td colSpan={6} className="py-3.5 px-4 text-right">
                  งบประมาณตามแผนปฏิบัติการรวมทั้งสิ้น:
                </td>
                <td className="py-3.5 px-3 text-right bg-amber-400 text-slate-950 font-black font-mono text-base">
                  {filteredProjects.reduce((s, p) => s + p.allocatedBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={3} className="py-3.5 px-3 text-xs text-slate-400 font-normal">
                  บาท ({filteredProjects.length} โครงการ)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
