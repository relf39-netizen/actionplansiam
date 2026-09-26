import React, { useEffect, useState } from 'react';
import { BudgetTransaction, FiscalYear, Project, ProjectExpenseItem, ProjectReport, School, User } from '../types';
import { canAccessProject } from '../utils/projectAccess';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Layers, 
  Calculator, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

interface ProjectExpensesViewProps {
  projects: Project[];
  currentUser: User;
  transactions: BudgetTransaction[];
  school: School;
  activeFiscalYear: FiscalYear;
  selectedProjectId?: number;
  onUpdateProjects: (updated: Project[]) => void;
  onBackToProjects?: () => void;
}

export const ProjectExpensesView: React.FC<ProjectExpensesViewProps> = ({
  projects,
  currentUser,
  transactions,
  school,
  activeFiscalYear,
  selectedProjectId,
  onUpdateProjects,
  onBackToProjects,
}) => {
  const [activeProjId, setActiveProjId] = useState<number>(selectedProjectId || projects[0]?.id || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const approvedProjects = projects.filter(p => !!p.approvedBy && canAccessProject(p, currentUser));
  useEffect(() => { if (selectedProjectId && approvedProjects.some(p => p.id === selectedProjectId)) setActiveProjId(selectedProjectId); }, [selectedProjectId]);
  const currentProject = approvedProjects.find((p) => p.id === activeProjId) || approvedProjects[0];
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [uploading, setUploading] = useState(false);
  const emptyReport: ProjectReport = { activityDetails: '', results: '', problems: '', recommendations: '', photos: [] };
  const [reportDraft, setReportDraft] = useState<ProjectReport>(emptyReport);
  useEffect(() => { setReportDraft(currentProject?.report || emptyReport); }, [currentProject?.id]);
  const report = reportDraft;
  const projectTransactions = transactions.filter(t => t.projectId === currentProject?.id);
  const printReport = () => {
    if (!currentProject || !report.aiDraft) return;
    const win = window.open('', '_blank');
    if (!win) { setReportError('เบราว์เซอร์ปิดกั้นหน้าต่างพิมพ์ กรุณาอนุญาต pop-up'); return; }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    const pages = Array.from({ length: Math.ceil(report.photos.length / 4) }, (_, page) => `<section class="appendix"><h2>ภาคผนวกภาพกิจกรรมของโครงการ (หน้า ${page + 1})</h2><div class="photos">${report.photos.slice(page * 4, page * 4 + 4).map(photo => `<figure><img src="${escapeHtml(new URL(photoUrl(photo), location.href).href)}" alt="ภาพกิจกรรม"/><figcaption>${escapeHtml(photo.caption || 'ภาพกิจกรรมโครงการ')}</figcaption></figure>`).join('')}</div></section>`).join('');
    win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>รายงานโครงการ</title><style>@page{size:A4;margin:16mm}body{font:16px/1.55 "TH Sarabun New",Arial,sans-serif;color:#172033}h1,h2{text-align:center}h1{font-size:22px}h2{font-size:19px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.appendix{break-before:page;page-break-before:always}.photos{display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:10mm 6mm;height:220mm}figure{margin:0;break-inside:avoid;text-align:center}figure img{height:80mm;width:100%;object-fit:contain}figcaption{font-size:14px}</style></head><body><h1>รายงานผลการดำเนินโครงการ</h1><h2>${escapeHtml(currentProject.projectName)}</h2><p>${escapeHtml(school.name)} · ปีงบประมาณ พ.ศ. ${activeFiscalYear.year}<br>วงเงินอนุมัติ ${currentProject.allocatedBudget.toLocaleString()} บาท · เบิกจ่าย ${projectTransactions.reduce((sum,t) => sum + t.amount,0).toLocaleString()} บาท</p><pre>${escapeHtml(report.aiDraft)}</pre>${pages}</body></html>`);
    win.document.close();
    win.addEventListener('load', () => { Promise.all(Array.from(win.document.images).map(img => img.decode().catch(() => undefined))).then(() => win.print()); });
  };
  const updateReport = (patch: Partial<ProjectReport>) => {
    if (!currentProject) return;
    setReportDraft(previous => ({ ...previous, ...patch }));
  };
  const saveReport = (draft: ProjectReport = reportDraft) => {
    if (!currentProject) return;
    onUpdateProjects(projects.map(p => p.id === currentProject.id ? { ...p, report: { ...draft, updatedAt: new Date().toISOString() } } : p));
    setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500);
  };
  const photoUrl = (photo: ProjectReport['photos'][number]) => photo.fileId && currentProject
    ? `/api/project-photos?schoolId=${currentProject.schoolId || school.id}&fiscalYearId=${currentProject.fiscalYearId || activeFiscalYear.id}&projectId=${currentProject.id}&fileId=${encodeURIComponent(photo.fileId)}`
    : (photo.dataUrl || '');
  const addPhotos = async (files: FileList | null) => {
    if (!currentProject || !files?.length) return;
    setUploading(true); setReportError('');
    const uploaded: ProjectReport['photos'] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const image = await createImageBitmap(file);
        const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.close();
        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 500000 && quality > 0.25) dataUrl = canvas.toDataURL('image/jpeg', quality -= 0.12);
        if (dataUrl.length > 500000) throw new Error('รูปใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง');
        const response = await fetch('/api/project-photos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload', schoolId: currentProject.schoolId || school.id, fiscalYearId: currentProject.fiscalYearId || activeFiscalYear.id, projectId: currentProject.id, dataUrl }) });
        const result = await response.json();
        if (!response.ok || !result.success || !result.fileId) throw new Error(result.message || 'อัปโหลดไป Drive ไม่สำเร็จ');
        uploaded.push({ id: result.fileId, fileId: result.fileId, caption: '' });
      } catch (error) { setReportError(error instanceof Error ? error.message : 'อัปโหลดภาพไม่สำเร็จ'); break; }
    }
    if (uploaded.length) {
      const nextReport = { ...reportDraft, photos: [...reportDraft.photos, ...uploaded] };
      setReportDraft(nextReport);
      saveReport(nextReport);
    }
    setUploading(false);
  };
  const migrateLegacyPhotos = async () => {
    if (!currentProject) return;
    setUploading(true); setReportError('');
    const moved = [...reportDraft.photos];
    for (let i = 0; i < moved.length; i++) {
      if (!moved[i].dataUrl || moved[i].fileId) continue;
      try {
        const response = await fetch('/api/project-photos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload', schoolId: currentProject.schoolId || school.id, fiscalYearId: currentProject.fiscalYearId || activeFiscalYear.id, projectId: currentProject.id, dataUrl: moved[i].dataUrl }) });
        const result = await response.json();
        if (!response.ok || !result.success || !result.fileId) throw new Error(result.message || 'ย้ายรูปไม่สำเร็จ');
        moved[i] = { id: result.fileId, fileId: result.fileId, caption: moved[i].caption };
      } catch (error) { setReportError(error instanceof Error ? error.message : 'ย้ายรูปไม่สำเร็จ'); break; }
    }
    const nextReport = { ...reportDraft, photos: moved };
    setReportDraft(nextReport); saveReport(nextReport); setUploading(false);
  };
  const removePhoto = async (photo: ProjectReport['photos'][number]) => {
    if (!currentProject || !window.confirm('ลบภาพนี้ออกจากโครงการและ Google Drive?')) return;
    if (photo.fileId) {
      try {
        const response = await fetch('/api/project-photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', schoolId: currentProject.schoolId || school.id, fiscalYearId: currentProject.fiscalYearId || activeFiscalYear.id, projectId: currentProject.id, fileId: photo.fileId }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'ลบภาพใน Drive ไม่สำเร็จ');
      } catch (error) { setReportError(error instanceof Error ? error.message : 'ลบภาพไม่สำเร็จ'); return; }
    }
    const nextReport = { ...reportDraft, photos: reportDraft.photos.filter(p => p.id !== photo.id) };
    setReportDraft(nextReport); saveReport(nextReport);
  };
  const generateReport = async (mode: 'guide' | 'final') => {
    if (!currentProject) return;
    if (mode === 'final' && (!report.activityDetails.trim() || !report.results.trim())) {
      setReportError('กรุณาระบุรายละเอียดกิจกรรมและผลที่เกิดขึ้นก่อนใช้ AI'); return;
    }
    if (mode === 'guide' && [report.activityDetails, report.results, report.problems, report.recommendations].some(value => value.trim()) && !window.confirm('AI จะเขียนทับข้อความใน 4 ช่อง กรุณาบันทึกหรือคัดลอกข้อความที่ต้องการเก็บไว้ก่อน ยืนยันหรือไม่?')) return;
    setReportBusy(true); setReportError('');
    try {
      const response = await fetch('/api/ai/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, rationale: currentProject.rationale, objectives: currentProject.objectives, quantitativeGoals: currentProject.quantitativeGoals, qualitativeGoals: currentProject.qualitativeGoals, customApiKey: localStorage.getItem('gemini_custom_api_key') || undefined, projectName: currentProject.projectName, schoolName: school.name, fiscalYear: activeFiscalYear.year, targetGroup: currentProject.targetGroup, approvedBudget: currentProject.allocatedBudget, transactions: projectTransactions.map(t => ({ date: t.transactionDate, description: t.itemDescription, amount: t.amount })), activityDetails: report.activityDetails, results: report.results, problems: report.problems, recommendations: report.recommendations, photoCaptions: report.photos.map(p => p.caption).filter(Boolean) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'สร้างรายงานไม่สำเร็จ');
      if (mode === 'guide') {
        const fields = payload.fields;
        if (!fields || !['activityDetails','results','problems','recommendations'].every(key => typeof fields[key] === 'string')) throw new Error('AI ส่งแนวทางไม่ครบ 4 ช่อง');
        const draft = { ...reportDraft, ...fields, aiDraft: undefined };
        setReportDraft(draft); saveReport(draft);
      } else {
        if (!payload.report) throw new Error('AI ไม่ส่งรายงานกลับมา');
        const draft = { ...reportDraft, aiDraft: payload.report };
        setReportDraft(draft); saveReport(draft);
      }
    } catch (error) { setReportError(error instanceof Error ? error.message : 'ติดต่อ AI ไม่สำเร็จ'); }
    finally { setReportBusy(false); }
  };
  const saveExpenses = (updatedExpenses: ProjectExpenseItem[]) => {
    if (!currentProject) return;
    const sum = updatedExpenses.reduce((total, e) => total + Number(e.totalAmount || 0), 0);
    if (sum > currentProject.allocatedBudget) { alert(`รายการค่าใช้จ่ายเกินวงเงินอนุมัติ ${currentProject.allocatedBudget.toLocaleString()} บาท`); return; }
    onUpdateProjects(projects.map(p => p.id === currentProject.id ? { ...p, expenses: updatedExpenses, expenseItems: updatedExpenses } : p));
    setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExpenseChange = (expenseId: number, field: keyof ProjectExpenseItem, val: any) => {
    if (!currentProject) return;

    const currentExpenses = currentProject.expenses || currentProject.expenseItems || [];
    const updatedExpenses = currentExpenses.map((exp: ProjectExpenseItem) => {
      if (exp.id === expenseId) {
        const item: ProjectExpenseItem = { ...exp, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(val) || 0 : exp.quantity;
          const price = field === 'unitPrice' ? Number(val) || 0 : exp.unitPrice;
          item.totalAmount = Math.round(qty * price * 100) / 100;
        }
        return item;
      }
      return exp;
    });

    saveExpenses(updatedExpenses);
  };

  const handleAddExpense = (category: ProjectExpenseItem['category'] = 'ค่าวัสดุ', projectId?: number) => {
    const project = approvedProjects.find(p => p.id === (projectId || currentProject?.id));
    if (!project) return;
    setActiveProjId(project.id);
    const currentExp = project.expenses || project.expenseItems || [];
    const sum = currentExp.reduce((total, item) => total + Number(item.totalAmount || 0), 0);
    if (sum >= project.allocatedBudget) { alert('ใช้งบประมาณตามวงเงินอนุมัติครบแล้ว'); return; }
    const newExpense: ProjectExpenseItem = {
      id: currentExp.length ? Math.max(...currentExp.map(e => e.id)) + 1 : 1,
      projectId: project.id, category, itemName: `รายการค่าใช้จ่ายที่ ${currentExp.length + 1}`,
      quantity: 1, unit: 'รายการ', unitPrice: 0, totalAmount: 0,
    };
    onUpdateProjects(projects.map(p => p.id === project.id ? { ...p, expenses: [...currentExp, newExpense], expenseItems: [...currentExp, newExpense] } : p));
  };

  const handleRemoveExpense = (expenseId: number) => {
    if (!currentProject) return;
    if (confirm('ต้องการลบรายการค่าใช้จ่ายนี้?')) {
      const currentExpenses = currentProject.expenses || currentProject.expenseItems || [];
      const updatedExpenses = currentExpenses.filter((e: ProjectExpenseItem) => e.id !== expenseId);
      saveExpenses(updatedExpenses);
    }
  };

  const expenses: ProjectExpenseItem[] = currentProject?.expenses || currentProject?.expenseItems || [];
  const totalItemizedAmount = expenses.reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);

  // Category subtotals
  const remunerationSum = expenses.filter((e) => e.category === 'ค่าตอบแทน' || e.category === 'remuneration').reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);
  const operationalSum = expenses.filter((e) => e.category === 'ค่าใช้สอย' || e.category === 'operational').reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);
  const materialSum = expenses.filter((e) => e.category === 'ค่าวัสดุ' || e.category === 'material').reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);
  const equipmentSum = expenses.filter((e) => e.category === 'ค่าครุภัณฑ์' || e.category === 'equipment').reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {onBackToProjects && (
              <button
                type="button"
                onClick={onBackToProjects}
                className="p-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                title="ย้อนกลับไปหน้ารวมโครงการ"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-blue-700" />
              <span>รายละเอียดค่าใช้จ่ายโครงการ (Project Itemized Expenses)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-6">
            จำแนกหมวดค่าตอบแทน ค่าใช้สอย ค่าวัสดุ ค่าครุภัณฑ์ พร้อมคำนวณงบประมาณรวมอัตโนมัติ (Dynamic Sum)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <Check className="h-3.5 w-3.5" />
              <span>บันทึกเรียบร้อย</span>
            </span>
          )}

        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="mb-3 text-sm font-bold text-slate-900">โครงการที่ดูแลได้ ({approvedProjects.length})</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {approvedProjects.map(p => <div key={p.id}
            className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${currentProject?.id === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <button type="button" onClick={() => setActiveProjId(p.id)} className="block break-words text-left text-sm font-bold text-slate-900 hover:underline">{p.projectName}</button>
            <span className="mt-1 block text-xs text-slate-600">{p.department} · วงเงิน {p.allocatedBudget.toLocaleString()} บาท</span>
            <button type="button" onClick={() => handleAddExpense('ค่าวัสดุ', p.id)} className="mt-2 inline-flex rounded-lg bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white">+ เพิ่มรายการค่าใช้จ่าย</button>
          </div>)}
        </div>
      </section>

      {/* Project Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            เลือกโครงการ:
          </label>
          <select
            id="select-active-project-expenses"
            value={activeProjId}
            onChange={(e) => setActiveProjId(Number(e.target.value))}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[280px]"
          >
            {approvedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectCode} - {p.projectName} ({p.department})
              </option>
            ))}
          </select>
        </div>

        {currentProject && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-slate-600">
              ผู้รับผิดชอบ: <span className="font-semibold text-slate-900">{currentProject.responsiblePerson}</span>
            </div>
            <div className="text-slate-600">
              งบประมาณจัดสรร:{' '}
              <span className="font-mono font-bold text-blue-900">
                {currentProject.allocatedBudget.toLocaleString()} บาท
              </span>
            </div>
          </div>
        )}
      </div>

      {approvedProjects.length === 0 && <div className="rounded-lg bg-amber-50 p-4 text-amber-800">ยังไม่มีโครงการที่ผ่านการตัดแผนและอนุมัติ</div>}
      {/* 4 Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button type="button" disabled={!currentProject} onClick={() => handleAddExpense('ค่าตอบแทน')} title="เพิ่มรายการหมวดค่าตอบแทน" className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-left hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          <div className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">1. หมวดค่าตอบแทน</div>
          <div className="text-lg font-black font-mono text-blue-900 mt-1">
            {remunerationSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">วิทยากร, ค่าจ้างเหมาบริการ</div>
          <span className="mt-2 block text-[11px] font-bold">+ คลิกเพื่อเพิ่มรายการ</span>
        </button>

        <button type="button" disabled={!currentProject} onClick={() => handleAddExpense('ค่าใช้สอย')} title="เพิ่มรายการหมวดค่าใช้สอย" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-left hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">2. หมวดค่าใช้สอย</div>
          <div className="text-lg font-black font-mono text-emerald-900 mt-1">
            {operationalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">อาหาร, ที่พัก, ยานพาหนะ, ซ่อมแซม</div>
          <span className="mt-2 block text-[11px] font-bold">+ คลิกเพื่อเพิ่มรายการ</span>
        </button>

        <button type="button" disabled={!currentProject} onClick={() => handleAddExpense('ค่าวัสดุ')} title="เพิ่มรายการหมวดค่าวัสดุ" className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-left hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">3. หมวดค่าวัสดุ</div>
          <div className="text-lg font-black font-mono text-amber-950 mt-1">
            {materialSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-amber-800 mt-0.5">เอกสาร, สื่อการเรียนรู้, เครื่องเขียน</div>
          <span className="mt-2 block text-[11px] font-bold">+ คลิกเพื่อเพิ่มรายการ</span>
        </button>

        <button type="button" disabled={!currentProject} onClick={() => handleAddExpense('ค่าครุภัณฑ์')} title="เพิ่มรายการหมวดค่าครุภัณฑ์" className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-left hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wider">4. หมวดค่าครุภัณฑ์</div>
          <div className="text-lg font-black font-mono text-purple-900 mt-1">
            {equipmentSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">อุปกรณ์คงทนตามแผน</div>
          <span className="mt-2 block text-[11px] font-bold">+ คลิกเพื่อเพิ่มรายการ</span>
        </button>
      </div>

      {/* Itemized Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center">ที่</th>
                <th className="py-3 px-3 min-w-[240px]">รายการค่าใช้จ่าย</th>
                <th className="py-3 px-3 w-36">หมวดค่าใช้จ่าย</th>
                <th className="py-3 px-3 w-24 text-center">จำนวน</th>
                <th className="py-3 px-3 w-24 text-center">หน่วยนับ</th>
                <th className="py-3 px-3 w-32 text-right">ราคา/หน่วย (บาท)</th>
                <th className="py-3 px-3 w-36 text-right bg-blue-50/60 text-blue-950 font-bold">รวมเงิน (บาท)</th>
                <th className="py-3 px-3 w-14 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ยังไม่มีรายการค่าใช้จ่ายสำหรับโครงการนี้ คลิกปุ่ม "+ เพิ่มรายการค่าใช้จ่าย" ด้านบน
                  </td>
                </tr>
              ) : (
                expenses.map((exp: ProjectExpenseItem, idx: number) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={exp.itemName}
                        onChange={(e) => handleExpenseChange(exp.id, 'itemName', e.target.value)}
                        className="w-full rounded border border-transparent hover:border-slate-300 focus:border-blue-500 py-1 px-2 font-medium text-slate-800 focus:outline-none focus:bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={exp.category}
                        onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                        className="w-full rounded border border-slate-300 py-1 px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ค่าตอบแทน">ค่าตอบแทน</option>
                        <option value="ค่าใช้สอย">ค่าใช้สอย</option>
                        <option value="ค่าวัสดุ">ค่าวัสดุ</option>
                        <option value="ค่าครุภัณฑ์">ค่าครุภัณฑ์</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={exp.quantity}
                        onChange={(e) => handleExpenseChange(exp.id, 'quantity', e.target.value)}
                        className="w-16 text-center rounded border border-slate-300 py-1 px-1 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="text"
                        value={exp.unit}
                        onChange={(e) => handleExpenseChange(exp.id, 'unit', e.target.value)}
                        className="w-16 text-center rounded border border-slate-300 py-1 px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={exp.unitPrice}
                        onChange={(e) => handleExpenseChange(exp.id, 'unitPrice', e.target.value)}
                        className="w-28 text-right rounded border border-slate-300 py-1 px-2 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                      {exp.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs sm:text-sm">
                <td colSpan={6} className="py-3.5 px-4 text-right">
                  งบประมาณแจกแจงค่าใช้จ่ายรวมทั้งสิ้น ({expenses.length} รายการ):
                </td>
                <td className="py-3.5 px-3 text-right bg-amber-400 text-slate-950 font-black font-mono text-base">
                  {totalItemizedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-normal">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {currentProject && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">รายงานผลโครงการ · {currentProject.projectName}</h3>
        <p className="mt-1 text-xs text-slate-600">กด AI ร่างแนวทางเบื้องต้น ข้อความจะลงในกรอบทั้ง 4 ช่องด้านล่าง คุณสามารถคลิกและแก้ไขแต่ละช่องได้ จากนั้นเติมข้อมูลจริงและกด AI ร่างละเอียดอีกครั้ง</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([['activityDetails','กิจกรรมที่ดำเนินการจริง'],['results','ผลที่เกิดขึ้นและหลักฐาน'],['problems','ปัญหาและอุปสรรค'],['recommendations','ข้อเสนอแนะ']] as const).map(([field,label]) =>
            <label key={field} className="text-xs font-semibold text-slate-700">{label}<textarea value={report[field]} onChange={e => updateReport({ [field]: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal focus:ring-2 focus:ring-blue-500" /></label>)}
        </div>
        <div className="mt-4 text-sm font-bold text-slate-800">ภาพประกอบกิจกรรมใน Google Drive ({report.photos.length} ภาพ)</div>
        <input type="file" accept="image/*" multiple disabled={uploading} onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} className="mt-2 block w-full text-xs" />
        {uploading && <p className="mt-1 text-xs text-blue-700">กำลังส่งรูปไป Google Drive...</p>}
        {report.photos.some(photo => !!photo.dataUrl && !photo.fileId) && <button type="button" disabled={uploading} onClick={() => void migrateLegacyPhotos()} className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">ย้ายภาพเดิมจาก MySQL ไป Drive</button>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.photos.map(photo => <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200">
            <img src={photoUrl(photo)} alt={photo.caption || 'ภาพกิจกรรมโครงการ'} className="aspect-video w-full object-cover" />
            <input aria-label="คำบรรยายภาพ" placeholder="คำบรรยายภาพ" value={photo.caption} onChange={e => updateReport({ photos: report.photos.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p) })} className="w-full border-t p-2 text-xs" />
            <button type="button" onClick={() => void removePhoto(photo)} className="p-2 text-xs text-rose-700">ลบภาพ</button>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => saveReport()} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">บันทึกรายงานและภาพ</button>
          <button type="button" disabled={reportBusy} onClick={() => void generateReport('guide')} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50">AI ร่างแนวทางเบื้องต้น</button>
          <button type="button" disabled={reportBusy} onClick={() => void generateReport('final')} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{reportBusy ? 'กำลังร่างรายงาน...' : 'AI ร่างละเอียดจากข้อมูลที่แก้ไข'}</button>
          {report.aiDraft && <button type="button" onClick={printReport} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold">พิมพ์รายงานพร้อมภาพ</button>}
        </div>
        {reportError && <p role="alert" className="mt-2 text-xs text-rose-700">{reportError}</p>}
        {report.aiDraft && <article id="project-report-print" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 print:border-0 print:bg-white">
          <h4 className="font-bold">รายงานผลการดำเนินโครงการ: {currentProject.projectName}</h4>
          <p className="text-xs">{school.name} · ปีงบประมาณ พ.ศ. {activeFiscalYear.year} · งบอนุมัติ {currentProject.allocatedBudget.toLocaleString()} บาท · เบิกจ่าย {projectTransactions.reduce((sum,t) => sum + t.amount,0).toLocaleString()} บาท</p>
          <textarea aria-label="แก้ไขร่างรายงาน AI" value={report.aiDraft} onChange={e => updateReport({ aiDraft: e.target.value })} rows={12} className="mt-3 w-full rounded-lg border p-3 text-sm leading-relaxed print:hidden" />
          <div className="hidden whitespace-pre-wrap text-sm leading-relaxed print:block">{report.aiDraft}</div>
          {Array.from({ length: Math.ceil(report.photos.length / 4) }, (_, page) => <section key={page} className="project-photo-appendix mt-6">
            <h4 className="mb-3 text-center text-base font-bold">ภาคผนวกภาพกิจกรรมของโครงการ (หน้า {page + 1})</h4>
            <div className="grid grid-cols-2 gap-4">{report.photos.slice(page * 4, page * 4 + 4).map(photo =>
              <figure key={photo.id} className="break-inside-avoid"><img src={photoUrl(photo)} alt={photo.caption || 'ภาพกิจกรรม'} className="h-48 w-full rounded object-contain" /><figcaption className="mt-1 text-center text-xs">{photo.caption || 'ภาพกิจกรรมโครงการ'}</figcaption></figure>)}</div>
          </section>)}
        </article>}
      </section>}
    </div>
  );
};
