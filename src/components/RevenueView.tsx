import React, { useEffect, useState } from 'react';
import { Calculator, Save, Check, Download, Users, Wallet, Sparkles, School } from 'lucide-react';
import { FiscalYear, RevenueItem, StudentLevel } from '../types';
import { exportToExcel } from '../utils/exportUtils';

interface Props {
  revenues: RevenueItem[];
  activeFiscalYear: FiscalYear;
  totalStudents: number;
  students: StudentLevel[];
  onUpdateRevenues: (updated: RevenueItem[]) => Promise<boolean>;
}
const STAGES: StudentLevel['stage'][] = ['อนุบาล', 'ประถม', 'มัธยมต้น', 'มัธยมปลาย'];
type Kind = 'subsidy' | 'activity' | 'small_school';
type Rates = Record<StudentLevel['stage'], Record<Kind, number>>;
const isStage = (r: RevenueItem) => r.note?.startsWith('stage:') && (r.category === 'subsidy' || r.category === 'activity' || r.category === 'small_school');
const isOldAggregate = (r: RevenueItem) => !isStage(r) &&
  ((r.category === 'subsidy' && r.itemName.includes('เงินอุดหนุนรายหัว')) ||
   (r.category === 'activity' && r.itemName.includes('กิจกรรมพัฒนาผู้เรียน')));
const loadRates = (items: RevenueItem[]): Rates => Object.fromEntries(STAGES.map(stage => [stage, {
  subsidy: Number(items.find(r => r.category === 'subsidy' && r.note === 'stage:' + stage)?.ratePerHead) || 0,
  activity: Number(items.find(r => r.category === 'activity' && r.note === 'stage:' + stage)?.ratePerHead) || 0,
  small_school: Number(items.find(r => r.category === 'small_school' && r.note === 'stage:' + stage)?.ratePerHead ?? 500),
}])) as Rates;
const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const RevenueView: React.FC<Props> = ({ revenues, activeFiscalYear, students, onUpdateRevenues }) => {
  const [rates, setRates] = useState<Rates>(() => loadRates(revenues));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setRates(loadRates(revenues)), [revenues, activeFiscalYear.id]);
  const open = STAGES.filter(stage => students.some(s => s.stage === stage));
  const schoolCount = students.reduce((sum, s) => sum + (Number(s.maleCount) || 0) + (Number(s.femaleCount) || 0), 0);
  const smallSchoolEligible = schoolCount > 0 && schoolCount < 120;
  const count = (stage: StudentLevel['stage']) => students.filter(s => s.stage === stage)
    .reduce((sum, s) => sum + (Number(s.maleCount) || 0) + (Number(s.femaleCount) || 0), 0);
  const sum = (stage: StudentLevel['stage'], kind: Kind) =>
    count(stage) * rates[stage][kind] * (kind === 'small_school' && !smallSchoolEligible ? 0 : 1);
  const total = (kind: Kind) => open.reduce((n, stage) => n + sum(stage, kind), 0);
  const other = revenues.filter(r => !isStage(r) && !isOldAggregate(r));
  const otherTotal = other.reduce((n, r) => n + Number(r.calculatedAmount || 0), 0);
  const grandTotal = total('subsidy') + total('small_school') + total('activity') + otherTotal;
  const changeRate = (stage: StudentLevel['stage'], kind: Kind, value: string) =>
    setRates(prev => ({ ...prev, [stage]: { ...prev[stage], [kind]: Math.max(0, Number(value) || 0) } }));
  const buildItems = (): RevenueItem[] => {
    let nextId = Math.max(0, ...revenues.map(r => Number(r.id) || 0));
    const schoolId = students[0]?.schoolId || revenues[0]?.schoolId || activeFiscalYear.schoolId;
    const rows = open.flatMap(stage => (['subsidy', 'small_school', 'activity'] as const).map(kind => {
      const found = revenues.find(r => r.category === kind && r.note === 'stage:' + stage);
      return {
        id: found?.id || ++nextId, schoolId, fiscalYearId: activeFiscalYear.id, category: kind,
        itemName: (kind === 'subsidy' ? 'เงินอุดหนุนรายหัว' : kind === 'small_school' ? 'เงินเพิ่มโรงเรียนขนาดเล็ก' : 'กิจกรรมพัฒนาผู้เรียน') + ' – ' + stage,
        ratePerHead: rates[stage][kind], eligibleCount: kind === 'small_school' && !smallSchoolEligible ? 0 : count(stage),
        calculatedAmount: sum(stage, kind), isCustomRate: true, note: 'stage:' + stage,
      };
    }));
    return [...other, ...rows];
  };
  const save = async () => {
    setError(null);
    if (await onUpdateRevenues(buildItems())) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError('บันทึกรายรับลง MySQL ไม่สำเร็จ');
  };
  const exportData = () => exportToExcel('ประมาณการรายรับ', 'ประมาณการรายรับ_ปี' + activeFiscalYear.year,
    open.map(stage => ({
      ช่วงชั้น: stage, 'จำนวนนักเรียน (คน)': count(stage),
      'อัตราเงินอุดหนุนรายหัว': rates[stage].subsidy, 'รวมเงินอุดหนุน': sum(stage, 'subsidy'),
      'เงินเพิ่มโรงเรียนขนาดเล็กต่อคน': rates[stage].small_school, 'รวมเงินเพิ่มโรงเรียนขนาดเล็ก': sum(stage, 'small_school'),
      'อัตรากิจกรรมพัฒนาผู้เรียน': rates[stage].activity, 'รวมเงินกิจกรรมพัฒนาผู้เรียน': sum(stage, 'activity'),
    })));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Calculator className="h-6 w-6 text-blue-700" />ประมาณการรายรับ</h2>
        <p className="text-sm text-slate-600">ปีงบประมาณ {activeFiscalYear.year} · ใช้จำนวนนักเรียนที่บันทึกในเมนูข้อมูลนักเรียน</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={exportData} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><Download className="inline h-4 w-4" /> ส่งออก Excel</button>
        <button id="btn-save-revenue" type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Save className="inline h-4 w-4" /> บันทึกอัตราและรายรับ</button>
      </div>
    </div>
    {saved && <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />บันทึกแล้ว</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
      <p className="text-sm text-slate-200">ประมาณการรายรับรวม · ปีงบประมาณ {activeFiscalYear.year}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{money(grandTotal)} <span className="text-base font-medium text-slate-200">บาท</span></p>
      <p className="mt-3 text-sm text-slate-300">คำนวณจากนักเรียน {schoolCount.toLocaleString('th-TH')} คน ในช่วงชั้นที่โรงเรียนเปิดสอน</p>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปประมาณการรายรับ">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-blue-800"><Wallet className="h-5 w-5" />เงินอุดหนุนรายหัว</div><p className="mt-3 text-xl font-bold text-blue-950">{money(total('subsidy'))} <span className="text-sm font-normal">บาท</span></p></div>
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><School className="h-5 w-5" />เงินเพิ่มโรงเรียนขนาดเล็ก</div><p className="mt-3 text-xl font-bold text-amber-950">{money(total('small_school'))} <span className="text-sm font-normal">บาท</span></p><p className="mt-1 text-xs text-amber-800">{smallSchoolEligible ? 'เข้าเกณฑ์นักเรียนต่ำกว่า 120 คน' : 'ไม่เข้าเกณฑ์นักเรียนต่ำกว่า 120 คน'}</p></div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Sparkles className="h-5 w-5" />กิจกรรมพัฒนาผู้เรียน</div><p className="mt-3 text-xl font-bold text-emerald-950">{money(total('activity'))} <span className="text-sm font-normal">บาท</span></p></div>
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-violet-800"><Users className="h-5 w-5" />นักเรียนทั้งหมด</div><p className="mt-3 text-xl font-bold text-violet-950">{schoolCount.toLocaleString('th-TH')} <span className="text-sm font-normal">คน</span></p><p className="mt-1 text-xs text-violet-800">{open.length} ช่วงชั้นที่เปิดสอน</p></div>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4"><div><h3 className="font-semibold text-slate-900">กำหนดอัตราต่อคนตามช่วงชั้น</h3><p className="text-sm text-slate-500">แก้ไขอัตราแล้วตรวจยอดรวมก่อนกดบันทึก</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">อ้างอิงจำนวนนักเรียนที่บันทึกไว้</span></div>
      <div className="grid gap-3 p-3 lg:grid-cols-2">{STAGES.map(stage => {
        const enabled = open.includes(stage);
        const kinds: { kind: Kind; label: string }[] = [
          { kind: 'subsidy', label: 'เงินอุดหนุนรายหัว' },
          { kind: 'small_school', label: 'เงินเพิ่มโรงเรียนขนาดเล็ก' },
          { kind: 'activity', label: 'กิจกรรมพัฒนาผู้เรียน' },
        ];
        return <div key={stage} className={`min-w-0 rounded-xl border ${enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-t-xl bg-slate-50 px-3 py-2 text-sm"><strong>{stage}</strong><span>{enabled ? `${count(stage).toLocaleString('th-TH')} คน` : 'ไม่เปิดสอน'}</span></div>
          <div className="space-y-2 p-3">{kinds.map(({ kind, label }) => <div key={kind} className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-2 gap-y-1 border-b border-slate-100 pb-2 text-xs last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(6rem,0.8fr)]">
            <span className="min-w-0 break-words font-medium">{label}</span>
            <label className="text-right"><span className="sr-only">อัตราต่อคน {label} {stage}</span><input aria-label={`${label} ${stage}`} type="number" min="0" step="any" disabled={!enabled} value={enabled ? rates[stage][kind] : ''} onChange={e => changeRate(stage, kind, e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-right text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /><span className="text-[10px] text-slate-500">บาท/คน</span></label>
            <strong className="col-span-2 min-w-0 break-all text-right text-slate-800 sm:col-span-1">{enabled ? money(sum(stage, kind)) : '—'} <span className="font-normal text-slate-500">บาท</span></strong>
          </div>)}</div>
        </div>;
      })}</div>
      <div className="grid gap-2 bg-slate-900 p-4 text-xs font-semibold text-white sm:grid-cols-3"><span>อุดหนุนรวม {money(total('subsidy'))} บาท</span><span>เงินเพิ่มรวม {money(total('small_school'))} บาท</span><span>กิจกรรมรวม {money(total('activity'))} บาท</span></div>
    </section>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">หลักเกณฑ์เงินเพิ่มโรงเรียนขนาดเล็ก</p><p className="mt-1">อัตราเริ่มต้น 500 บาทต่อคน ปรับได้แยกตามช่วงชั้น ระบบคิดเงินเพิ่มเมื่อทั้งโรงเรียนมีนักเรียนมากกว่า 0 คนและต่ำกว่า 120 คน (ปัจจุบัน {schoolCount} คน)</p></div>
    {other.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">รายรับประเภทอื่นที่บันทึกไว้ {other.length} รายการ รวม <strong>{money(otherTotal)} บาท</strong> (รวมในยอดประมาณการรายรับด้านบน)</div>}
  </div>;
};
