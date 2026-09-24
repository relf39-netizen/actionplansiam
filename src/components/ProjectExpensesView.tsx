import React, { useState } from 'react';
import { Project, ProjectExpenseItem } from '../types';
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
  selectedProjectId?: number;
  onUpdateProjects: (updated: Project[]) => void;
  onBackToProjects?: () => void;
}

export const ProjectExpensesView: React.FC<ProjectExpensesViewProps> = ({
  projects,
  selectedProjectId,
  onUpdateProjects,
  onBackToProjects,
}) => {
  const [activeProjId, setActiveProjId] = useState<number>(selectedProjectId || projects[0]?.id || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentProject = projects.find((p) => p.id === activeProjId) || projects[0];

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

    const newExpenseSum = updatedExpenses.reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);

    const updatedProjects = projects.map((p) => {
      if (p.id === currentProject.id) {
        return {
          ...p,
          expenses: updatedExpenses,
          expenseItems: updatedExpenses,
          allocatedBudget: newExpenseSum > 0 ? newExpenseSum : p.allocatedBudget,
          remainingBudget: Math.max(0, (newExpenseSum > 0 ? newExpenseSum : p.allocatedBudget) - p.spentBudget),
        };
      }
      return p;
    });

    onUpdateProjects(updatedProjects);
  };

  const handleAddExpense = () => {
    if (!currentProject) return;
    const currentExp = currentProject.expenses || currentProject.expenseItems || [];
    const newId = currentExp.length > 0 ? Math.max(...currentExp.map((e: ProjectExpenseItem) => e.id)) + 1 : 1;
    const newExpense: ProjectExpenseItem = {
      id: newId,
      projectId: currentProject.id,
      category: 'ค่าวัสดุ',
      itemName: `รายการค่าใช้จ่ายที่ ${currentExp.length + 1}`,
      quantity: 1,
      unit: 'ชุด',
      unitPrice: 1000,
      totalAmount: 1000,
    };

    const updatedExpenses = [...currentExp, newExpense];
    const newTotal = updatedExpenses.reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);

    const updatedProjects = projects.map((p) => {
      if (p.id === currentProject.id) {
        return {
          ...p,
          expenses: updatedExpenses,
          expenseItems: updatedExpenses,
          allocatedBudget: newTotal,
          remainingBudget: Math.max(0, newTotal - p.spentBudget),
        };
      }
      return p;
    });

    onUpdateProjects(updatedProjects);
  };

  const handleRemoveExpense = (expenseId: number) => {
    if (!currentProject) return;
    if (confirm('ต้องการลบรายการค่าใช้จ่ายนี้?')) {
      const currentExpenses = currentProject.expenses || currentProject.expenseItems || [];
      const updatedExpenses = currentExpenses.filter((e: ProjectExpenseItem) => e.id !== expenseId);
      const newTotal = updatedExpenses.reduce((s: number, e: ProjectExpenseItem) => s + e.totalAmount, 0);

      const updatedProjects = projects.map((p) => {
        if (p.id === currentProject.id) {
          return {
            ...p,
            expenses: updatedExpenses,
            expenseItems: updatedExpenses,
            allocatedBudget: newTotal,
            remainingBudget: Math.max(0, newTotal - p.spentBudget),
          };
        }
        return p;
      });

      onUpdateProjects(updatedProjects);
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
          <button
            id="btn-add-expense-item"
            type="button"
            onClick={handleAddExpense}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ เพิ่มรายการค่าใช้จ่าย</span>
          </button>
        </div>
      </div>

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
            {projects.map((p) => (
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

      {/* 4 Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
          <div className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">1. หมวดค่าตอบแทน</div>
          <div className="text-lg font-black font-mono text-blue-900 mt-1">
            {remunerationSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">วิทยากร, ค่าจ้างเหมาบริการ</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">2. หมวดค่าใช้สอย</div>
          <div className="text-lg font-black font-mono text-emerald-900 mt-1">
            {operationalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">อาหาร, ที่พัก, ยานพาหนะ, ซ่อมแซม</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">3. หมวดค่าวัสดุ</div>
          <div className="text-lg font-black font-mono text-amber-950 mt-1">
            {materialSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-amber-800 mt-0.5">เอกสาร, สื่อการเรียนรู้, เครื่องเขียน</div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5">
          <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wider">4. หมวดค่าครุภัณฑ์</div>
          <div className="text-lg font-black font-mono text-purple-900 mt-1">
            {equipmentSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">อุปกรณ์คงทนตามแผน</div>
        </div>
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
    </div>
  );
};
