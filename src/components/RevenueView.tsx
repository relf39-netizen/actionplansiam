import React, { useState } from 'react';
import { RevenueItem, FiscalYear, StudentLevel } from '../types';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  FileSpreadsheet, 
  Sparkles, 
  RefreshCw,
  HelpCircle,
  Download
} from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';

interface RevenueViewProps {
  revenues: RevenueItem[];
  activeFiscalYear: FiscalYear;
  totalStudents: number;
  onUpdateRevenues: (updated: RevenueItem[]) => void;
}

export const RevenueView: React.FC<RevenueViewProps> = ({
  revenues,
  activeFiscalYear,
  totalStudents,
  onUpdateRevenues,
}) => {
  const [items, setItems] = useState<RevenueItem[]>([...revenues]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick rate settings state for current fiscal year
  const [perHeadRate, setPerHeadRate] = useState<number>(() => {
    const found = revenues.find((r) => r.itemName.includes('เงินอุดหนุนรายหัว'));
    return found ? found.ratePerHead : 1980;
  });
  const [activityRate, setActivityRate] = useState<number>(() => {
    const found = revenues.find((r) => r.itemName.includes('กิจกรรมพัฒนาผู้เรียน'));
    return found ? found.ratePerHead : 460;
  });
  const [equipmentRate, setEquipmentRate] = useState<number>(() => {
    const found = revenues.find((r) => r.itemName.includes('อุปกรณ์การเรียน'));
    return found ? found.ratePerHead : 400;
  });
  const [uniformRate, setUniformRate] = useState<number>(() => {
    const found = revenues.find((r) => r.itemName.includes('เครื่องแบบ'));
    return found ? found.ratePerHead : 380;
  });
  const [bookRate, setBookRate] = useState<number>(() => {
    const found = revenues.find((r) => r.itemName.includes('หนังสือเรียน'));
    return found ? found.ratePerHead : 650;
  });

  // Apply Quick Rates
  const handleApplyQuickRates = () => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.itemName.includes('เงินอุดหนุนรายหัว')) {
          return { ...r, ratePerHead: perHeadRate, calculatedAmount: Math.round(perHeadRate * r.eligibleCount) };
        }
        if (r.itemName.includes('กิจกรรมพัฒนาผู้เรียน')) {
          return { ...r, ratePerHead: activityRate, calculatedAmount: Math.round(activityRate * r.eligibleCount) };
        }
        if (r.itemName.includes('อุปกรณ์การเรียน')) {
          return { ...r, ratePerHead: equipmentRate, calculatedAmount: Math.round(equipmentRate * r.eligibleCount) };
        }
        if (r.itemName.includes('เครื่องแบบ')) {
          return { ...r, ratePerHead: uniformRate, calculatedAmount: Math.round(uniformRate * r.eligibleCount) };
        }
        if (r.itemName.includes('หนังสือเรียน')) {
          return { ...r, ratePerHead: bookRate, calculatedAmount: Math.round(bookRate * r.eligibleCount) };
        }
        return r;
      })
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Field change
  const handleItemChange = (id: number, field: keyof RevenueItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'ratePerHead' || field === 'eligibleCount') {
            const rate = field === 'ratePerHead' ? Number(val) || 0 : item.ratePerHead;
            const count = field === 'eligibleCount' ? Number(val) || 0 : item.eligibleCount;
            updated.calculatedAmount = Math.round(rate * count);
          } else if (field === 'calculatedAmount') {
            updated.calculatedAmount = Number(val) || 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add new revenue item
  const handleAddItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    const newItem: RevenueItem = {
      id: newId,
      schoolId: 1,
      fiscalYearId: activeFiscalYear.id,
      category: 'other',
      itemName: `รายการรายรับเพิ่มเติมที่ ${items.length + 1}`,
      ratePerHead: 0,
      eligibleCount: totalStudents,
      calculatedAmount: 0,
      isCustomRate: false,
      note: 'ระบุรายละเอียดหรือแหล่งที่มาของเงิน',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleRemoveItem = (id: number) => {
    if (confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // Sync eligible count with total student count for relevant items
  const handleSyncStudentCounts = () => {
    setItems((prev) =>
      prev.map((item) => {
        // Items tied to total students: 1, 2, 3, 4, 5, 6, 8
        if (!item.isCustomRate && item.itemName.includes('นักเรียน') || item.id <= 6 || item.id === 8) {
          const newEligible = totalStudents;
          return {
            ...item,
            eligibleCount: newEligible,
            calculatedAmount: Math.round(item.ratePerHead * newEligible),
          };
        }
        return item;
      })
    );
  };

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.calculatedAmount) || 0), 0);

  const handleSave = () => {
    onUpdateRevenues(items);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportExcel = () => {
    const exportData = items.map((r, idx) => ({
      ลำดับ: idx + 1,
      รายการรายรับ: r.itemName,
      'อัตราต่อคน (บาท)': r.ratePerHead,
      'จำนวนผู้มีสิทธิ์ (คน)': r.eligibleCount,
      'จำนวนเงินรวม (บาท)': r.calculatedAmount,
      หมายเหตุ: r.note || '',
    }));
    exportToExcel('ประมาณการรายรับ', `ประมาณการรายรับ_ปี${activeFiscalYear.year}`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-700" />
            <span>ประมาณการรายรับสถานศึกษา (แบบสเปรดชีต Excel)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คำนวณเงินอุดหนุนรายหัว เงิน Top Up ค่าหนังสือ เครื่องแบบ อุปกรณ์ กิจกรรมพัฒนาผู้เรียน และรายได้สถานศึกษา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <Check className="h-4 w-4" />
              <span>บันทึกและคำนวณยอดรวมใหม่แล้ว</span>
            </div>
          )}
          <button
            id="btn-sync-students-to-revenue"
            type="button"
            onClick={handleSyncStudentCounts}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 text-xs font-medium transition-colors"
            title="ดึงจำนวนนักเรียนทั้งหมดจากหน้านักเรียนมาปรับยอดผู้มีสิทธิ์อัตโนมัติ"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>ดึงยอดนักเรียน ({totalStudents} คน)</span>
          </button>
          <button
            id="btn-apply-obec-preset-revenue"
            type="button"
            onClick={() => {
              if (confirm('ปรับอัตราเงินอุดหนุนรายหัวและเงินกิจกรรมพัฒนาผู้เรียนตามเกณฑ์ สพฐ. มาตรฐานหรือไม่?')) {
                setItems((prev) =>
                  prev.map((r) => {
                    if (r.itemName.includes('เงินอุดหนุนรายหัว')) {
                      return { ...r, ratePerHead: 1980, calculatedAmount: Math.round(1980 * r.eligibleCount) };
                    }
                    if (r.itemName.includes('กิจกรรมพัฒนาผู้เรียน')) {
                      return { ...r, ratePerHead: 460, calculatedAmount: Math.round(460 * r.eligibleCount) };
                    }
                    if (r.itemName.includes('หนังสือเรียน')) {
                      return { ...r, ratePerHead: 650, calculatedAmount: Math.round(650 * r.eligibleCount) };
                    }
                    if (r.itemName.includes('เครื่องแบบ')) {
                      return { ...r, ratePerHead: 380, calculatedAmount: Math.round(380 * r.eligibleCount) };
                    }
                    if (r.itemName.includes('อุปกรณ์การเรียน')) {
                      return { ...r, ratePerHead: 400, calculatedAmount: Math.round(400 * r.eligibleCount) };
                    }
                    return r;
                  })
                );
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-medium transition-colors"
            title="ปรับปรุงอัตราตามเกณฑ์มาตรฐาน สพฐ."
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>โหลดเกณฑ์ สพฐ.</span>
          </button>
          <button
            id="btn-export-revenue-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            id="btn-save-revenue"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกข้อมูลรายรับ</span>
          </button>
        </div>
      </div>

      {/* Per-Head & Learner Activity Rate Setting Panel for Current Fiscal Year */}
      <div className="bg-white rounded-xl border-2 border-blue-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-700" />
              <span>กำหนดอัตราเงินอุดหนุนรายหัวและกิจกรรมพัฒนาผู้เรียน (ปีงบประมาณ พ.ศ. {activeFiscalYear.year})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ปรับปรุงอัตราเงินต่อคนตามเกณฑ์มติ ครม. / สพฐ. ประจำปีงบประมาณปัจจุบัน (ฐานจำนวนนักเรียน: <span className="font-semibold text-blue-700">{totalStudents} คน</span>)
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyQuickRates}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>คำนวณและปรับใช้อัตราปีนี้ทันที</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Rate 1: Per-Head Subsidy */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-700">1. เงินอุดหนุนรายหัว</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={perHeadRate}
                onChange={(e) => setPerHeadRate(Number(e.target.value) || 0)}
                className="w-full text-sm font-bold text-blue-900 bg-white border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 shrink-0">บ./คน</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              รวม: <span className="font-semibold text-slate-700 font-mono">{(perHeadRate * totalStudents).toLocaleString()}</span> บ.
            </div>
          </div>

          {/* Rate 2: Learner Activities */}
          <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-indigo-950">2. กิจกรรมพัฒนาผู้เรียน</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={activityRate}
                onChange={(e) => setActivityRate(Number(e.target.value) || 0)}
                className="w-full text-sm font-bold text-indigo-900 bg-white border border-indigo-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-indigo-700 shrink-0">บ./คน</span>
            </div>
            <div className="text-[10px] text-indigo-700 text-right">
              รวม: <span className="font-semibold text-indigo-950 font-mono">{(activityRate * totalStudents).toLocaleString()}</span> บ.
            </div>
          </div>

          {/* Rate 3: Learning Materials */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-700">3. อุปกรณ์การเรียน</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={equipmentRate}
                onChange={(e) => setEquipmentRate(Number(e.target.value) || 0)}
                className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 shrink-0">บ./คน</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              รวม: <span className="font-semibold text-slate-700 font-mono">{(equipmentRate * totalStudents).toLocaleString()}</span> บ.
            </div>
          </div>

          {/* Rate 4: Student Uniforms */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-700">4. เครื่องแบบนักเรียน</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={uniformRate}
                onChange={(e) => setUniformRate(Number(e.target.value) || 0)}
                className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 shrink-0">บ./คน</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              รวม: <span className="font-semibold text-slate-700 font-mono">{(uniformRate * totalStudents).toLocaleString()}</span> บ.
            </div>
          </div>

          {/* Rate 5: Textbooks */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-700">5. หนังสือเรียน</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={bookRate}
                onChange={(e) => setBookRate(Number(e.target.value) || 0)}
                className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 shrink-0">บ./คน</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              รวม: <span className="font-semibold text-slate-700 font-mono">{(bookRate * totalStudents).toLocaleString()}</span> บ.
            </div>
          </div>
        </div>
      </div>

      {/* Formula & Rule Card */}
      <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-blue-950">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>สูตรการคำนวณประมาณการรายรับ:</span>
          </div>
          <p className="font-mono text-[11px] text-blue-800 bg-white/70 px-2.5 py-1 rounded inline-block border border-blue-200">
            จำนวนเงิน (บาท) = จำนวนผู้มีสิทธิ์ (คน) × อัตราต่อคน (บาท)
          </p>
          <p className="text-[11px] text-slate-600">
            * สำหรับรายการที่ไม่อิงรายหัว (เช่น ผ้าป่า, รายได้สถานศึกษา) สามารถกรอกจำนวนเงินรวมได้โดยตรง
          </p>
        </div>
        <div className="rounded-xl bg-white border border-blue-200 p-3 text-right shrink-0 shadow-xs">
          <span className="text-xs text-slate-500 block">ประมาณการรายรับรวมทั้งสิ้น:</span>
          <span className="text-xl sm:text-2xl font-black text-blue-900">
            {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-500 ml-1">บาท</span>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>11 รายการประมาณการรายรับตามระเบียบ สพฐ. กระทรวงศึกษาธิการ</span>
          </div>
          <button
            id="btn-add-revenue-item"
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>เพิ่มรายการรายรับใหม่</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center">ที่</th>
                <th className="py-3 px-3 min-w-[240px]">รายการรายรับ</th>
                <th className="py-3 px-3 w-32 text-right">อัตรา/คน (บาท)</th>
                <th className="py-3 px-3 w-28 text-center">ผู้มีสิทธิ์ (คน)</th>
                <th className="py-3 px-3 w-40 text-right bg-emerald-50/60 text-emerald-950 font-bold">รวมเงิน (บาท)</th>
                <th className="py-3 px-3 min-w-[180px]">หมายเหตุ / แหล่งเงิน</th>
                <th className="py-3 px-3 w-14 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                      className="w-full rounded border border-transparent hover:border-slate-300 focus:border-blue-500 py-1 px-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.ratePerHead}
                      onChange={(e) => handleItemChange(item.id, 'ratePerHead', e.target.value)}
                      className="w-full text-right rounded border border-slate-200 focus:border-blue-500 py-1 px-2 text-xs sm:text-sm font-mono focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.eligibleCount}
                      onChange={(e) => handleItemChange(item.id, 'eligibleCount', e.target.value)}
                      className="w-20 text-center rounded border border-slate-200 focus:border-blue-500 py-1 px-1.5 text-xs sm:text-sm font-mono focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right bg-emerald-50/30">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.calculatedAmount}
                      onChange={(e) => handleItemChange(item.id, 'calculatedAmount', e.target.value)}
                      className="w-full text-right rounded border border-emerald-200 bg-white focus:border-emerald-500 py-1 px-2 text-xs sm:text-sm font-mono font-bold text-emerald-900 focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                      placeholder="ระบุข้อกำหนด..."
                      className="w-full rounded border border-transparent hover:border-slate-200 focus:border-blue-400 py-1 px-2 text-xs text-slate-500 focus:outline-none focus:bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-sm">
                <td colSpan={4} className="py-3.5 px-4 text-right">
                  ประมาณการรายรับรวมทั้งสิ้น (Grand Total):
                </td>
                <td className="py-3.5 px-3 text-right bg-amber-400 text-slate-950 font-black text-base font-mono">
                  {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="py-3.5 px-3 text-xs text-slate-300 font-normal">
                  บาท ({items.length} รายการ)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
