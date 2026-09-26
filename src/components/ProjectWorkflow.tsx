import React from 'react';
import { Bot, Scissors, CheckCircle2 } from 'lucide-react';

const steps = [
  { title: 'เขียนและเสนอ', detail: 'ครูส่งโครงการพร้อมวงเงินที่ขอ', icon: Bot },
  { title: 'ตัดแผนงบประมาณ', detail: 'ปรับวงเงินให้อยู่ในกรอบฝ่ายงาน', icon: Scissors },
  { title: 'อนุมัติและดำเนินงาน', detail: 'อนุมัติแล้วจึงแจกแจงค่าใช้จ่าย', icon: CheckCircle2 },
];

export function ProjectWorkflow({ active }: { active: 1 | 2 | 3 }) {
  return (
    <nav aria-label="ขั้นตอนการเสนอโครงการ" className="no-print grid grid-cols-1 gap-2 sm:grid-cols-3">
      {steps.map(({ title, detail, icon: Icon }, index) => {
        const selected = index + 1 === active;
        return (
          <div key={title} aria-current={selected ? 'step' : undefined}
            className={`min-w-0 rounded-xl border p-3.5 ${selected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className={`text-xs font-bold ${selected ? 'text-blue-900' : 'text-slate-800'}`}>{index + 1}. {title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{detail}</div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
