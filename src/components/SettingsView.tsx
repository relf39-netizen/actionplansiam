import React, { useState } from 'react';
import {
  FiscalYear,
  School,
  StudentLevel,
  RevenueItem,
  BudgetAllocation,
  Project,
  BudgetTransaction,
} from '../types';
import {
  Settings,
  Calendar,
  Sparkles,
  Download,
  Upload,
  Database,
  Save,
  Check,
  RefreshCw,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  BellRing,
  HelpCircle,
  Sheet,
  Server
} from 'lucide-react';
import { generateSqlDump } from '../utils/exportUtils';

interface SettingsViewProps {
  school: School;
  fiscalYears: FiscalYear[];
  activeFiscalYear: FiscalYear;
  onSelectFiscalYear: (fy: FiscalYear) => void;
  onAddFiscalYear: (newYear: number) => void;
  onUpdateFiscalYear: (updated: FiscalYear) => void;
  students: StudentLevel[];
  revenues: RevenueItem[];
  allocations: BudgetAllocation[];
  projects: Project[];
  transactions: BudgetTransaction[];
  onRestoreData: (backupData: any) => void;
  onApplyPresetRates: () => void;
  onOpenGasModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  school,
  fiscalYears,
  activeFiscalYear,
  onSelectFiscalYear,
  onAddFiscalYear,
  onUpdateFiscalYear,
  students,
  revenues,
  allocations,
  projects,
  transactions,
  onRestoreData,
  onApplyPresetRates,
  onOpenGasModal,
}) => {
  const [newYearInput, setNewYearInput] = useState<number>(activeFiscalYear.year + 1);
  const [presetSuccess, setPresetSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [proposalConfigSuccess, setProposalConfigSuccess] = useState(false);

  // Local state for proposal window settings
  const [isProposalOpen, setIsProposalOpen] = useState<boolean>(activeFiscalYear.isProposalOpen !== false);
  const [proposalOpenDate, setProposalOpenDate] = useState<string>(activeFiscalYear.proposalOpenDate || `${activeFiscalYear.year - 543 - 1}-10-01`);
  const [proposalCloseDate, setProposalCloseDate] = useState<string>(activeFiscalYear.proposalCloseDate || `${activeFiscalYear.year - 543}-01-31`);
  const [proposalNotice, setProposalNotice] = useState<string>(
    activeFiscalYear.proposalNotice || `เปิดรับการเสนอโครงการตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${activeFiscalYear.year} คุณครูและบุคลากรทุกท่านสามารถส่งข้อเสนอโครงการตามกลุ่มงานได้`
  );

  const handleAddNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (newYearInput < 2500 || newYearInput > 2600) {
      alert('กรุณาระบุปีงบประมาณ พ.ศ. ที่ถูกต้อง');
      return;
    }
    onAddFiscalYear(newYearInput);
    setNewYearInput(newYearInput + 1);
  };

  const handleSaveProposalConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FiscalYear = {
      ...activeFiscalYear,
      isProposalOpen,
      proposalOpenDate,
      proposalCloseDate,
      proposalNotice,
    };
    onUpdateFiscalYear(updated);
    setProposalConfigSuccess(true);
    setTimeout(() => setProposalConfigSuccess(false), 3500);
  };

  const handleApplyPreset = () => {
    if (confirm('คุณต้องการนำเข้าอัตราเงินอุดหนุนและเกณฑ์จัดสรรมาตรฐาน สพฐ. พ.ศ. 2568 หรือไม่?')) {
      onApplyPresetRates();
      setPresetSuccess(true);
      setTimeout(() => setPresetSuccess(false), 3000);
    }
  };

  // Export SQL Dump
  const handleDownloadSqlDump = () => {
    const sql = generateSqlDump(
      school,
      activeFiscalYear,
      students,
      revenues,
      allocations,
      projects,
      transactions
    );
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${school.name}_ปี${activeFiscalYear.year}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON Backup
  const handleDownloadJsonBackup = () => {
    const data = {
      exportDate: new Date().toISOString(),
      school,
      activeFiscalYear,
      students,
      revenues,
      allocations,
      projects,
      transactions,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${school.name}_ปี${activeFiscalYear.year}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Restore JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.school || !parsed.projects) {
          throw new Error('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง');
        }
        onRestoreData(parsed);
        setRestoreSuccess(true);
        setRestoreError(null);
        setTimeout(() => setRestoreSuccess(false), 4000);
      } catch (err: any) {
        setRestoreError(err.message || 'ไม่สามารถกู้คืนข้อมูลได้');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-700" />
            <span>ตั้งค่าระบบและการเสนอโครงการ (System & Proposal Settings)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการปีงบประมาณ เปิด/ปิดรับการเสนอโครงการจากคุณครู เกณฑ์อัตรามาตรฐาน สพฐ. และการสำรองข้อมูล (SQL / JSON)
          </p>
        </div>
      </div>

      {/* Node.js Runtime Status Banner */}
      <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">
                  Node.js Native Server (Express + Vite)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 text-emerald-900 px-2 py-0.5 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Active on Port 3000
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                เซิร์ฟเวอร์รันด้วย Node.js รองรับ API สำหรับ Gemini AI, การจัดเก็บฐานข้อมูล JSON บนดิสก์ และระบบ Multi-Tenant ครบวงจร
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-[11px] font-semibold text-slate-700">TypeScript + tsx / esbuild</div>
              <div className="text-[10px] text-slate-500">Google AI Studio Certified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Fiscal Year Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="h-5 w-5 text-blue-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">1. กำหนดและสลับปีงบประมาณ</h3>
              <p className="text-xs text-slate-500">รองรับระบบ Multi-Year แยกข้อมูลตามปีงบประมาณ</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              ปีงบประมาณที่เปิดใช้งานอยู่ในปัจจุบัน:
            </label>
            <div className="flex flex-wrap gap-2">
              {fiscalYears.map((fy) => {
                const isActive = activeFiscalYear.id === fy.id;
                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => {
                      onSelectFiscalYear(fy);
                      setIsProposalOpen(fy.isProposalOpen !== false);
                      setProposalOpenDate(fy.proposalOpenDate || `${fy.year - 543 - 1}-10-01`);
                      setProposalCloseDate(fy.proposalCloseDate || `${fy.year - 543}-01-31`);
                      setProposalNotice(fy.proposalNotice || `เปิดรับการเสนอโครงการตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${fy.year}`);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isActive
                        ? 'bg-blue-900 text-amber-300 border-blue-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>พ.ศ. {fy.year}</span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddNewYear} className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              เปิดปีงบประมาณใหม่:
            </label>
            <div className="flex gap-2">
              <input
                id="input-new-fiscal-year"
                type="number"
                min="2560"
                max="2580"
                value={newYearInput}
                onChange={(e) => setNewYearInput(Number(e.target.value))}
                className="w-36 text-sm font-bold font-mono rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                id="btn-create-fiscal-year"
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition-colors"
              >
                + เพิ่มปีงบประมาณ
              </button>
            </div>
          </form>
        </div>

        {/* Panel 2: Project Proposal Submission Window Control (เปิด/ปิดรับการเสนอโครงการ) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">2. ตั้งค่าเปิด/ปิดรับการเสนอโครงการ</h3>
                <p className="text-xs text-slate-500">กำหนดช่วงเวลาให้คุณครูสามารถเสนอโครงการเข้ามาใช้จ่ายงบประมาณแต่ละกลุ่มงาน</p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                isProposalOpen
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isProposalOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span>{isProposalOpen ? 'เปิดรับข้อเสนอ' : 'ปิดรับข้อเสนอ'}</span>
            </span>
          </div>

          <form onSubmit={handleSaveProposalConfig} className="space-y-4">
            {/* Toggle switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  สถานะการรับข้อเสนอโครงการ (ปีงบประมาณ {activeFiscalYear.year})
                </span>
                <span className="text-[11px] text-slate-500">
                  {isProposalOpen
                    ? 'คุณครูสามารถเข้าสู่ระบบและกดปุ่ม "เพิ่มโครงการ" หรือ "สร้างโครงการด้วย AI" ได้'
                    : 'ระบบจะระงับการสร้างโครงการใหม่โดยคุณครูชั่วคราว (เฉพาะผู้ดูแลระบบและฝ่ายแผนที่ยังแก้ไขได้)'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isProposalOpen}
                  onChange={(e) => setIsProposalOpen(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่เริ่มเปิดรับข้อเสนอ:
                </label>
                <input
                  type="date"
                  value={proposalOpenDate}
                  onChange={(e) => setProposalOpenDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่สิ้นสุด/ปิดรับข้อเสนอ:
                </label>
                <input
                  type="date"
                  value={proposalCloseDate}
                  onChange={(e) => setProposalCloseDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Announcement note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประกาศ / คำชี้แจงสำหรับคุณครูในการเสนอโครงการ:
              </label>
              <textarea
                rows={2}
                value={proposalNotice}
                onChange={(e) => setProposalNotice(e.target.value)}
                placeholder="ระบุข้อความแจ้งเตือนคุณครู..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {proposalConfigSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100 p-2 rounded-lg">
                <Check className="h-4 w-4" />
                <span>บันทึกการตั้งค่าเปิด/ปิดรับการเสนอโครงการเรียบร้อยแล้ว</span>
              </div>
            )}

            <button
              id="btn-save-proposal-window"
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกสถานะการเปิด/ปิดรับโครงการ</span>
            </button>
          </form>
        </div>

        {/* Panel 3: OBEC Presets & Rates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">3. อัตราเงินอุดหนุนรายหัวและเกณฑ์มาตรฐาน สพฐ.</h3>
              <p className="text-xs text-slate-500">เกณฑ์อัตราตามระเบียบกระทรวงศึกษาธิการ (ปรับปรุงทุกปีงบประมาณ)</p>
            </div>
          </div>

          <div className="text-xs space-y-2 text-slate-600 bg-amber-50/60 p-3 rounded-lg border border-amber-200">
            <div className="font-semibold text-amber-950">เกณฑ์อัตราพื้นฐานต่อคน/ปี (สพฐ.):</div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900">
              <li>ก่อนประถมศึกษา (อนุบาล 1-3): 1,800 บาท/คน/ปี</li>
              <li>ประถมศึกษา (ป.1 - ป.6): 2,050 บาท/คน/ปี</li>
              <li>เงินอุดหนุนรายหัวส่วนเพิ่ม (โรงเรียนขนาดเล็ก / คุณภาพ): ~500 บาท/คน/ปี</li>
              <li>ค่าเครื่องแบบนักเรียน: อนุบาล 325 บ. / ประถม 400 บ.</li>
              <li>ค่าอุปกรณ์การเรียน: อนุบาล 145 บ. / ประถม 220 บ.</li>
              <li>ค่ากิจกรรมพัฒนาผู้เรียน: อนุบาล 464 บ. / ประถม 518 บ.</li>
            </ul>
          </div>

          {presetSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
              <Check className="h-4 w-4" />
              <span>ปรับปรุงอัตราและประมาณการรายรับตามเกณฑ์ สพฐ. เรียบร้อยแล้ว</span>
            </div>
          )}

          <button
            id="btn-apply-obec-presets"
            type="button"
            onClick={handleApplyPreset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-colors shadow-2xs"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>ปรับใช้อัตรามาตรฐาน สพฐ. พ.ศ. {activeFiscalYear.year} ทันที</span>
          </button>
        </div>

        {/* Panel 4: Backup & Restore Data */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">4. สำรองข้อมูล (Backup) และกู้คืนข้อมูล (Restore)</h3>
              <p className="text-xs text-slate-500">
                ส่งออกเป็นไฟล์ SQL สำหรับนำเข้า MySQL / phpMyAdmin บน Web Hosting หรือไฟล์ JSON
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Backup Box */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2.5 bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-blue-600" />
                <span>สำรองข้อมูลระบบ (Export Backup)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                ดาวน์โหลดข้อมูลโรงเรียน นักเรียน ประมาณการรายรับ การจัดสรรงบประมาณ โครงการ และรายการเบิกจ่ายทั้งหมด
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  id="btn-backup-sql"
                  type="button"
                  onClick={handleDownloadSqlDump}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <FileCode className="h-4 w-4" />
                  <span>SQL (.sql)</span>
                </button>

                <button
                  id="btn-backup-json"
                  type="button"
                  onClick={handleDownloadJsonBackup}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>JSON (.json)</span>
                </button>
              </div>
            </div>

            {/* Restore Box */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2.5 bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>กู้คืนข้อมูล (Restore Backup)</span>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>เลือกไฟล์ JSON เพื่อกู้คืน</span>
                  <input
                    id="input-file-restore-json"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {restoreSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100 p-2 rounded-lg">
                  <Check className="h-4 w-4" />
                  <span>กู้คืนข้อมูลจากไฟล์สำรองสำเร็จเรียบร้อยแล้ว!</span>
                </div>
              )}

              {restoreError && (
                <div className="flex items-center gap-1.5 text-xs text-red-800 bg-red-100 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{restoreError}</span>
                </div>
              )}
            </div>

            {/* Google Apps Script (Code.gs) Box */}
            {onOpenGasModal && (
              <div className="rounded-xl border border-emerald-300 p-3.5 space-y-2.5 bg-emerald-50/60">
                <div className="font-semibold text-xs text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sheet className="h-4 w-4 text-emerald-700" />
                    <span>เชื่อมต่อ Google Sheets & Google Apps Script (Code.gs)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    Google Workspace
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  ซิงค์ข้อมูลสองทางกับ Google Spreadsheet และใช้งาน AI เขียนโครงการผ่าน Google Apps Script (Code.gs)
                </p>
                <button
                  id="btn-settings-open-gas-modal"
                  type="button"
                  onClick={onOpenGasModal}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Sheet className="h-4 w-4" />
                  <span>เปิดศูนย์เชื่อมต่อ Google Apps Script (Code.gs)</span>
                </button>
              </div>
            )}

            {/* Database Config Box */}
            <div className="rounded-xl border border-blue-300 p-3.5 space-y-2 bg-blue-50/50">
              <div className="font-semibold text-xs text-blue-950 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-blue-700" />
                  <span>การเชื่อมต่อฐานข้อมูล Node.js (config/db_config.json)</span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                  Node.js Config
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                ระบบจัดการและอ่านค่าการเชื่อมต่อฐานข้อมูล MySQL จากไฟล์ <code className="font-mono bg-white px-1 rounded text-blue-800">config/db_config.json</code> หรือตั้งค่าผ่านเมนู Super Admin ได้ทันที หมดกังวลเรื่องไฟล์ .env ทับค่าเดิมเมื่ออัปโหลดผ่าน SFTP
              </p>
              <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto">
                <div>Host: localhost:3306</div>
                <div>Database: school_budget_db</div>
                <div>User: root</div>
                <div>Config: config/db_config.json (จัดการผ่าน Super Admin)</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
