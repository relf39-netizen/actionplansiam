import React, { useState } from 'react';
import { LearnerActivity, FiscalYear, RevenueItem } from '../types';
import { Sparkles, CheckCircle2, AlertTriangle, Save, Check, Plus, Trash2, HelpCircle } from 'lucide-react';

interface LearnerActivitiesViewProps {
  activities: LearnerActivity[];
  activeFiscalYear: FiscalYear;
  revenues: RevenueItem[];
  onUpdateActivities: (updated: LearnerActivity[]) => void;
}

export const LearnerActivitiesView: React.FC<LearnerActivitiesViewProps> = ({
  activities,
  activeFiscalYear,
  revenues,
  onUpdateActivities,
}) => {
  const [list, setList] = useState<LearnerActivity[]>([...activities]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Find the revenue item for learner activities
  const learnerRev = revenues.find((r) => r.itemName.includes('กิจกรรมพัฒนาผู้เรียน'));
  const defaultTotal = learnerRev ? learnerRev.calculatedAmount : 110000;
  const [totalPool, setTotalPool] = useState<number>(defaultTotal);

  const totalPercentage = Math.round(list.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) * 100) / 100;
  const isHundredPercent = Math.abs(totalPercentage - 100) < 0.01;

  const handlePercentageChange = (id: number, val: string) => {
    const pct = Math.max(0, parseFloat(val) || 0);
    setList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newAlloc = Math.round((totalPool * pct) / 100);
          return {
            ...item,
            percentage: pct,
            allocatedAmount: newAlloc,
          };
        }
        return item;
      })
    );
  };

  const handleTotalPoolChange = (newTotal: number) => {
    setTotalPool(newTotal);
    setList((prev) =>
      prev.map((item) => {
        const newAlloc = Math.round((newTotal * item.percentage) / 100);
        return {
          ...item,
          allocatedAmount: newAlloc,
        };
      })
    );
  };

  const handleAddActivity = () => {
    const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
    const newAct: LearnerActivity = {
      id: newId,
      schoolId: 1,
      fiscalYearId: activeFiscalYear.id,
      activityName: `กิจกรรมพัฒนาผู้เรียนเพิ่มเติมที่ ${list.length + 1}`,
      percentage: 0,
      allocatedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      note: '',
      description: 'ระบุวัตถุประสงค์และกลุ่มเป้าหมาย',
    };
    setList((prev) => [...prev, newAct]);
  };

  const handleRemoveActivity = (id: number) => {
    if (confirm('ต้องการลบกิจกรรมนี้ใช่หรือไม่?')) {
      setList((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleSave = () => {
    if (!isHundredPercent) {
      if (!confirm(`ยอดรวมเปอร์เซ็นต์ปัจจุบันคือ ${totalPercentage}% (ยังไม่ครบ 100%)\nคุณต้องการบันทึกต่อไปหรือไม่?`)) {
        return;
      }
    }
    onUpdateActivities(list);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <span>การจัดสรรงบประมาณกิจกรรมพัฒนาผู้เรียน (4 กิจกรรมหลัก สพฐ.)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กิจกรรมวิชาการ, คุณธรรม/ลูกเสือ, ทัศนศึกษา, ICT และกิจกรรมตามบริบทสถานศึกษา
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <Check className="h-4 w-4" />
              <span>บันทึกการจัดสรรเรียบร้อยแล้ว</span>
            </div>
          )}
          <button
            id="btn-save-learner-activities"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกกิจกรรม</span>
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
                  <span>✅ ยอดรวมสัดส่วนกิจกรรมพัฒนาผู้เรียนถูกต้องครบถ้วน (100.00%)</span>
                ) : (
                  <span>
                    ⚠️ แจ้งเตือน: สัดส่วนเปอร์เซ็นต์รวมคือ {totalPercentage.toFixed(2)}% (ต้องเท่ากับ 100%)
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                {isHundredPercent
                  ? 'งบประมาณกิจกรรมพัฒนาผู้เรียนถูกจัดสรรครอบคลุมทั้ง 4 มิติอย่างครบถ้วน'
                  : `ต้องการอีก ${(100 - totalPercentage).toFixed(2)}% ให้ครบ 100%`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">สัดส่วนรวม:</span>
            <span
              className={`rounded-lg px-3 py-1 font-mono text-base font-black ${
                isHundredPercent ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-900'
              }`}
            >
              {totalPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Budget Source Box */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block">
            วงเงินงบประมาณกิจกรรมพัฒนาผู้เรียนรวม (บาท):
          </label>
          <p className="text-xs text-slate-500">
            อ้างอิงจากประมาณการรายรับหมวดเงินกิจกรรมพัฒนาผู้เรียน หรือปรับแต่งได้ตามความเหมาะสม
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="input-learner-budget-total"
            type="number"
            min="0"
            step="1000"
            value={totalPool}
            onChange={(e) => handleTotalPoolChange(Number(e.target.value) || 0)}
            className="w-44 text-right rounded-lg border border-slate-300 py-1.5 px-3 text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleTotalPoolChange(defaultTotal)}
            className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg whitespace-nowrap"
          >
            ดึงจากรายรับ ({defaultTotal.toLocaleString()} บ.)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700">
            รายการ 4 กิจกรรมหลักตามนโยบาย สพฐ.
          </h3>
          <button
            id="btn-add-learner-act"
            type="button"
            onClick={handleAddActivity}
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>เพิ่มกิจกรรม</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-12 text-center">ที่</th>
                <th className="py-3 px-4 min-w-[240px]">ชื่อกิจกรรมพัฒนาผู้เรียน</th>
                <th className="py-3 px-4 w-32 text-center">สัดส่วน (%)</th>
                <th className="py-3 px-4 w-44 text-right bg-amber-50/60 text-amber-950 font-bold">งบประมาณที่จัดสรร (บาท)</th>
                <th className="py-3 px-4 min-w-[220px]">รายละเอียด / วัตถุประสงค์</th>
                <th className="py-3 px-4 w-14 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((act, idx) => (
                <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-400 font-mono font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <input
                      type="text"
                      value={act.activityName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setList((prev) => prev.map((a) => (a.id === act.id ? { ...a, activityName: name } : a)));
                      }}
                      className="w-full rounded border border-transparent hover:border-slate-300 focus:border-blue-500 py-1 px-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1">
                      <input
                        id={`input-act-percent-${act.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={act.percentage}
                        onChange={(e) => handlePercentageChange(act.id, e.target.value)}
                        className="w-20 text-center rounded-lg border border-slate-300 py-1 px-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right bg-amber-50/30 font-bold font-mono text-amber-900 text-base">
                    {act.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={act.description || ''}
                      onChange={(e) => {
                        const desc = e.target.value;
                        setList((prev) => prev.map((a) => (a.id === act.id ? { ...a, description: desc } : a)));
                      }}
                      placeholder="ระบุลักษณะกิจกรรม..."
                      className="w-full rounded border border-transparent hover:border-slate-200 focus:border-blue-300 py-1 px-2 text-xs text-slate-500 focus:outline-none focus:bg-white"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(act.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="ลบกิจกรรม"
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
                  ยอดรวมสัดส่วนกิจกรรมพัฒนาผู้เรียน:
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
                <td colSpan={2} className="py-3.5 px-4 text-xs text-slate-400 font-normal">
                  บาท ({list.length} กิจกรรม)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
