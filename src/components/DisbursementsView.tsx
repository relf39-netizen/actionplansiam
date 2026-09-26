import React, { useState } from 'react';
import { BudgetTransaction, Project, User, FiscalYear } from '../types';
import {
  Receipt,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
  Calendar,
  DollarSign,
  Download,
  Filter,
  FileText,
  FolderOpen
} from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { canAccessProject } from '../utils/projectAccess';

interface DisbursementsViewProps {
  transactions: BudgetTransaction[];
  projects: Project[];
  currentUser: User;
  activeFiscalYear: FiscalYear;
  onUpdateTransactions: (updated: BudgetTransaction[], updatedProjects: Project[]) => void;
}

export const DisbursementsView: React.FC<DisbursementsViewProps> = ({
  transactions,
  projects,
  currentUser,
  activeFiscalYear,
  onUpdateTransactions,
}) => {
  const visibleProjects = projects.filter(p => !!p.approvedBy && canAccessProject(p, currentUser));
  const visibleIds = new Set(visibleProjects.map(p => p.id));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [overBudgetWarning, setOverBudgetWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    projectId: visibleProjects[0]?.id || 0,
    transactionDate: new Date().toISOString().split('T')[0],
    itemDescription: '',
    amount: 5000,
    payee: '',
    docNumber: `บจ.${new Date().getFullYear() + 543}/${(transactions.length + 1).toString().padStart(3, '0')}`,
    note: '',
  });

  // Selected project for new transaction
  const targetProject = visibleProjects.find((p) => p.id === formData.projectId) || visibleProjects[0];
  const currentRemaining = targetProject ? targetProject.remainingBudget : 0;

  // Filtered transactions
  const filtered = transactions.filter((t) => {
    if (!visibleIds.has(t.projectId)) return false;
    const matchSearch =
      t.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProj = selectedProjectFilter === 'all' || t.projectId === Number(selectedProjectFilter);
    return matchSearch && matchProj;
  });

  const totalDisbursed = filtered.reduce((sum, t) => sum + t.amount, 0);

  const handleAmountChange = (val: number) => {
    setFormData((prev) => ({ ...prev, amount: val }));
    if (targetProject && val > currentRemaining) {
      setOverBudgetWarning(
        `⚠️ แจ้งเตือน: จำนวนเงิน ${val.toLocaleString()} บ. เกินกว่างบประมาณคงเหลือของโครงการนี้ (${currentRemaining.toLocaleString()} บ.)`
      );
    } else {
      setOverBudgetWarning(null);
    }
  };

  const handleProjectSelect = (projId: number) => {
    const proj = visibleProjects.find((p) => p.id === projId);
    setFormData((prev) => ({ ...prev, projectId: projId }));
    if (proj && formData.amount > proj.remainingBudget) {
      setOverBudgetWarning(
        `⚠️ แจ้งเตือน: จำนวนเงิน ${formData.amount.toLocaleString()} บ. เกินกว่างบประมาณคงเหลือของโครงการ (${proj.remainingBudget.toLocaleString()} บ.)`
      );
    } else {
      setOverBudgetWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProject || !visibleIds.has(targetProject.id)) { alert('กรุณาเลือกโครงการที่รับผิดชอบและได้รับอนุมัติแล้ว'); return; }

    if (formData.amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }

    // Respect the approved budget cap.
    if (formData.amount > targetProject.remainingBudget) {
      alert('ยอดเบิกจ่ายเกินงบประมาณคงเหลือของโครงการ กรุณาปรับยอดก่อนบันทึก');
      return;
    }

    const newId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 1;
    const newTrans: BudgetTransaction = {
      id: newId,
      schoolId: targetProject.schoolId,
      fiscalYearId: activeFiscalYear.id,
      projectId: targetProject.id,
      transactionDate: formData.transactionDate,
      itemDescription: formData.itemDescription,
      amount: Number(formData.amount),
      payee: formData.payee,
      docNumber: formData.docNumber,
      note: formData.note,
      recordedBy: currentUser.fullName,
    };

    const updatedTransactions = [newTrans, ...transactions];

    // Update project spent and remaining budgets
    const updatedProjects = projects.map((p) => {
      if (p.id === targetProject.id) {
        const newSpent = p.spentBudget + newTrans.amount;
        return {
          ...p,
          spentBudget: newSpent,
          remainingBudget: Math.max(0, p.allocatedBudget - newSpent),
          status: p.status === 'not_started' ? 'in_progress' : p.status,
        };
      }
      return p;
    });

    onUpdateTransactions(updatedTransactions, updatedProjects);
    setIsFormOpen(false);
    setOverBudgetWarning(null);
    setFormData({
      projectId: visibleProjects[0]?.id || 0,
      transactionDate: new Date().toISOString().split('T')[0],
      itemDescription: '',
      amount: 5000,
      payee: '',
      docNumber: `บจ.${new Date().getFullYear() + 543}/${(transactions.length + 2).toString().padStart(3, '0')}`,
      note: '',
    });
  };

  const handleDeleteTransaction = (transId: number) => {
    const target = transactions.find((t) => t.id === transId);
    if (!target || !visibleIds.has(target.projectId)) return;

    if (confirm(`ต้องการยกเลิกใบเบิกจ่าย ${target.docNumber} จำนวน ${target.amount.toLocaleString()} บาท ใช่หรือไม่?`)) {
      const updatedTransactions = transactions.filter((t) => t.id !== transId);

      const updatedProjects = projects.map((p) => {
        if (p.id === target.projectId) {
          const newSpent = Math.max(0, p.spentBudget - target.amount);
          return {
            ...p,
            spentBudget: newSpent,
            remainingBudget: Math.max(0, p.allocatedBudget - newSpent),
          };
        }
        return p;
      });

      onUpdateTransactions(updatedTransactions, updatedProjects);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((t, i) => {
      const p = projects.find((proj) => proj.id === t.projectId);
      return {
        ที่: i + 1,
        เลขที่เอกสาร: t.docNumber,
        วันที่: t.transactionDate,
        รหัสโครงการ: p?.projectCode || '',
        ชื่อโครงการ: p?.projectName || '',
        รายการเบิกจ่าย: t.itemDescription,
        'ผู้รับเงิน/ร้านค้า': t.payee,
        'จำนวนเงิน (บาท)': t.amount,
        ผู้บันทึก: t.recordedBy,
        หมายเหตุ: t.note || '',
      };
    });
    exportToExcel('บันทึกการเบิกจ่าย', `รายงานการเบิกจ่ายงบประมาณ_ปี${activeFiscalYear.year}`, data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-700" />
            <span>การติดตามการใช้จ่ายงบประมาณและการเบิกจ่าย (Expense Tracking)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกการเบิกจ่าย พร้อมระบบป้องกันการเบิกจ่ายเกินงบประมาณ (Over-budget Alert) และคำนวณงบคงเหลือเรียลไทม์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-disbursements-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            id="btn-open-disbursement-form"
            type="button"
            onClick={() => { if (visibleProjects.length) { setFormData(prev => ({ ...prev, projectId: visibleProjects.some(p => p.id === prev.projectId) ? prev.projectId : visibleProjects[0].id })); setIsFormOpen(true); } }}
            disabled={visibleProjects.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>บันทึกการเบิกจ่ายใหม่</span>
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">โครงการที่ติดตามการใช้เงินได้ ({visibleProjects.length})</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map(p => <div key={p.id}
            className={`rounded-xl border p-3 text-left ${selectedProjectFilter === String(p.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><FolderOpen className="h-4 w-4 shrink-0 text-blue-700" />{p.projectName}</span>
            <span className="mt-1 block text-xs text-slate-600">ใช้แล้ว {p.spentBudget.toLocaleString()} / {p.allocatedBudget.toLocaleString()} บาท</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedProjectFilter(String(p.id))} className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-800">ดูรายการ</button>
              <button type="button" onClick={() => { setFormData(prev => ({ ...prev, projectId: p.id })); setIsFormOpen(true); }} className="rounded-lg bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white">บันทึกการเบิกจ่าย</button>
            </div>
          </div>)}
          {visibleProjects.length === 0 && <p className="text-sm text-slate-600">ยังไม่มีโครงการที่รับผิดชอบและได้รับอนุมัติ</p>}
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-disbursement"
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, รายการ, ผู้รับเงิน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-600">โครงการ:</span>
          <select
            id="select-filter-disbursement-project"
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 focus:outline-none max-w-xs truncate"
          >
            <option value="all">ทุกโครงการ</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectCode} - {p.projectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center">ที่</th>
                <th className="py-3 px-3 w-28">เลขที่เอกสาร</th>
                <th className="py-3 px-3 w-28">วันที่</th>
                <th className="py-3 px-3 min-w-[200px]">โครงการ</th>
                <th className="py-3 px-3 min-w-[220px]">รายการเบิกจ่าย</th>
                <th className="py-3 px-3 w-36">ผู้รับเงิน / ร้านค้า</th>
                <th className="py-3 px-3 w-32 text-right bg-amber-50/60 text-amber-950 font-bold">จำนวนเงิน (บาท)</th>
                <th className="py-3 px-3 w-28 text-center">ผู้บันทึก</th>
                <th className="py-3 px-3 w-14 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    ยังไม่มีรายการเบิกจ่ายตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => {
                  const proj = visibleProjects.find((p) => p.id === t.projectId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{t.docNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.transactionDate}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 text-xs">{proj?.projectName || 'โครงการ'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{proj?.projectCode}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{t.itemDescription}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.payee}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                        {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500">{(t.recordedBy || 'เจ้าหน้าที่').split(' ')[0]}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="ลบรายการเบิกจ่าย"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs sm:text-sm">
                <td colSpan={6} className="py-3.5 px-4 text-right">
                  ยอดเบิกจ่ายรวมทั้งสิ้น ({filtered.length} รายการ):
                </td>
                <td className="py-3.5 px-3 text-right bg-amber-400 text-slate-950 font-black font-mono text-base">
                  {totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="py-3.5 px-3 text-xs text-slate-400 font-normal">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal: New Disbursement with Over-budget Alert */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-700" />
                <span>บันทึกการเบิกจ่ายเงินงบประมาณ</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setOverBudgetWarning(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Over-budget Warning Box */}
              {overBudgetWarning && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 flex items-start gap-2 text-xs font-semibold">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>{overBudgetWarning}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกโครงการที่ทำการเบิกจ่าย <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.projectId}
                  onChange={(e) => handleProjectSelect(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {visibleProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} - {p.projectName} (งบคงเหลือ: {p.remainingBudget.toLocaleString()} บ.)
                    </option>
                  ))}
                </select>
                {targetProject && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>งบจัดสรร: {targetProject.allocatedBudget.toLocaleString()} บ.</span>
                    <span>ใช้ไปแล้ว: {targetProject.spentBudget.toLocaleString()} บ.</span>
                    <span className="font-bold text-emerald-700">
                      คงเหลือเบิกได้: {targetProject.remainingBudget.toLocaleString()} บ.
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่เอกสาร / ใบเสร็จ / บันทึกข้อความ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.docNumber}
                    onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันที่เบิกจ่าย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายการเบิกจ่าย / รายละเอียดค่าใช้จ่าย <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าจัดซื้อเอกสารประกอบการเรียนรู้..."
                  value={formData.itemDescription}
                  onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวนเงินเบิกจ่าย (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้รับเงิน / ร้านค้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ร้านสมบูรณ์การศึกษา"
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="ระบุข้อกำหนดเพิ่มเติม (ถ้ามี)"
                  className="w-full rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white shadow-sm"
                >
                  บันทึกการเบิกจ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
