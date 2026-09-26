import React, { useEffect, useState } from 'react';
import { Sparkles, Save, Plus, Trash2 } from 'lucide-react';
import { LearnerActivity, FiscalYear, RevenueItem } from '../types';

interface Props {
  activities: LearnerActivity[];
  activitiesInitialized: boolean;
  activeFiscalYear: FiscalYear;
  revenues: RevenueItem[];
  onUpdateActivities: (rows: LearnerActivity[]) => Promise<boolean>;
}
const templates = [
  ['กิจกรรมวิชาการ', 'ค่ายวิชาการ เสริมทักษะ และแก้ปัญหาการเรียน'],
  ['กิจกรรมคุณธรรม จริยธรรม และลูกเสือ/เนตรนารี', 'จิตอาสา พัฒนาคุณลักษณะ และเข้าค่ายพักแรม'],
  ['กิจกรรมทัศนศึกษา', 'เรียนรู้นอกสถานที่และแหล่งเรียนรู้จริง'],
  ['กิจกรรมบริการ ICT', 'ส่งเสริมการเรียนรู้เทคโนโลยีสารสนเทศสำหรับนักเรียน'],
  ['กิจกรรมกรณีสถานการณ์ฉุกเฉิน/โรคอุบัติใหม่', 'การเรียนทางไกลหรือแก้ปัญหาในภาวะวิกฤต'],
] as const;
const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round = (n: number) => Math.round(n * 100) / 100;
const defaults = (fy: FiscalYear): LearnerActivity[] => templates.map(([activityName, description], i) => ({
  id: -(i + 1), schoolId: fy.schoolId, fiscalYearId: fy.id, activityName, description,
  percentage: 20, allocatedAmount: 0, spentAmount: 0, remainingAmount: 0, note: '',
}));
function startRows(rows: LearnerActivity[], initialized: boolean, fy: FiscalYear): LearnerActivity[] {
  if (initialized) return rows;
  if (!rows.length) return defaults(fy);
  // One-time upgrade of the earlier four-item template. A saved deletion remains deleted.
  if (rows.length === 4 && !rows.some(a => a.activityName.includes('สถานการณ์ฉุกเฉิน'))) {
    const fifth = defaults(fy)[4];
    return [...rows, { ...fifth, id: -1005, percentage: 0 }];
  }
  return rows;
}
export const LearnerActivitiesView: React.FC<Props> = ({ activities, activitiesInitialized, activeFiscalYear, revenues, onUpdateActivities }) => {
  const [list, setList] = useState<LearnerActivity[]>(() => startRows(activities, activitiesInitialized, activeFiscalYear));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'amount' | 'percent'>('amount');
  const [enteredAmounts, setEnteredAmounts] = useState<Record<number, number>>({});
  useEffect(() => {
    const rows = startRows(activities, activitiesInitialized, activeFiscalYear);
    setList(rows);
    setEnteredAmounts(Object.fromEntries(rows.map(a => [a.id, Number(a.allocatedAmount || 0)])));
    setMode(activitiesInitialized ? 'amount' : 'percent');
  }, [activities, activitiesInitialized, activeFiscalYear.id]);
  const pool = revenues.filter(r => r.category === 'activity').reduce((sum, r) => sum + Number(r.calculatedAmount || 0), 0);
  const percent = round(list.reduce((sum, a) => sum + Number(a.percentage || 0), 0));
  const amounts = mode === 'amount' ? list.map(a => round(enteredAmounts[a.id] ?? 0)) : list.map((a, i) => i === list.length - 1 && Math.abs(percent - 100) <= 0.01
    ? round(pool - list.slice(0, -1).reduce((sum, row) => sum + round(pool * row.percentage / 100), 0))
    : round(pool * a.percentage / 100));
  const allocatedTotal = round(amounts.reduce((sum, amount) => sum + amount, 0));
  const displayedPercent = mode === 'amount' && pool > 0 ? round(allocatedTotal / pool * 100) : percent;
  const selectMode = (next: 'amount' | 'percent') => {
    if (next === mode) return;
    if (next === 'amount') setEnteredAmounts(Object.fromEntries(list.map((a, i) => [a.id, amounts[i]])));
    if (next === 'percent' && pool > 0) {
      let used = 0;
      setList(previous => previous.map((a, i) => {
        const value = i === previous.length - 1 ? round(100 - used) : round(amounts[i] / pool * 100);
        used += value;
        return { ...a, percentage: value };
      }));
    }
    setMode(next);
  };
  const change = (id: number, patch: Partial<LearnerActivity>) =>
    setList(previous => previous.map(a => a.id === id ? { ...a, ...patch } : a));
  const add = () => setList(previous => [...previous, {
    id: Math.min(0, ...previous.map(a => a.id)) - 1,
    schoolId: activeFiscalYear.schoolId, fiscalYearId: activeFiscalYear.id,
    activityName: 'กิจกรรมเพิ่มเติม', description: '', percentage: 0, allocatedAmount: 0,
    spentAmount: 0, remainingAmount: 0, note: '',
  }]);
  const save = async () => {
    setError(null);
    if (!list.length || list.some(a => !a.activityName.trim()) || (mode === 'percent' && (Math.abs(percent - 100) > 0.01 || list.some(a => a.percentage < 0 || a.percentage > 100)))) {
      setError('กรุณาระบุชื่อกิจกรรมและปรับสัดส่วนให้รวมครบ 100%'); return;
    }
    if (amounts.some(a => !Number.isFinite(a) || a < 0) || Math.abs(allocatedTotal - pool) > 0.009) {
      setError(`ยอดจัดสรรต้องเท่ากับยอดรายรับ ${money(pool)} บาท (ผลต่าง ${money(round(pool - allocatedTotal))} บาท)`); return;
    }
    let percentageUsed = 0;
    const rows = list.map((a, i) => ({
      ...a, schoolId: activeFiscalYear.schoolId, fiscalYearId: activeFiscalYear.id,
      percentage: mode === 'percent' ? a.percentage : i === list.length - 1 ? round(100 - percentageUsed) : (() => { const p = pool ? round(amounts[i] / pool * 100) : round(100 / list.length); percentageUsed += p; return p; })(),
      allocatedAmount: amounts[i], remainingAmount: round(amounts[i] - Number(a.spentAmount || 0)),
    }));
    if (rows.some(a => a.remainingAmount < 0)) { setError('วงเงินที่จัดสรรต้องไม่น้อยกว่ายอดใช้จริง'); return; }
    if (await onUpdateActivities(rows)) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError('บันทึกกิจกรรมลง MySQL ไม่สำเร็จ');
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-6 w-6 text-amber-500" />กิจกรรมพัฒนาผู้เรียน ปี {activeFiscalYear.year}</h2>
        <p className="text-sm text-slate-600">แบ่งยอดเงินกิจกรรมพัฒนาผู้เรียนที่บันทึกไว้ให้กิจกรรมหลัก 5 รายการ หรือเพิ่มและลบตามแผนของโรงเรียน</p></div>
      <button id="btn-save-learner-activities" type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Save className="inline h-4 w-4" /> บันทึกกิจกรรม</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {saved && <p className="text-sm text-emerald-700">บันทึกกิจกรรมลง MySQL แล้ว</p>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p>ยอดเงินกิจกรรมพัฒนาผู้เรียนจากเมนูประมาณการรายรับ (ทุกช่วงชั้น): <strong>{money(pool)} บาท</strong></p>
      <p>สัดส่วนที่จัดสรร: <strong>{displayedPercent.toFixed(2)}%</strong> · จำนวนเงินที่แบ่ง: <strong>{money(allocatedTotal)} บาท</strong> · ยังไม่ได้จัดสรร: <strong>{money(round(pool - allocatedTotal))} บาท</strong></p>
      {pool === 0 && <p className="text-amber-800">ยังไม่มีรายรับกิจกรรมพัฒนาผู้เรียนที่บันทึกไว้สำหรับปีนี้</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2 text-sm"><span>วิธีจัดสรร:</span><button type="button" onClick={() => selectMode('amount')} aria-pressed={mode === 'amount'} className={`rounded border px-3 py-2 ${mode === 'amount' ? 'bg-blue-700 text-white' : 'bg-white'}`}>ระบุจำนวนเงิน (บาท)</button><button type="button" onClick={() => selectMode('percent')} aria-pressed={mode === 'percent'} className={`rounded border px-3 py-2 ${mode === 'percent' ? 'bg-blue-700 text-white' : 'bg-white'}`}>กำหนดเปอร์เซ็นต์</button><span className="text-slate-600">เลือกวิธีที่สะดวกและจัดสรรให้ครบยอดรายรับก่อนบันทึก</span></div>
    <section className="overflow-x-auto rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b p-4"><h3 className="font-semibold">รายการกิจกรรม ({list.length})</h3>
        <button id="btn-add-learner-act" type="button" onClick={add} className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800"><Plus className="inline h-4 w-4" /> เพิ่มกิจกรรม</button></div>
      <table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-100"><tr>
        <th className="p-3 text-left">กิจกรรม</th><th className="p-3 text-right">สัดส่วน (%)</th>
        <th className="p-3 text-right">จัดสรร (บาท)</th><th className="p-3 text-right">ใช้ไปแล้ว</th>
        <th className="p-3 text-right">คงเหลือ</th><th className="p-3 text-left">รายละเอียด</th><th className="p-3">ลบ</th>
      </tr></thead><tbody>{list.map((a, i) => <tr key={a.id} className="border-t">
        <td className="p-2"><input aria-label="ชื่อกิจกรรม" value={a.activityName} onChange={e => change(a.id, { activityName: e.target.value })} className="w-full rounded border p-2" /></td>
        <td className="p-2 text-right"><input type="number" min="0" max="100" step="0.01" value={mode === 'amount' ? (pool ? round(amounts[i] / pool * 100) : 0) : a.percentage} disabled={mode === 'amount'} onChange={e => change(a.id, { percentage: Number(e.target.value) || 0 })} aria-label={`สัดส่วน ${a.activityName}`} className="w-24 rounded border p-2 text-right disabled:bg-slate-100" /></td>
        <td className="p-2 text-right font-semibold"><input type="number" min="0" step="0.01" value={amounts[i]} disabled={mode === 'percent'} onChange={e => setEnteredAmounts(previous => ({ ...previous, [a.id]: e.target.value === '' ? 0 : Number(e.target.value) }))} aria-label={`จำนวนเงิน ${a.activityName}`} className="w-36 rounded border p-2 text-right disabled:bg-slate-100" /></td>
        <td className="p-2 text-right">{money(Number(a.spentAmount || 0))}</td>
        <td className="p-2 text-right">{money(Math.max(0, amounts[i] - Number(a.spentAmount || 0)))}</td>
        <td className="p-2"><input value={a.description || ''} onChange={e => change(a.id, { description: e.target.value })} className="w-full rounded border p-2" /></td>
        <td className="p-2 text-center"><button type="button" onClick={() => setList(previous => previous.filter(row => row.id !== a.id))} aria-label={'ลบ ' + a.activityName}><Trash2 className="h-4 w-4 text-rose-600" /></button></td>
      </tr>)}</tbody><tfoot className="bg-slate-900 font-bold text-white"><tr>
        <td className="p-3">รวมกิจกรรม</td><td className="p-3 text-right">{displayedPercent.toFixed(2)}%</td>
        <td className="p-3 text-right">{money(allocatedTotal)}</td><td colSpan={4} />
      </tr></tfoot></table>
    </section>
  </div>;
};
