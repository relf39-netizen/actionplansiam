import React, { useState, useEffect } from 'react';
import { StudentLevel, FiscalYear } from '../types';
import { Users, Save, Check, Calculator, RefreshCcw, Info, Plus, Trash2, GraduationCap } from 'lucide-react';

interface StudentDataViewProps {
  students: StudentLevel[];
  activeFiscalYear: FiscalYear;
  onUpdateStudents: (updatedList: StudentLevel[]) => void;
  onUpdateFiscalYear?: (updatedFy: FiscalYear) => void;
}

export const StudentDataView: React.FC<StudentDataViewProps> = ({
  students,
  activeFiscalYear,
  onUpdateStudents,
  onUpdateFiscalYear,
}) => {
  const [list, setList] = useState<StudentLevel[]>([...students]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setList([...students]);
  }, [students, activeFiscalYear.id]);

  // Handle male or female count edit
  const handleCountChange = (id: number, field: 'maleCount' | 'femaleCount', val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: num };
          updated.totalCount = updated.maleCount + updated.femaleCount;
          return updated;
        }
        return item;
      })
    );
  };

  // Add a new grade level row (e.g. if school opens ม.1-ม.3 or daycare)
  const handleAddGrade = () => {
    const newId = list.length > 0 ? Math.max(...list.map((s) => s.id)) + 1 : 1;
    const newRow: StudentLevel = {
      id: newId,
      schoolId: 1,
      fiscalYearId: activeFiscalYear.id,
      gradeLevel: `ระดับชั้นเพิ่มเติม ${list.length + 1}`,
      stage: 'ประถม',
      maleCount: 0,
      femaleCount: 0,
      totalCount: 0,
    };
    setList((prev) => [...prev, newRow]);
  };

  const handleRemoveGrade = (id: number) => {
    if (confirm('ต้องการลบแถวระดับชั้นนี้ใช่หรือไม่?')) {
      setList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Grand totals
  const totalMale = list.reduce((sum, s) => sum + s.maleCount, 0);
  const totalFemale = list.reduce((sum, s) => sum + s.femaleCount, 0);
  const grandTotal = list.reduce((sum, s) => sum + s.totalCount, 0);

  // Kindergarten subtotal
  const kinderStudents = list.filter((s) => s.stage === 'อนุบาล');
  const kinderTotal = kinderStudents.reduce((sum, s) => sum + s.totalCount, 0);

  // Primary subtotal
  const primaryStudents = list.filter((s) => s.stage === 'ประถม');
  const primaryTotal = primaryStudents.reduce((sum, s) => sum + s.totalCount, 0);

  // Estimated per-head subsidy from OBEC rates (Kindergarten: ~1,800, Primary: ~2,050)
  const estimatedSubsidy = kinderTotal * 1800 + primaryTotal * 2050;

  const handleSave = () => {
    onUpdateStudents(list);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-700" />
            <span>ข้อมูลจำนวนนักเรียน (แยกตามระดับชั้น)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ประจำปีงบประมาณ พ.ศ. {activeFiscalYear.year} (ข้อมูลนี้จะถูกนำไปคำนวณเงินอุดหนุนรายหัวและงบประมาณอัตโนมัติ)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <Check className="h-4 w-4" />
              <span>บันทึกและคำนวณยอดเงินใหม่แล้ว</span>
            </div>
          )}
          <button
            id="btn-save-students"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกจำนวนนักเรียน</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-blue-900 text-white p-4 shadow-sm">
          <span className="text-xs font-medium text-blue-200">จำนวนนักเรียนทั้งหมดของโรงเรียน</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300">{grandTotal}</span>
            <span className="text-xs text-blue-200">คน</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-200">
            ชาย {totalMale} คน • หญิง {totalFemale} คน
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">ระดับก่อนประถมศึกษา (อนุบาล 1-3)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{kinderTotal}</span>
            <span className="text-xs text-slate-500">คน ({((kinderTotal / (grandTotal || 1)) * 100).toFixed(1)}%)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            เกณฑ์เงินอุดหนุนรายหัว อ.1-3: 1,800 บ./คน (~{(kinderTotal * 1800).toLocaleString()} บ.)
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">ระดับประถมศึกษา (ป.1 - ป.6)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{primaryTotal}</span>
            <span className="text-xs text-slate-500">คน ({((primaryTotal / (grandTotal || 1)) * 100).toFixed(1)}%)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            เกณฑ์เงินอุดหนุนรายหัว ป.1-6: 2,050 บ./คน (~{(primaryTotal * 2050).toLocaleString()} บ.)
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-amber-900">ประมาณการเงินอุดหนุนรายหัวพื้นฐาน</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-950 font-mono">
              {estimatedSubsidy.toLocaleString()}
            </span>
            <span className="text-xs text-amber-800">บาท</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>คำนวณตามเกณฑ์อัตรา สพฐ. กระทรวงศึกษาธิการ</span>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">ตารางกรอกจำนวนนักเรียนแยกรายชั้น</h3>
            <p className="text-xs text-slate-500">สามารถกรอกตัวเลขนักเรียนชายและหญิง ระบบจะคำนวณยอดรวมรายชั้นและยอดรวมทั้งโรงเรียนอัตโนมัติ</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddGrade}
              className="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มระดับชั้น</span>
            </button>
            <button
              type="button"
              onClick={() => setList([...students])}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ตค่า</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-16 text-center">ลำดับ</th>
                <th className="py-3 px-4">ระดับชั้น</th>
                <th className="py-3 px-4">ช่วงชั้น</th>
                <th className="py-3 px-4 text-center w-36">นักเรียนชาย (คน)</th>
                <th className="py-3 px-4 text-center w-36">นักเรียนหญิง (คน)</th>
                <th className="py-3 px-4 text-center w-36 bg-blue-50/70 text-blue-900 font-bold">รวม (คน)</th>
                <th className="py-3 px-4 text-right w-40 text-slate-600">เงินอุดหนุนรายหัว (บาท)</th>
                <th className="py-3 px-4 w-14 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item, idx) => {
                const rate = item.stage === 'อนุบาล' ? 1800 : 2050;
                const rowSubsidy = item.totalCount * rate;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <input
                        type="text"
                        value={item.gradeLevel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setList((prev) => prev.map((s) => s.id === item.id ? { ...s, gradeLevel: val } : s));
                        }}
                        className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 py-0.5 focus:outline-none w-full"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.stage}
                        onChange={(e) => {
                          const val = e.target.value as 'อนุบาล' | 'ประถม';
                          setList((prev) => prev.map((s) => s.id === item.id ? { ...s, stage: val } : s));
                        }}
                        className={`text-xs rounded-full px-2.5 py-1 font-semibold border-0 cursor-pointer ${
                          item.stage === 'อนุบาล'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <option value="อนุบาล">อนุบาล</option>
                        <option value="ประถม">ประถม</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        id={`input-student-male-${item.id}`}
                        type="number"
                        min="0"
                        value={item.maleCount}
                        onChange={(e) => handleCountChange(item.id, 'maleCount', e.target.value)}
                        className="w-24 text-center rounded-lg border border-slate-300 py-1.5 px-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        id={`input-student-female-${item.id}`}
                        type="number"
                        min="0"
                        value={item.femaleCount}
                        onChange={(e) => handleCountChange(item.id, 'femaleCount', e.target.value)}
                        className="w-24 text-center rounded-lg border border-slate-300 py-1.5 px-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </td>
                    <td className="py-3 px-4 text-center bg-blue-50/50 font-bold text-blue-900 text-base font-mono">
                      {item.totalCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {rowSubsidy.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveGrade(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="ลบระดับชั้น"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-sm">
                <td colSpan={3} className="py-3.5 px-4 text-right">
                  จำนวนนักเรียนรวมทั้งสิ้นของโรงเรียน:
                </td>
                <td className="py-3.5 px-4 text-center text-amber-300 font-mono">
                  {totalMale} คน
                </td>
                <td className="py-3.5 px-4 text-center text-amber-300 font-mono">
                  {totalFemale} คน
                </td>
                <td className="py-3.5 px-4 text-center bg-amber-400 text-slate-900 font-extrabold text-lg font-mono">
                  {grandTotal} คน
                </td>
                <td className="py-3.5 px-4 text-right bg-blue-950 text-amber-300 font-bold font-mono">
                  {estimatedSubsidy.toLocaleString()} บ.
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
