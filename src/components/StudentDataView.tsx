import React, { useState, useEffect } from 'react';
import { StudentLevel, FiscalYear, School } from '../types';
import { Users, Save, Check, Calculator, RefreshCcw, Info, Plus, Trash2, GraduationCap, School as SchoolIcon, Layers } from 'lucide-react';

interface StudentDataViewProps {
  students: StudentLevel[];
  activeFiscalYear: FiscalYear;
  school?: School;
  onUpdateStudents: (updatedList: StudentLevel[]) => void;
  onUpdateFiscalYear?: (updatedFy: FiscalYear) => void;
}

const STANDARD_GRADE_LEVELS: Array<{ gradeLevel: string; stage: 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย'; rate: number }> = [
  { gradeLevel: 'อนุบาล 1', stage: 'อนุบาล', rate: 1800 },
  { gradeLevel: 'อนุบาล 2', stage: 'อนุบาล', rate: 1800 },
  { gradeLevel: 'อนุบาล 3', stage: 'อนุบาล', rate: 1800 },
  { gradeLevel: 'ประถมศึกษาปีที่ 1', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'ประถมศึกษาปีที่ 2', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'ประถมศึกษาปีที่ 3', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'ประถมศึกษาปีที่ 4', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'ประถมศึกษาปีที่ 5', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'ประถมศึกษาปีที่ 6', stage: 'ประถม', rate: 2050 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 1', stage: 'มัธยมต้น', rate: 3700 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 2', stage: 'มัธยมต้น', rate: 3700 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 3', stage: 'มัธยมต้น', rate: 3700 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 4', stage: 'มัธยมปลาย', rate: 4100 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 5', stage: 'มัธยมปลาย', rate: 4100 },
  { gradeLevel: 'มัธยมศึกษาปีที่ 6', stage: 'มัธยมปลาย', rate: 4100 },
];

export const StudentDataView: React.FC<StudentDataViewProps> = ({
  students,
  activeFiscalYear,
  school,
  onUpdateStudents,
  onUpdateFiscalYear,
}) => {
  const currentSchoolId = school?.id || 1;

  // Build merged list: keep all existing students, and ensure secondary grades (ม.1–ม.6) are present
  const initializeGradeList = (incoming: StudentLevel[]): StudentLevel[] => {
    const schoolStudents = incoming.filter(
      (s) => !s.fiscalYearId || s.fiscalYearId === activeFiscalYear.id || incoming.length <= 15
    );

    const existingList = [...(schoolStudents.length > 0 ? schoolStudents : incoming)];
    let maxId = existingList.length > 0 ? Math.max(...existingList.map((s) => Number(s.id) || 0)) : 0;

    // Check which standard levels are missing
    const merged = [...existingList];
    for (const std of STANDARD_GRADE_LEVELS) {
      const found = merged.find(
        (e) =>
          e.gradeLevel.trim() === std.gradeLevel.trim() ||
          (std.gradeLevel.startsWith('มัธยมศึกษาปีที่') &&
            e.gradeLevel.replace(/\s+/g, '').includes(std.gradeLevel.replace('มัธยมศึกษาปีที่', 'ม.').trim()))
      );
      if (!found) {
        maxId += 1;
        merged.push({
          id: maxId,
          schoolId: currentSchoolId,
          fiscalYearId: activeFiscalYear.id,
          gradeLevel: std.gradeLevel,
          stage: std.stage,
          maleCount: 0,
          femaleCount: 0,
          totalCount: 0,
        });
      }
    }
    return merged;
  };

  const [list, setList] = useState<StudentLevel[]>(() => initializeGradeList(students));
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setList(initializeGradeList(students));
  }, [students, activeFiscalYear.id, currentSchoolId]);

  // Handle male or female count edit
  const handleCountChange = (id: number, field: 'maleCount' | 'femaleCount', val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: num };
          updated.totalCount = (field === 'maleCount' ? num : updated.maleCount) + (field === 'femaleCount' ? num : updated.femaleCount);
          return updated;
        }
        return item;
      })
    );
  };

  // Add a custom new grade level row
  const handleAddGrade = () => {
    const newId = list.length > 0 ? Math.max(...list.map((s) => Number(s.id) || 0)) + 1 : 1;
    const newRow: StudentLevel = {
      id: newId,
      schoolId: currentSchoolId,
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
    if (window.confirm('ต้องการลบแถวระดับชั้นนี้ใช่หรือไม่?')) {
      setList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Grand totals
  const totalMale = list.reduce((sum, s) => sum + (Number(s.maleCount) || 0), 0);
  const totalFemale = list.reduce((sum, s) => sum + (Number(s.femaleCount) || 0), 0);
  const grandTotal = list.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

  // Subtotals by stage
  const kinderStudents = list.filter((s) => s.stage === 'อนุบาล');
  const kinderTotal = kinderStudents.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

  const primaryStudents = list.filter((s) => s.stage === 'ประถม');
  const primaryTotal = primaryStudents.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

  const secLowerStudents = list.filter((s) => s.stage === 'มัธยมต้น');
  const secLowerTotal = secLowerStudents.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

  const secUpperStudents = list.filter((s) => s.stage === 'มัธยมปลาย');
  const secUpperTotal = secUpperStudents.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

  // Estimated per-head subsidy from official OBEC rates
  // อนุบาล: 1,800 | ประถม: 2,050 | มัธยมต้น: 3,700 | มัธยมปลาย: 4,100
  const estimatedSubsidy =
    kinderTotal * 1800 +
    primaryTotal * 2050 +
    secLowerTotal * 3700 +
    secUpperTotal * 4100;

  const handleSave = () => {
    // Preserve schoolId and fiscalYearId on every row
    const payload = list.map((item) => ({
      ...item,
      schoolId: currentSchoolId,
      fiscalYearId: activeFiscalYear.id,
      totalCount: Number(item.maleCount || 0) + Number(item.femaleCount || 0),
    }));
    onUpdateStudents(payload);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case 'อนุบาล':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'ประถม':
        return 'bg-blue-100 text-blue-900 border border-blue-300';
      case 'มัธยมต้น':
        return 'bg-indigo-100 text-indigo-900 border border-indigo-300';
      case 'มัธยมปลาย':
        return 'bg-purple-100 text-purple-900 border border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-300';
    }
  };

  const getStageRate = (stage: string) => {
    switch (stage) {
      case 'อนุบาล':
        return 1800;
      case 'ประถม':
        return 2050;
      case 'มัธยมต้น':
        return 3700;
      case 'มัธยมปลาย':
        return 4100;
      default:
        return 2050;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-700" />
            <span>ข้อมูลจำนวนนักเรียน (แยกตามระดับชั้น อนุบาล - ม.6)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>โรงเรียน: <strong className="text-slate-800">{school?.name || 'โรงเรียนของคุณ'}</strong></span>
            <span>•</span>
            <span>ปีงบประมาณ พ.ศ. <strong className="text-blue-700">{activeFiscalYear.year}</strong></span>
            <span>(บันทึกแยกตามโรงเรียนและปีงบประมาณอย่างสมบูรณ์)</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs">
              <Check className="h-4 w-4" />
              <span>บันทึกลงฐานข้อมูลและคำนวณเงินอุดหนุนใหม่แล้ว</span>
            </div>
          )}
          <button
            id="btn-save-students"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกจำนวนนักเรียนลง MySQL</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards across all stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Grand */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-200">นักเรียนรวมทั้งหมด</span>
            <span className="text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
              ปี {activeFiscalYear.year}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-mono">{grandTotal}</span>
            <span className="text-xs text-blue-200">คน</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-200 flex items-center justify-between border-t border-blue-800/80 pt-2">
            <span>ชาย: <strong>{totalMale}</strong> คน</span>
            <span>หญิง: <strong>{totalFemale}</strong> คน</span>
          </div>
        </div>

        {/* 1. Kindergarten */}
        <div className="rounded-xl bg-white border border-amber-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>ก่อนประถม (อ.1-3)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{kinderTotal}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-800 border-t border-amber-100 pt-1">
            อัตรา: 1,800 บ./คน<br />
            รวม: {(kinderTotal * 1800).toLocaleString()} บ.
          </div>
        </div>

        {/* 2. Primary */}
        <div className="rounded-xl bg-white border border-blue-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span>ประถม (ป.1-6)</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{primaryTotal}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <div className="mt-2 text-[10px] text-blue-800 border-t border-blue-100 pt-1">
            อัตรา: 2,050 บ./คน<br />
            รวม: {(primaryTotal * 2050).toLocaleString()} บ.
          </div>
        </div>

        {/* 3. Lower Secondary */}
        <div className="rounded-xl bg-white border border-indigo-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
            <span>มัธยมต้น (ม.1-3)</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{secLowerTotal}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <div className="mt-2 text-[10px] text-indigo-800 border-t border-indigo-100 pt-1">
            อัตรา: 3,700 บ./คน<br />
            รวม: {(secLowerTotal * 3700).toLocaleString()} บ.
          </div>
        </div>

        {/* 4. Upper Secondary */}
        <div className="rounded-xl bg-white border border-purple-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-purple-950">
            <span>มัธยมปลาย (ม.4-6)</span>
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{secUpperTotal}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <div className="mt-2 text-[10px] text-purple-800 border-t border-purple-100 pt-1">
            อัตรา: 4,100 บ./คน<br />
            รวม: {(secUpperTotal * 4100).toLocaleString()} บ.
          </div>
        </div>
      </div>

      {/* Estimated Subsidy Banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-100/50 border border-amber-300 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-950">
              ประมาณการเงินอุดหนุนรายหัวพื้นฐานรวม 4 ช่วงชั้น (สพฐ.)
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              คำนวณจากเกณฑ์: อนุบาล (1,800 บ.) + ประถม (2,050 บ.) + มัธยมต้น (3,700 บ.) + มัธยมปลาย (4,100 บ.)
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-amber-950 font-mono">
            {estimatedSubsidy.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-amber-900">บาท</span>
          </div>
          <div className="text-[11px] text-amber-800">
            ยอดนี้จะซิงค์ไปยังหน้าประมาณการรายรับอัตโนมัติ
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-700" />
              <span>ตารางกรอกจำนวนนักเรียนแยกรายชั้น (อนุบาล 1 - ม.6)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กรอกจำนวนนักเรียนชายและหญิง ระบบจะคำนวณยอดรวมรายชั้นและประมาณการเงินอุดหนุนรายหัวให้อัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddGrade}
              className="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มระดับชั้นพิเศษ</span>
            </button>
            <button
              type="button"
              onClick={() => setList(initializeGradeList(students))}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg bg-white cursor-pointer"
              title="คืนค่าเดิม"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ตค่า</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-14 text-center">ลำดับ</th>
                <th className="py-3 px-4 min-w-[180px]">ระดับชั้น</th>
                <th className="py-3 px-4 w-36">ช่วงชั้น</th>
                <th className="py-3 px-4 text-center w-36">นักเรียนชาย (คน)</th>
                <th className="py-3 px-4 text-center w-36">นักเรียนหญิง (คน)</th>
                <th className="py-3 px-4 text-center w-36 bg-blue-50/70 text-blue-900 font-bold">รวม (คน)</th>
                <th className="py-3 px-4 text-right w-44 text-slate-700">เงินอุดหนุนรายหัว (บาท)</th>
                <th className="py-3 px-4 w-14 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item, idx) => {
                const rate = getStageRate(item.stage);
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
                          setList((prev) => prev.map((s) => (s.id === item.id ? { ...s, gradeLevel: val } : s)));
                        }}
                        className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 py-0.5 focus:outline-none w-full"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.stage}
                        onChange={(e) => {
                          const val = e.target.value as 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย';
                          setList((prev) => prev.map((s) => (s.id === item.id ? { ...s, stage: val } : s)));
                        }}
                        className={`text-xs rounded-full px-2.5 py-1 font-semibold cursor-pointer ${getStageBadgeStyle(item.stage)}`}
                      >
                        <option value="อนุบาล">อนุบาล</option>
                        <option value="ประถม">ประถม</option>
                        <option value="มัธยมต้น">มัธยมต้น (ม.1-3)</option>
                        <option value="มัธยมปลาย">มัธยมปลาย (ม.4-6)</option>
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
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      <div className="font-bold">{rowSubsidy.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">({rate.toLocaleString()} บ./คน)</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveGrade(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
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
