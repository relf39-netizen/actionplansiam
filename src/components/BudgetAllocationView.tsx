import React, { useEffect, useState } from 'react';
import { PieChart, Save, Plus, Trash2, Scissors } from 'lucide-react';
import { BudgetAllocation, BudgetSettings, FiscalYear, RevenueItem } from '../types';

interface Props {
  allocations: BudgetAllocation[];
  budgetSettings: BudgetSettings;
  activeFiscalYear: FiscalYear;
  revenues: RevenueItem[];
  onUpdateAllocations: (rows: BudgetAllocation[], settings: BudgetSettings) => Promise<boolean>;
  onNavigateToBudgetCut?: () => void;
}

const names = ['ฝ่ายบริหารงานวิชาการ', 'ฝ่ายบริหารงานบุคคล', 'ฝ่ายบริหารงานทั่วไป', 'ฝ่ายบริหารงานงบประมาณ'];
const responsibilities: Record<string, string> = {
  'ฝ่ายบริหารงานวิชาการ': 'พัฒนาหลักสูตรและการเรียนการสอน วัดและประเมินผล ส่งเสริมการอ่านและวิจัย พัฒนาสื่อและนวัตกรรม นิเทศภายใน และประกันคุณภาพการศึกษา',
  'ฝ่ายบริหารงานบุคคล': 'วางแผนอัตรากำลัง มอบหมายและประเมินงานครู พัฒนาวิชาชีพ เสริมสร้างวินัย คุณธรรม ขวัญกำลังใจ และสวัสดิการบุคลากร',
  'ฝ่ายบริหารงานทั่วไป': 'ดูแลอาคารสถานที่ สิ่งแวดล้อม ความปลอดภัย ระบบสารสนเทศ งานธุรการ ประชาสัมพันธ์ กิจการนักเรียน และประสานงานชุมชน',
  'ฝ่ายบริหารงานงบประมาณ': 'จัดทำแผนและคำของบประมาณ ดูแลการเงิน บัญชี พัสดุและสินทรัพย์ ติดตามการใช้จ่าย ตรวจสอบและรายงานผล',
};
const colors = ['#2563eb', '#059669', '#d97706', '#0284c7', '#7c3aed'];
const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round = (n: number) => Math.round(n * 100) / 100;
const legacyReserve = (a: BudgetAllocation) => !a.reserveType && (a.isContingency || a.departmentName.includes('งบกลาง') || a.departmentName.includes('สำรองจ่ายฉุกเฉิน'));
const defaultDepartments = (fy: FiscalYear): BudgetAllocation[] => names.map((name, i) => ({
  id: -(i + 1), schoolId: fy.schoolId, fiscalYearId: fy.id, departmentName: name,
  percentage: 25, allocatedAmount: 0, spentAmount: 0, remainingAmount: 0,
  colorHex: colors[i], description: responsibilities[name],
}));
const departments = (rows: BudgetAllocation[], fy: FiscalYear) => {
  const selected = rows.filter(a => !a.reserveType && !legacyReserve(a));
  if (!selected.length) return defaultDepartments(fy);
  const legacy = rows.some(legacyReserve);
  if (!legacy) return selected.map(a => ({ ...a, description: a.description?.trim() || responsibilities[a.departmentName] || '' }));
  const total = selected.reduce((sum, a) => sum + Number(a.percentage || 0), 0);
  if (total <= 0) return selected;
  let used = 0;
  return selected.map((a, i) => {
    const percentage = i === selected.length - 1 ? round(100 - used) : round(a.percentage * 100 / total);
    used += percentage;
    return { ...a, percentage, description: a.description?.trim() || responsibilities[a.departmentName] || '' };
  });
};

export const BudgetAllocationView: React.FC<Props> = ({ allocations, budgetSettings, activeFiscalYear, revenues, onUpdateAllocations, onNavigateToBudgetCut }) => {
  const [list, setList] = useState<BudgetAllocation[]>(() => departments(allocations, activeFiscalYear));
  const [carryover, setCarryover] = useState(budgetSettings.carryover);
  const [manualTotal, setManualTotal] = useState<number | null>(budgetSettings.manualTotal);
  const [utility, setUtility] = useState(allocations.find(a => a.reserveType === 'utility')?.allocatedAmount || 0);
  const [otherReserve, setOtherReserve] = useState(allocations.find(a => a.reserveType === 'other')?.allocatedAmount || allocations.find(legacyReserve)?.allocatedAmount || 0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setList(departments(allocations, activeFiscalYear));
    setCarryover(Number(budgetSettings.carryover) || 0);
    setManualTotal(budgetSettings.manualTotal == null ? null : Number(budgetSettings.manualTotal));
    setUtility(Number(allocations.find(a => a.reserveType === 'utility')?.allocatedAmount) || 0);
    setOtherReserve(Number(allocations.find(a => a.reserveType === 'other')?.allocatedAmount || allocations.find(legacyReserve)?.allocatedAmount) || 0);
  }, [allocations, budgetSettings, activeFiscalYear.id]);

  // Only the two grant sources (including the small-school supplement) form the default budget.
  const subsidy = revenues.filter(r => r.category === 'subsidy' && !r.itemName.includes('เงินเพิ่มโรงเรียนขนาดเล็ก'))
    .reduce((sum, r) => sum + Number(r.calculatedAmount || 0), 0);
  const smallSchool = revenues.filter(r => r.category === 'small_school' || r.itemName.includes('เงินเพิ่มโรงเรียนขนาดเล็ก'))
    .reduce((sum, r) => sum + Number(r.calculatedAmount || 0), 0);
  const activity = revenues.filter(r => r.category === 'activity')
    .reduce((sum, r) => sum + Number(r.calculatedAmount || 0), 0);
  const automaticTotal = round(subsidy + smallSchool + activity + carryover);
  const gross = manualTotal == null ? automaticTotal : manualTotal;
  const distributable = round(gross - utility - otherReserve);
  const percent = round(list.reduce((sum, a) => sum + Number(a.percentage || 0), 0));
  const amounts = list.map((a, i) => i === list.length - 1 && Math.abs(percent - 100) <= 0.01
    ? round(distributable - list.slice(0, -1).reduce((sum, row) => sum + round(distributable * row.percentage / 100), 0))
    : round(distributable * a.percentage / 100));
  const change = (id: number, patch: Partial<BudgetAllocation>) => setList(previous => previous.map(a => a.id === id ? { ...a, ...patch } : a));
  const add = () => {
    const id = Math.min(0, ...list.map(a => a.id)) - 1;
    setList(previous => [...previous, {
      id, schoolId: activeFiscalYear.schoolId, fiscalYearId: activeFiscalYear.id,
      departmentName: 'ฝ่ายงานใหม่', percentage: 0, allocatedAmount: 0, spentAmount: 0,
      remainingAmount: 0, colorHex: colors[previous.length % colors.length], description: '',
    }]);
  };
  const fillResponsibilities = () => setList(previous => previous.map(a => ({
    ...a, description: a.description?.trim() || responsibilities[a.departmentName] || '',
  })));
  const reserveRow = (type: 'utility' | 'other', amount: number): BudgetAllocation => {
    const existing = allocations.find(a => a.reserveType === type) || (type === 'other' ? allocations.find(legacyReserve) : undefined);
    return {
      id: existing?.id || (type === 'utility' ? -10001 : -10002),
      schoolId: activeFiscalYear.schoolId, fiscalYearId: activeFiscalYear.id,
      departmentName: type === 'utility' ? 'กันไว้ค่าสาธารณูปโภค' : 'กันไว้สำรองจ่ายอื่น ๆ',
      reserveType: type, percentage: 0, allocatedAmount: amount,
      spentAmount: existing?.spentAmount || 0, remainingAmount: round(amount - (existing?.spentAmount || 0)),
      colorHex: type === 'utility' ? '#7c3aed' : '#64748b', description: existing?.description || '',
    };
  };
  const save = async () => {
    setError(null);
    if (gross < 0 || carryover < 0 || utility < 0 || otherReserve < 0 || distributable < 0) {
      setError('วงเงินกันไว้ต้องไม่เกินงบประมาณรวม'); return;
    }
    if (!list.length || Math.abs(percent - 100) > 0.01 || list.some(a => !a.departmentName.trim() || a.percentage < 0)) {
      setError('กรุณาระบุชื่อฝ่ายงานและจัดสรรสัดส่วนรวมให้ครบ 100%'); return;
    }
    const rows = list.map((a, i) => ({
      ...a, fiscalYearId: activeFiscalYear.id, schoolId: activeFiscalYear.schoolId,
      allocatedAmount: amounts[i], remainingAmount: round(amounts[i] - Number(a.spentAmount || 0)),
    }));
    if (rows.some(a => a.remainingAmount < 0) || utility < (allocations.find(a => a.reserveType === 'utility')?.spentAmount || 0)
      || otherReserve < (allocations.find(a => a.reserveType === 'other' || legacyReserve(a))?.spentAmount || 0)) {
      setError('วงเงินใหม่ต้องไม่น้อยกว่ายอดใช้จ่ายจริงของแต่ละฝ่ายหรือเงินกันไว้'); return;
    }
    if (await onUpdateAllocations([...rows, reserveRow('utility', utility), reserveRow('other', otherReserve)], { carryover, manualTotal })) {
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } else setError('บันทึกการจัดสรรลง MySQL ไม่สำเร็จ');
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><PieChart className="h-6 w-6 text-blue-700" />การจัดสรรงบประมาณ ปี {activeFiscalYear.year}</h2>
        <p className="text-sm text-slate-600">กันค่าสาธารณูปโภคและเงินสำรองก่อน แล้วแบ่งงบที่เหลือให้กลุ่มงานรวม 100%</p></div>
      <div className="flex gap-2">
        {onNavigateToBudgetCut && <button type="button" onClick={onNavigateToBudgetCut} className="rounded-lg border px-3 py-2 text-sm"><Scissors className="inline h-4 w-4" /> ตัดแผนรายกลุ่มงาน</button>}
        <button id="btn-save-budget-alloc" type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Save className="inline h-4 w-4" /> บันทึกการจัดสรร</button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {saved && <p className="text-sm text-emerald-700">บันทึกลง MySQL แล้ว</p>}
    <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
      <p className="text-sm">เงินอุดหนุนรายหัว<br /><strong>{money(subsidy)} บาท</strong></p>
      <p className="text-sm">เงินเพิ่มโรงเรียนขนาดเล็ก<br /><strong>{money(smallSchool)} บาท</strong></p>
      <p className="text-sm">เงินกิจกรรมพัฒนาผู้เรียน<br /><strong>{money(activity)} บาท</strong></p>
      <label className="text-sm">เงินคงเหลือจากปีก่อน (บาท)<input type="number" min="0" step="0.01" value={carryover} onChange={e => setCarryover(Number(e.target.value) || 0)} className="mt-1 w-full rounded border p-2 text-right" /></label>
      <label className="text-sm">กำหนดวงเงินรวมเอง (เว้นว่างเพื่อใช้ยอดคำนวณ)
        <input id="input-base-budget-amount" type="number" min="0" step="0.01" value={manualTotal ?? ''} onChange={e => setManualTotal(e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full rounded border p-2 text-right" placeholder={money(automaticTotal)} /></label>
      {manualTotal != null && <button type="button" onClick={() => setManualTotal(null)} className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">กลับไปใช้ยอดคำนวณอัตโนมัติ {money(automaticTotal)} บาท (รวมเงินเพิ่มโรงเรียนขนาดเล็ก)</button>}
      {manualTotal != null && manualTotal !== automaticTotal && <p className="text-sm text-amber-800">ขณะนี้ใช้วงเงินที่กำหนดเอง {money(manualTotal)} บาท ยอดจากรายรับรวมเงินเพิ่มโรงเรียนขนาดเล็ก {money(automaticTotal)} บาทจะไม่แทนค่าที่กำหนดเองจนกว่าจะกดกลับไปใช้ยอดอัตโนมัติ</p>}
      <p className="text-sm">วงเงินรวมก่อนกันสำรอง<br /><strong>{money(gross)} บาท</strong></p>
      <p className="text-sm text-blue-800">งบที่แบ่งให้ฝ่ายงาน<br /><strong>{money(Math.max(0, distributable))} บาท</strong></p>
    </section>
    <section className="grid gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 sm:grid-cols-2">
      <label className="text-sm">กันไว้ค่าสาธารณูปโภค (บาท)<input type="number" min="0" step="0.01" value={utility} onChange={e => setUtility(Number(e.target.value) || 0)} className="mt-1 w-full rounded border p-2 text-right" /></label>
      <label className="text-sm">กันไว้สำรองจ่ายอื่น ๆ (บาท)<input type="number" min="0" step="0.01" value={otherReserve} onChange={e => setOtherReserve(Number(e.target.value) || 0)} className="mt-1 w-full rounded border p-2 text-right" /></label>
      <p className="text-sm sm:col-span-2">รวมกันไว้ก่อนจัดสรร {money(utility + otherReserve)} บาท · งบสำหรับฝ่ายงาน {money(Math.max(0, distributable))} บาท</p>
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b p-4"><h3 className="font-semibold">กลุ่มงาน / ฝ่ายงาน (รวม {percent.toFixed(2)}%)</h3>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={fillResponsibilities} className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">เติมรายละเอียดกลุ่มงานที่ยังว่าง</button><button id="btn-add-dept" type="button" onClick={add} className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800"><Plus className="inline h-4 w-4" /> เพิ่มฝ่ายงาน</button></div></div>
      <div className="grid gap-2 border-b bg-blue-50 p-4 text-sm sm:grid-cols-2">{names.map(name => <p key={name}><strong>{name}:</strong> {responsibilities[name]}</p>)}</div>
      <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">ฝ่ายงาน</th><th className="p-3 text-right">สัดส่วน (%)</th><th className="p-3 text-right">ได้รับจัดสรร (บาท)</th><th className="p-3 text-right">ใช้ไปแล้ว</th><th className="p-3 text-right">คงเหลือ</th><th className="p-3 text-left">รายละเอียด</th><th className="p-3">ลบ</th></tr></thead>
        <tbody>{list.map((a, i) => <tr key={a.id} className="border-t">
          <td className="p-2"><input aria-label="ชื่อฝ่ายงาน" value={a.departmentName} onChange={e => change(a.id, { departmentName: e.target.value })} className="w-full rounded border p-2" /></td>
          <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={a.percentage} onChange={e => change(a.id, { percentage: Number(e.target.value) || 0 })} className="w-20 rounded border p-2 text-right" /></td>
          <td className="p-2 text-right font-semibold">{money(Math.max(0, amounts[i]))}</td>
          <td className="p-2 text-right">{money(Number(a.spentAmount || 0))}</td>
          <td className="p-2 text-right">{money(Math.max(0, amounts[i] - Number(a.spentAmount || 0)))}</td>
          <td className="p-2"><input value={a.description || ''} onChange={e => change(a.id, { description: e.target.value })} className="w-full rounded border p-2" /></td>
          <td className="p-2 text-center"><button type="button" onClick={() => setList(previous => previous.filter(row => row.id !== a.id))} aria-label={'ลบ ' + a.departmentName}><Trash2 className="h-4 w-4 text-rose-600" /></button></td>
        </tr>)}</tbody>
        <tfoot className="bg-slate-900 font-bold text-white"><tr><td className="p-3">รวมฝ่ายงาน</td><td className="p-3 text-right">{percent.toFixed(2)}%</td><td className="p-3 text-right">{money(Math.max(0, distributable))}</td><td colSpan={4} /></tr></tfoot>
      </table>
    </section>
  </div>;
};
