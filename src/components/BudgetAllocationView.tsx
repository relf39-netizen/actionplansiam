import React, { useState, useEffect } from 'react';
import { BudgetAllocation, FiscalYear } from '../types';
import { 
  PieChart, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Info,
  DollarSign,
  ShieldAlert,
  Zap,
  Droplet,
  Wifi,
  Wrench,
  ChevronDown,
  ChevronUp,
  Scissors
} from 'lucide-react';

interface BudgetAllocationViewProps {
  allocations: BudgetAllocation[];
  activeFiscalYear: FiscalYear;
  totalRevenue: number;
  onUpdateAllocations: (updated: BudgetAllocation[]) => void;
  onNavigateToBudgetCut?: () => void;
}

export const BudgetAllocationView: React.FC<BudgetAllocationViewProps> = ({
  allocations,
  activeFiscalYear,
  totalRevenue,
  onUpdateAllocations,
  onNavigateToBudgetCut,
}) => {
  const [list, setList] = useState<BudgetAllocation[]>([...allocations]);
  const [baseBudget, setBaseBudget] = useState<number>(() => {
    const currentAllocSum = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
    return currentAllocSum > 0 ? currentAllocSum : totalRevenue;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [expandedContingency, setExpandedContingency] = useState<boolean>(true);

  // Synchronize when allocations or activeFiscalYear change
  useEffect(() => {
    setList([...allocations]);
  }, [allocations, activeFiscalYear.id]);

  // Calculate sum of percentages
  const totalPercentage = Math.round(list.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) * 100) / 100;
  const isHundredPercent = Math.abs(totalPercentage - 100) < 0.01;

  // Handle % edit for regular department or contingency
  const handlePercentageChange = (id: number, val: string) => {
    const pct = Math.max(0, parseFloat(val) || 0);
    setList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newAlloc = Math.round((baseBudget * pct) / 100);
          
          // If this is contingency with sub-items, proportionally adjust sub-items or leave as-is
          let updatedSubItems = item.contingencySubItems;
          if (item.isContingency && updatedSubItems && updatedSubItems.length > 0) {
            const currentSubSum = updatedSubItems.reduce((s, sub) => s + sub.allocatedAmount, 0);
            if (currentSubSum > 0 && newAlloc > 0) {
              const ratio = newAlloc / currentSubSum;
              updatedSubItems = updatedSubItems.map((sub) => ({
                ...sub,
                allocatedAmount: Math.round(sub.allocatedAmount * ratio),
              }));
            }
          }

          return {
            ...item,
            percentage: pct,
            allocatedAmount: newAlloc,
            remainingAmount: Math.max(0, newAlloc - item.spentAmount),
            contingencySubItems: updatedSubItems,
          };
        }
        return item;
      })
    );
  };

  // Handle base budget change
  const handleBaseBudgetChange = (newBase: number) => {
    setBaseBudget(newBase);
    setList((prev) =>
      prev.map((item) => {
        const newAlloc = Math.round((newBase * item.percentage) / 100);
        let updatedSubItems = item.contingencySubItems;
        if (item.isContingency && updatedSubItems && updatedSubItems.length > 0) {
          const currentSubSum = updatedSubItems.reduce((s, sub) => s + sub.allocatedAmount, 0);
          if (currentSubSum > 0 && newAlloc > 0) {
            const ratio = newAlloc / currentSubSum;
            updatedSubItems = updatedSubItems.map((sub) => ({
              ...sub,
              allocatedAmount: Math.round(sub.allocatedAmount * ratio),
            }));
          }
        }
        return {
          ...item,
          allocatedAmount: newAlloc,
          remainingAmount: Math.max(0, newAlloc - item.spentAmount),
          contingencySubItems: updatedSubItems,
        };
      })
    );
  };

  // Add department
  const handleAddDepartment = () => {
    const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
    const colors = ['#2563eb', '#0284c7', '#059669', '#d97706', '#7c3aed', '#ec4899', '#f97316'];
    const newDept: BudgetAllocation = {
      id: newId,
      schoolId: 1,
      fiscalYearId: activeFiscalYear.id,
      departmentName: `ฝ่ายงานใหม่ที่ ${list.length + 1}`,
      percentage: 0,
      allocatedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      colorHex: colors[list.length % colors.length],
      description: 'ระบุขอบข่ายภารกิจ',
      isContingency: false,
    };
    setList((prev) => [...prev, newDept]);
  };

  // Remove department
  const handleRemoveDept = (id: number) => {
    if (confirm('ต้องการลบฝ่ายนี้ใช่หรือไม่?')) {
      setList((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // Contingency sub-item management (Utilities, Emergency fund)
  const handleUpdateContingencySubItem = (deptId: number, subId: string, field: 'name' | 'allocatedAmount' | 'spentAmount' | 'description', val: any) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.id === deptId && item.contingencySubItems) {
          const updatedSubs = item.contingencySubItems.map((sub) => {
            if (sub.id === subId) {
              const numVal = field === 'allocatedAmount' || field === 'spentAmount' ? Math.max(0, Number(val) || 0) : val;
              return { ...sub, [field]: numVal };
            }
            return sub;
          });

          // Recompute total spent for contingency
          const totalSubSpent = updatedSubs.reduce((s, sub) => s + sub.spentAmount, 0);

          return {
            ...item,
            contingencySubItems: updatedSubs,
            spentAmount: totalSubSpent,
            remainingAmount: Math.max(0, item.allocatedAmount - totalSubSpent),
          };
        }
        return item;
      })
    );
  };

  const handleAddContingencySubItem = (deptId: number) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.id === deptId) {
          const currentSubs = item.contingencySubItems || [];
          const newSubId = `c_${Date.now()}`;
          const newSub = {
            id: newSubId,
            name: 'รายการค่าสาธารณูปโภค/สำรองจ่ายใหม่',
            allocatedAmount: 10000,
            spentAmount: 0,
            description: 'ระบุรายละเอียด',
          };
          return {
            ...item,
            contingencySubItems: [...currentSubs, newSub],
          };
        }
        return item;
      })
    );
  };

  const handleRemoveContingencySubItem = (deptId: number, subId: string) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.id === deptId && item.contingencySubItems) {
          const updatedSubs = item.contingencySubItems.filter((sub) => sub.id !== subId);
          const totalSubSpent = updatedSubs.reduce((s, sub) => s + sub.spentAmount, 0);
          return {
            ...item,
            contingencySubItems: updatedSubs,
            spentAmount: totalSubSpent,
            remainingAmount: Math.max(0, item.allocatedAmount - totalSubSpent),
          };
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    if (!isHundredPercent) {
      if (!confirm(`สัดส่วนเปอร์เซ็นต์รวมปัจจุบันคือ ${totalPercentage}% (ยังไม่เท่ากับ 100%)\nคุณต้องการบันทึกต่อไปหรือไม่?`)) {
        return;
      }
    }
    onUpdateAllocations(list);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Find contingency department
  const contingencyDept = list.find((d) => d.isContingency || d.departmentName.includes('งบกลาง') || d.departmentName.includes('สำรอง'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="h-6 w-6 text-blue-700" />
            <span>การจัดสรรงบประมาณตามฝ่าย/งาน (สัดส่วน 100%)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดสัดส่วนงบประมาณสำหรับ 4 ฝ่ายบริหารงานหลัก และกันงบประมาณไว้สำหรับงบกลาง/สำรองจ่ายฉุกเฉิน (สาธารณูปโภค ค่าไฟฟ้า ค่าน้ำ)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToBudgetCut && (
            <button
              id="btn-goto-budget-cut"
              type="button"
              onClick={onNavigateToBudgetCut}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer"
              title="ไปยังหน้าตัดแผนงบประมาณโครงการรายกลุ่มงาน"
            >
              <Scissors className="h-4 w-4 text-indigo-600" />
              <span>ตัดแผนงบประมาณรายกลุ่มงาน</span>
            </button>
          )}
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <Check className="h-4 w-4" />
              <span>บันทึกการจัดสรรงบเรียบร้อยแล้ว</span>
            </div>
          )}
          <button
            id="btn-save-budget-alloc"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกการจัดสรร</span>
          </button>
        </div>
      </div>

      {/* 100% Validation Alert Bar */}
      <div
        className={`rounded-xl p-4 border transition-colors ${
          isHundredPercent
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isHundredPercent ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold">
                {isHundredPercent ? (
                  <span>✅ ยอดรวมสัดส่วนเปอร์เซ็นต์ถูกต้องครบถ้วน (100.00%)</span>
                ) : (
                  <span>
                    ⚠️ แจ้งเตือน: สัดส่วนเปอร์เซ็นต์รวมปัจจุบันคือ {totalPercentage.toFixed(2)}% (ต้องเท่ากับ 100%)
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                {isHundredPercent
                  ? 'งบประมาณได้รับการจัดสรรลงสู่ทุกกลุ่มงานและกันงบกลางไว้อย่างถูกต้องสมดุล'
                  : `ต้องการอีก ${(100 - totalPercentage).toFixed(2)}% เพื่อให้ครบ 100% กรุณาปรับเปอร์เซ็นต์ของแต่ละฝ่ายหรือกันงบกลางให้สมดุล`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-medium">เปอร์เซ็นต์รวม:</span>
            <span
              className={`rounded-lg px-3 py-1 font-mono text-base font-black ${
                isHundredPercent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-slate-900'
              }`}
            >
              {totalPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Budget Basis Setting */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span>ฐานงบประมาณที่จะนำมาจัดสรร (บาท):</span>
          </label>
          <p className="text-xs text-slate-500">
            สามารถใช้ยอดจากประมาณการรายรับรวม หรือกำหนดวงเงินแผนปฏิบัติการเฉพาะกิจได้
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="input-base-budget-amount"
            type="number"
            min="0"
            step="1000"
            value={baseBudget}
            onChange={(e) => handleBaseBudgetChange(Number(e.target.value) || 0)}
            className="w-48 text-right rounded-lg border border-slate-300 py-1.5 px-3 text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleBaseBudgetChange(totalRevenue)}
            className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg whitespace-nowrap font-medium"
            title="ใช้ยอดประมาณการรายรับทั้งหมดจากระบบ"
          >
            ใช้วงเงินรายรับรวม ({totalRevenue.toLocaleString()} บ.)
          </button>
        </div>
      </div>

      {/* Dedicated Section: Central / Emergency / Utility Reserve (งบกลาง / สำรองจ่ายฉุกเฉิน / สาธารณูปโภค) */}
      {contingencyDept && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-purple-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <span>การกันงบประมาณ: งบกลาง / สำรองจ่ายฉุกเฉิน และค่าสาธารณูปโภค</span>
                  <span className="text-[11px] font-semibold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                    {contingencyDept.percentage}% ของงบประมาณ
                  </span>
                </h3>
                <p className="text-xs text-purple-800">
                  วงเงินรวมที่กันไว้: <strong className="font-mono">{contingencyDept.allocatedAmount.toLocaleString()}</strong> บาท | คงเหลือ: <strong className="font-mono text-emerald-800">{contingencyDept.remainingAmount.toLocaleString()}</strong> บาท
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddContingencySubItem(contingencyDept.id)}
                className="flex items-center gap-1 text-xs font-semibold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ เพิ่มรายการย่อยงบกลาง</span>
              </button>
              <button
                type="button"
                onClick={() => setExpandedContingency(!expandedContingency)}
                className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg"
                title={expandedContingency ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
              >
                {expandedContingency ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {expandedContingency && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-lg border border-purple-100 flex items-start gap-2">
                <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ระเบียบกระทรวงศึกษาธิการ / สพฐ.:</strong> โรงเรียนควรกันงบประมาณไว้ส่วนหนึ่ง (ประมาณ 10-15%) สำหรับเป็นงบกลาง ค่าสาธารณูปโภคจำเป็น (ไฟฟ้า น้ำประปา สื่อสาร) และสำรองไว้รองรับเหตุฉุกเฉิน ซ่อมแซมอาคารเรียนที่มิได้คาดการณ์ล่วงหน้า เพื่อไม่ให้กระทบต่องบประมาณโครงการวิชาการ
                </div>
              </div>

              {/* Sub-items table */}
              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-purple-100/60 border-b border-purple-200 text-purple-950 font-semibold">
                      <th className="py-2.5 px-3 min-w-[200px]">รายการค่าใช้จ่ายงบกลาง/สาธารณูปโภค</th>
                      <th className="py-2.5 px-3 w-40 text-right">วงเงินกันไว้ (บาท)</th>
                      <th className="py-2.5 px-3 w-36 text-right">จ่ายจริงแล้ว (บาท)</th>
                      <th className="py-2.5 px-3 w-36 text-right text-emerald-800 font-bold">คงเหลือ (บาท)</th>
                      <th className="py-2.5 px-3 min-w-[160px]">หมายเหตุ / ขอบเขต</th>
                      <th className="py-2.5 px-3 w-12 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {(contingencyDept.contingencySubItems || []).map((sub) => {
                      const rem = Math.max(0, sub.allocatedAmount - sub.spentAmount);
                      return (
                        <tr key={sub.id} className="hover:bg-purple-50/40">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {sub.name.includes('ไฟฟ้า') ? (
                                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              ) : sub.name.includes('น้ำ') ? (
                                <Droplet className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              ) : sub.name.includes('อินเทอร์เน็ต') || sub.name.includes('สื่อสาร') ? (
                                <Wifi className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              ) : (
                                <Wrench className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                              )}
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => handleUpdateContingencySubItem(contingencyDept.id, sub.id, 'name', e.target.value)}
                                className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 py-0.5 focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={sub.allocatedAmount}
                              onChange={(e) => handleUpdateContingencySubItem(contingencyDept.id, sub.id, 'allocatedAmount', e.target.value)}
                              className="w-28 text-right font-mono font-semibold rounded border border-purple-200 py-1 px-2 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={sub.spentAmount}
                              onChange={(e) => handleUpdateContingencySubItem(contingencyDept.id, sub.id, 'spentAmount', e.target.value)}
                              className="w-28 text-right font-mono rounded border border-purple-200 py-1 px-2 focus:ring-1 focus:ring-purple-500 focus:outline-none text-slate-700"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {rem.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={sub.description || ''}
                              onChange={(e) => handleUpdateContingencySubItem(contingencyDept.id, sub.id, 'description', e.target.value)}
                              placeholder="เช่น ค่าไฟอาคารเรียน..."
                              className="w-full text-slate-500 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 py-0.5 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveContingencySubItem(contingencyDept.id, sub.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="ลบรายการ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Allocation Cards and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-700">
              ตารางกำหนดสัดส่วนร้อยละ (%) และคำนวณจำนวนเงินที่จัดสรรแต่ละกลุ่มงาน
            </h3>
            <p className="text-[11px] text-slate-500">
              กำหนดสัดส่วนงบประมาณของ 4 กลุ่มบริหารงาน และงบกลาง/สำรองจ่ายฉุกเฉิน รวมกันต้องได้ 100%
            </p>
          </div>
          <button
            id="btn-add-dept"
            type="button"
            onClick={handleAddDepartment}
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>เพิ่มฝ่ายงาน</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-12 text-center">สี</th>
                <th className="py-3 px-4 min-w-[200px]">ฝ่าย / งาน</th>
                <th className="py-3 px-4 w-32 text-center">สัดส่วน (%)</th>
                <th className="py-3 px-4 w-44 text-right bg-blue-50/60 text-blue-950 font-bold">งบประมาณที่จัดสรร (บาท)</th>
                <th className="py-3 px-4 w-36 text-right">ใช้ไปแล้ว (บาท)</th>
                <th className="py-3 px-4 w-36 text-right font-semibold text-emerald-700">คงเหลือ (บาท)</th>
                <th className="py-3 px-4 min-w-[200px]">ขอบข่ายงาน / รายละเอียด</th>
                <th className="py-3 px-4 w-14 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isContingency ? 'bg-purple-50/30 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-slate-300 shadow-xs"
                      style={{ backgroundColor: item.colorHex }}
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.departmentName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setList((prev) => prev.map((d) => (d.id === item.id ? { ...d, departmentName: name } : d)));
                        }}
                        className="w-full rounded border border-transparent hover:border-slate-300 focus:border-blue-500 py-1 px-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white"
                      />
                      {item.isContingency && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded whitespace-nowrap font-normal">
                          งบกลาง/สำรอง
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1">
                      <input
                        id={`input-dept-percent-${item.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.percentage}
                        onChange={(e) => handlePercentageChange(item.id, e.target.value)}
                        className="w-20 text-center rounded-lg border border-slate-300 py-1 px-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right bg-blue-50/30 font-bold font-mono text-blue-900">
                    {item.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {item.spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    {item.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => {
                        const desc = e.target.value;
                        setList((prev) => prev.map((d) => (d.id === item.id ? { ...d, description: desc } : d)));
                      }}
                      className="w-full rounded border border-transparent hover:border-slate-200 focus:border-blue-300 py-1 px-2 text-xs text-slate-500 focus:outline-none focus:bg-white"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveDept(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="ลบฝ่ายงาน"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-sm">
                <td colSpan={2} className="py-3.5 px-4 text-right">
                  ยอดรวมสัดส่วนการจัดสรรทั้งสิ้น:
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded font-mono font-black ${
                      isHundredPercent ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                    }`}
                  >
                    {totalPercentage.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right bg-blue-950 text-amber-300 font-black font-mono text-base">
                  {list.reduce((s, a) => s + a.allocatedAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                  {list.reduce((s, a) => s + a.spentAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">
                  {list.reduce((s, a) => s + a.remainingAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="py-3.5 px-4 text-xs text-slate-400 font-normal">
                  บาท ({list.length} ฝ่ายงาน/งบกลาง)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
