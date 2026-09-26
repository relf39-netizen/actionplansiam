import { ProjectWorkflow } from './ProjectWorkflow';
import React, { useState, useMemo } from 'react';
import { Project, BudgetAllocation, FiscalYear, User, School } from '../types';
import {
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Edit3,
  Unlock,
  Plus,
  Coins,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Building,
  Check,
  Search,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface BudgetCutViewProps {
  projects: Project[];
  allocations: BudgetAllocation[];
  activeFiscalYear: FiscalYear;
  currentUser: User;
  school?: School;
  onUpdateProjects: (updated: Project[]) => void;
  onUpdateAllocations: (updated: BudgetAllocation[]) => void;
  onNavigateToProjectExpenses?: (project: Project) => void;
}

export const BudgetCutView: React.FC<BudgetCutViewProps> = ({
  projects,
  allocations,
  activeFiscalYear,
  currentUser,
  school,
  onUpdateProjects,
  onUpdateAllocations,
  onNavigateToProjectExpenses,
}) => {
  // Reserves are held before allocation and are not project departments.
  const departments = useMemo(() => {
    return allocations.filter((a) => !a.isContingency && !a.reserveType);
  }, [allocations]);

  // Active department tab
  const [selectedDeptId, setSelectedDeptId] = useState<number>(() => {
    return departments[0]?.id || 1;
  });

  // Current active department object
  const activeDepartment = useMemo(() => {
    return departments.find((a) => a.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  const departmentKey = (name: string) => name.trim().toLowerCase().replace(/^(ฝ่าย|กลุ่ม)(บริหารงาน|งาน)?/, '').replace(/^บริหารงาน/, '');
  const matchesDepartment = (project: Project, dept: BudgetAllocation) => departmentKey(project.department) === departmentKey(dept.departmentName);

  // Projects in currently selected department
  const departmentProjects = useMemo(() => {
    if (!activeDepartment) return [];
    return projects.filter(
      (p) => matchesDepartment(p, activeDepartment)
    );
  }, [projects, activeDepartment]);

  // Local draft state for project budget amounts: { [projectId]: number }
  const [draftBudgets, setDraftBudgets] = useState<Record<number, number>>({});
  // Local draft notes for budget adjustments: { [projectId]: string }
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});

  // Success message notification
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Editing mode for a confirmed department (allows re-editing)
  const [isEditingUnlocked, setIsEditingUnlocked] = useState<Record<number, boolean>>({});

  // Get current draft amount or fallback to allocatedBudget
  const getProjectDraftBudget = (p: Project): number => {
    if (p.approvedBy) return p.allocatedBudget;
    if (draftBudgets[p.id] !== undefined) {
      return draftBudgets[p.id];
    }
    return p.allocatedBudget;
  };

  const getProjectDraftNote = (p: Project): string => {
    if (draftNotes[p.id] !== undefined) {
      return draftNotes[p.id];
    }
    return p.budgetAdjustmentNote || '';
  };

  // Check if department is already confirmed
  const isDeptConfirmed = (dept: BudgetAllocation): boolean => {
    // A department is confirmed if it has flag or all its projects have isBudgetCutConfirmed
    // Newly submitted projects reopen cutting even if this group was confirmed earlier.
    const deptProjs = projects.filter(
      (p) => matchesDepartment(p, dept)
    );
    if (deptProjs.length > 0 && deptProjs.every((p) => p.isBudgetCutConfirmed)) {
      return true;
    }
    return false;
  };

  const currentDeptIsConfirmed = activeDepartment ? isDeptConfirmed(activeDepartment) : false;
  const canEditCurrentDept = !currentDeptIsConfirmed || !!isEditingUnlocked[activeDepartment?.id || 0];

  // Calculate stats for current department
  const totalAllocated = activeDepartment ? activeDepartment.allocatedAmount : 0;

  // Total originally proposed budget by teachers for this department
  const totalOriginalProposed = departmentProjects.reduce((sum, p) => {
    return sum + (p.originalProposedBudget !== undefined ? p.originalProposedBudget : p.allocatedBudget);
  }, 0);

  // Total current draft trimmed budget
  const totalCurrentDraft = departmentProjects.reduce((sum, p) => {
    return sum + getProjectDraftBudget(p);
  }, 0);

  // Net difference between total draft and total allocated
  // Positive difference means OVER budget (เกิน)
  // Negative difference means REMAINING budget (คงเหลือ)
  // Zero means EXACT match (พอดี)
  const netDiff = totalCurrentDraft - totalAllocated;
  const isOverBudget = netDiff > 0;
  const isRemaining = netDiff < 0;
  const isExact = netDiff === 0;

  // Net adjustment from original proposed:
  const netAdjustmentFromProposed = totalCurrentDraft - totalOriginalProposed;

  // Handle single project budget change
  const handleBudgetChange = (projectId: number, valueStr: string) => {
    if (departmentProjects.find(p => p.id === projectId)?.approvedBy) return;
    const val = parseFloat(valueStr);
    const newAmount = isNaN(val) ? 0 : Math.max(0, val);
    setDraftBudgets((prev) => ({
      ...prev,
      [projectId]: newAmount,
    }));
  };

  // Quick adjust project by delta (+5000, -5000, etc.)
  const handleQuickAdjust = (projectId: number, delta: number) => {
    const project = departmentProjects.find((p) => p.id === projectId);
    if (!project || project.approvedBy) return;
    const current = getProjectDraftBudget(project);
    const updated = Math.max(0, current + delta);
    setDraftBudgets((prev) => ({
      ...prev,
      [projectId]: updated,
    }));
  };

  // Handle note change
  const handleNoteChange = (projectId: number, note: string) => {
    setDraftNotes((prev) => ({
      ...prev,
      [projectId]: note,
    }));
  };

  // Reset to original proposed budgets
  const handleResetToProposed = () => {
    if (!window.confirm('ต้องการคืนค่างบประมาณของโครงการในกลุ่มงานนี้กลับไปเป็นยอดเดิมที่เสนอขอใช่หรือไม่?')) {
      return;
    }
    const newDrafts: Record<number, number> = { ...draftBudgets };
    const newNotes: Record<number, string> = { ...draftNotes };

    departmentProjects.filter(p => !p.approvedBy).forEach((p) => {
      const orig = p.originalProposedBudget !== undefined ? p.originalProposedBudget : p.allocatedBudget;
      newDrafts[p.id] = orig;
      newNotes[p.id] = 'คืนค่างบประมาณตามวงเงินเดิมที่เสนอขอ';
    });

    setDraftBudgets(newDrafts);
    setDraftNotes(newNotes);
    setSaveSuccessMsg('คืนค่างบประมาณเป็นยอดเดิมที่เสนอขอเรียบร้อยแล้ว');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Auto-trim proportionally to match allocated amount exactly
  const handleAutoTrimProportional = () => {
    if (departmentProjects.length === 0) return;
    if (totalCurrentDraft === 0) {
      alert('ไม่มียอดงบประมาณโครงการให้เฉลี่ยตัดทอน');
      return;
    }

    if (
      !window.confirm(
        `ระบบจะทำการเกลี่ยปรับลด-เพิ่มงบประมาณของโครงการทั้ง ${departmentProjects.length} โครงการ ตามสัดส่วนเพื่อให้ตรงกับงบที่ได้รับจัดสรร (${totalAllocated.toLocaleString()} บาท) พอดี ยืนยันหรือไม่?`
      )
    ) {
      return;
    }

    const fixedBudget = departmentProjects.filter(p => p.approvedBy).reduce((sum, p) => sum + p.allocatedBudget, 0);
    const editableBudget = departmentProjects.filter(p => !p.approvedBy).reduce((sum, p) => sum + getProjectDraftBudget(p), 0);
    if (fixedBudget > totalAllocated || editableBudget <= 0) { alert('ไม่มีวงเงินเหลือให้เกลี่ยโครงการ'); return; }
    const ratio = (totalAllocated - fixedBudget) / editableBudget;
    const newDrafts: Record<number, number> = { ...draftBudgets };
    const newNotes: Record<number, string> = { ...draftNotes };

    let runningSum = 0;
    const editableProjects = departmentProjects.filter(p => !p.approvedBy);
    const fixedAmount = departmentProjects.filter(p => p.approvedBy).reduce((sum, p) => sum + p.allocatedBudget, 0);
    editableProjects.forEach((p, idx) => {
      if (idx === editableProjects.length - 1) {
        // Last item absorbs rounding difference to make it 100% exact
        const remainder = Math.max(0, totalAllocated - fixedAmount - runningSum);
        newDrafts[p.id] = remainder;
      } else {
        const currentAmount = getProjectDraftBudget(p);
        const trimmed = Math.round((currentAmount * ratio) / 100) * 100; // round to nearest 100
        newDrafts[p.id] = trimmed;
        runningSum += trimmed;
      }
      newNotes[p.id] = `ปรับลดตามสัดส่วนร้อยละให้ตรงกับกรอบวงเงินจัดสรรกลุ่มงาน (${activeDepartment.departmentName})`;
    });

    setDraftBudgets(newDrafts);
    setDraftNotes(newNotes);
    setSaveSuccessMsg('เกลี่ยปรับลดงบประมาณตามสัดส่วนให้ตรงกับงบจัดสรรเรียบร้อยแล้ว');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Confirm Budget Cut for current department
  const handleConfirmBudgetCut = () => {
    if (!activeDepartment) return;

    if (isOverBudget) {
      alert(`ยอดรวมโครงการเกินกรอบกลุ่มงาน ${netDiff.toLocaleString()} บาท กรุณาปรับลดก่อนยืนยัน`);
      return;
    }

    const now = new Date();
    const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${now.getFullYear() + 543} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')} น.`;

    // 1. Update projects in this department
    const updatedProjects = projects.map((p) => {
      if (matchesDepartment(p, activeDepartment) && !p.approvedBy) {
        const newBudget = getProjectDraftBudget(p);
        const originalProposed =
          p.originalProposedBudget !== undefined ? p.originalProposedBudget : p.allocatedBudget;
        const note = getProjectDraftNote(p) || 'ตัดแผนงบประมาณตามมติจัดสรรกลุ่มงาน';

        return {
          ...p,
          department: activeDepartment.departmentName,
          originalProposedBudget: originalProposed,
          allocatedBudget: newBudget,
          remainingBudget: Math.max(0, newBudget - p.spentBudget),
          budgetAdjustedBy: currentUser.fullName,
          budgetAdjustedDate: dateFormatted,
          budgetAdjustmentNote: note,
          isBudgetCutConfirmed: true,
        };
      }
      return p;
    });

    // 2. Update allocation confirmed status
    const updatedAllocations = allocations.map((a) => {
      if (a.id === activeDepartment.id) {
        return {
          ...a,
          isCutConfirmed: true,
          cutConfirmedDate: dateFormatted,
          cutConfirmedBy: currentUser.fullName,
        };
      }
      return a;
    });

    onUpdateProjects(updatedProjects);
    onUpdateAllocations(updatedAllocations);

    // Lock editing mode
    setIsEditingUnlocked((prev) => ({
      ...prev,
      [activeDepartment.id]: false,
    }));

    setSaveSuccessMsg(
      `ยืนยันการตัดแผนงบประมาณของ "${activeDepartment.departmentName}" เรียบร้อยแล้ว ยอดเงินโครงการทุกรายการได้รับการปรับปรุงเชื่อมโยงกับระบบแผนปฏิบัติการ`
    );
    setTimeout(() => setSaveSuccessMsg(''), 6000);
  };

  // Unlock to edit/adjust again
  const handleUnlockForEditing = () => {
    if (!activeDepartment) return;
    setIsEditingUnlocked((prev) => ({
      ...prev,
      [activeDepartment.id]: true,
    }));
    setSaveSuccessMsg(`ปลดล็อกเพื่อแก้ไขและปรับปรุงงบประมาณของ "${activeDepartment.departmentName}" แล้ว`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Print Summary Table
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl text-slate-900 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Scissors className="w-3.5 h-3.5" />
              ระบบตัดแผนงบประมาณตามกลุ่มงาน
            </span>
            <span className="text-xs text-slate-500">
              ปีงบประมาณ พ.ศ. {activeFiscalYear.year}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            ตัดแผนงบประมาณโครงการรายกลุ่มงาน
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            เลือกกลุ่มงาน → ปรับวงเงินแต่ละโครงการ → ตรวจยอดรวมไม่ให้เกินกรอบ → ยืนยันเพื่อนำไปพิจารณาอนุมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-print-budget-cut-summary"
            type="button"
            onClick={handlePrintSummary}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-700" />
            <span>พิมพ์แบบสรุปตัดแผน</span>
          </button>
        </div>
      </div>

      <ProjectWorkflow active={2} />

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm font-medium shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-900 text-xs px-2 py-1 font-bold"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Department Tabs Bar (แถบแต่ละกลุ่มงาน) */}
      <div className="no-print bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            const confirmed = isDeptConfirmed(dept);
            const deptProjList = projects.filter(
              (p) => matchesDepartment(p, dept)
            );
            const deptProposedSum = deptProjList.reduce((sum, p) => {
              const b = draftBudgets[p.id] !== undefined ? draftBudgets[p.id] : p.allocatedBudget;
              return sum + b;
            }, 0);
            const diff = deptProposedSum - dept.allocatedAmount;

            return (
              <button
                key={dept.id}
                id={`tab-dept-${dept.id}`}
                type="button"
                onClick={() => {
                  setSelectedDeptId(dept.id);
                  setSaveSuccessMsg('');
                }}
                className={`flex min-w-0 w-full items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: dept.colorHex || '#3b82f6' }}
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-start gap-1.5">
                    <span className="break-words">{dept.departmentName}</span>
                    {confirmed && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`}
                      />
                    )}
                  </div>
                  <div className={`text-[10px] font-normal ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    จัดสรร {dept.allocatedAmount.toLocaleString()} ฿ ({deptProjList.length} โครงการ)
                  </div>
                </div>

                {confirmed ? (
                  <span
                    className={`ml-1 shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isSelected
                        ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    ยืนยันแล้ว
                  </span>
                ) : diff > 0 ? (
                  <span
                    className={`ml-1 shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                      isSelected
                        ? 'bg-rose-400/30 text-rose-100 border border-rose-300/40'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    เกิน {diff.toLocaleString()}
                  </span>
                ) : (
                  <span
                    className={`ml-1 shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isSelected
                        ? 'bg-blue-400/30 text-blue-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    รอยืนยัน
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD CARDS FOR SELECTED DEPARTMENT (แดชบอร์ด/การ์ดแจ้งจำนวนโครงการ & ยอดเงิน) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ยอดเงินที่ได้รับการจัดสรรในกลุ่มงานนั้น */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              1. งบประมาณที่ได้รับการจัดสรร
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalAllocated.toLocaleString()}
            <span className="text-xs font-bold text-slate-500 ml-1">บาท</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>สัดส่วนในกลุ่มงาน:</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {activeDepartment?.percentage || 0}% ของงบโรงเรียน
            </span>
          </div>
        </div>

        {/* Card 2: ยอดรวมโครงการที่เสนอมาทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              2. เสนอขอเบื้องต้น ({departmentProjects.length} โครงการ)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalOriginalProposed.toLocaleString()}
            <span className="text-xs font-bold text-slate-500 ml-1">บาท</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>จำนวนโครงการ:</span>
            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {departmentProjects.length} โครงการเสนอขอ
            </span>
          </div>
        </div>

        {/* Card 3: ยอดรวมโครงการหลังปรับลด/เพิ่ม (ยอดตัดแผนปัจจุบัน) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              3. ยอดรวมโครงการหลังปรับลด/เพิ่ม
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 tracking-tight">
            {totalCurrentDraft.toLocaleString()}
            <span className="text-xs font-bold text-slate-500 ml-1">บาท</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>ผลต่างจากยอดเสนอเดิม:</span>
            {netAdjustmentFromProposed < 0 ? (
              <span className="font-bold text-rose-600 flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                ปรับลด {Math.abs(netAdjustmentFromProposed).toLocaleString()} ฿
              </span>
            ) : netAdjustmentFromProposed > 0 ? (
              <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                ปรับเพิ่ม {netAdjustmentFromProposed.toLocaleString()} ฿
              </span>
            ) : (
              <span className="font-semibold text-slate-600">เท่ากับยอดเดิม</span>
            )}
          </div>
        </div>

        {/* Card 4: การแจ้งเตือน ยอดเกิน (สีแดง) หรือ คงเหลือ (สีเขียว/ฟ้า) ตามคำสั่งผู้ใช้ */}
        <div
          className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
            isOverBudget
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/30'
              : isRemaining
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-bold ${
                isOverBudget
                  ? 'text-rose-800'
                  : isRemaining
                  ? 'text-amber-800'
                  : 'text-emerald-800'
              }`}
            >
              4. สถานะงบประมาณกลุ่มงาน
            </span>
            <div
              className={`p-2 rounded-xl ${
                isOverBudget
                  ? 'bg-rose-100 text-rose-700'
                  : isRemaining
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isOverBudget ? (
                <AlertTriangle className="w-4 h-4 animate-bounce" />
              ) : isRemaining ? (
                <Info className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* User requirement: "ถ้ายอดจำนวนเงินเกินให้แสดงข้อความเป็นสีแดงแจ้งให้ทราบว่าเกินกี่บาท หรือถ้ายังไม่เพียงพอหรือให้แสดงคำว่าคงเหลือกี่บาท" */}
          {isOverBudget && (
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-tight">
                เกิน {netDiff.toLocaleString()} บาท
              </div>
              <p className="text-xs text-rose-700 font-semibold mt-2">
                ⚠️ ยอดโครงการเกินงบจัดสรร กรุณาปรับลดงบประมาณโครงการลงอีก {netDiff.toLocaleString()} บาท
              </p>
            </div>
          )}

          {isRemaining && (
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight leading-tight">
                คงเหลือ {Math.abs(netDiff).toLocaleString()} บาท
              </div>
              <p className="text-xs text-amber-800 font-medium mt-2">
                💡 ยังมีงบประมาณคงเหลือ สามารถจัดสรรเพิ่มให้โครงการ หรือกันไว้เป็นงบสำรองได้
              </p>
            </div>
          )}

          {isExact && (
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight leading-tight flex items-center gap-1">
                จัดสรรพอดี 100%
              </div>
              <p className="text-xs text-emerald-800 font-semibold mt-2">
                ✅ ยอดโครงการรวมตรงตามงบประมาณที่กลุ่มงานได้รับการจัดสรรพอดี (0.00 บาท)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ACTION BAR: Quick Tools & Confirm / Unlock Buttons */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Department Details & Status */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
            style={{ backgroundColor: activeDepartment?.colorHex || '#2563eb' }}
          >
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                {activeDepartment?.departmentName}
              </h2>
              {currentDeptIsConfirmed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ยืนยันการตัดแผนแล้ว
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activeDepartment?.description || 'กลุ่มงานตามโครงสร้างการบริหารสถานศึกษา'}
            </p>
          </div>
        </div>

        {/* Right: Quick Tools & Confirm Button */}
        <div className="flex flex-wrap items-center gap-2">
          {canEditCurrentDept && departmentProjects.length > 0 && (
            <>
              <button
                id="btn-auto-trim-proportional"
                type="button"
                onClick={handleAutoTrimProportional}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                title="เกลี่ยลดงบประมาณตามสัดส่วนอัตโนมัติให้พอดีกับยอดจัดสรร"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>เกลี่ยปรับลดตามสัดส่วนพอดี</span>
              </button>

              <button
                id="btn-reset-to-proposed"
                type="button"
                onClick={handleResetToProposed}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                title="คืนค่างบประมาณทุกโครงการเป็นยอดเดิมที่เสนอขอ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่ายอดเสนอเดิม</span>
              </button>
            </>
          )}

          {/* User requirement: "เมื่อตัดแผงงบประมาณเรียบร้อยแล้วในกลุ่มงานนั้นให้มีปุ่มกดยืนยัน และเมื่อปรับจะยืนยันแล้วให้ไปปรับยอดในโครงการแต่ละโครงการที่เสนอมาให้ตรงกับงบประมาณที่ได้ตัดหรือเพิ่มในโครงการนั้นๆ และมีปุ่มแก้ไขหรือปรับปรุงเพื่อให้สามารถแก้ไขหรือปรับปรุงงบประมาณในโครงการนั้นได้" */}
          {canEditCurrentDept ? (
            <button
              id="btn-confirm-budget-cut"
              type="button"
              onClick={handleConfirmBudgetCut}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                isOverBudget
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>กดยืนยันการตัดแผนงบประมาณ</span>
            </button>
          ) : (
            <button
              id="btn-unlock-budget-cut"
              type="button"
              onClick={handleUnlockForEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>แก้ไขหรือปรับปรุงงบประมาณ</span>
            </button>
          )}
        </div>
      </div>

      {/* PROJECT TRIMMING TABLE (ตารางตัดทอนงบประมาณรายโครงการ) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              บัญชีรายการโครงการและยอดงบประมาณที่เสนอขอในกลุ่มงาน ({departmentProjects.length} โครงการ)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              สามารถกรอกตัวเลขปรับลดหรือเพิ่มงบประมาณในช่อง หรือใช้ปุ่มปรับรวดเร็ว
              เมื่อยืนยันยอดแล้วระบบจะบันทึกเข้าสู่แผนปฏิบัติการ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              สถานะการแก้ไข:
            </span>
            {canEditCurrentDept ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                กำลังแก้ไข/ปรับงบประมาณ
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ล็อกแล้ว (กดยืนยันแล้ว)
              </span>
            )}
          </div>
        </div>

        {departmentProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Layers className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 mb-1">
              ยังไม่มีโครงการที่เสนอในกลุ่มงาน "{activeDepartment?.departmentName}"
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              คุณครูหรือหัวหน้ากลุ่มงานยังไม่ได้บันทึกแบบเสนอโครงการในกลุ่มงานนี้
              สามารถไปที่เมนู "8. แบบเสนอโครงการ" หรือ "7. เขียนโครงการด้วย AI" เพื่อสร้างโครงการ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">ที่</th>
                  <th className="py-3 px-4 min-w-[240px]">ชื่อโครงการ / ผู้รับผิดชอบ</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">
                    ยอดเดิมที่เสนอมา
                  </th>
                  <th className="py-3 px-4 text-center min-w-[200px]">
                    ปรับลด / เพิ่มงบประมาณ
                  </th>
                  <th className="py-3 px-4 text-right min-w-[130px]">
                    ยอดสุทธิหลังตัดแผน
                  </th>
                  <th className="py-3 px-4 min-w-[220px]">
                    บันทึกเหตุผลการตัดงบ / มติ
                  </th>
                  <th className="py-3 px-3 text-center min-w-[100px]">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentProjects.map((project, idx) => {
                  const originalProposed =
                    project.originalProposedBudget !== undefined
                      ? project.originalProposedBudget
                      : project.allocatedBudget;
                  const currentDraft = getProjectDraftBudget(project);
                  const delta = currentDraft - originalProposed;
                  const note = getProjectDraftNote(project);

                  return (
                    <tr
                      key={project.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        delta !== 0 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* 1. ลำดับ */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* 2. ชื่อโครงการ & ผู้รับผิดชอบ */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-sm">
                          {project.projectName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            {project.projectCode || `PROJ-${project.id}`}
                          </span>
                          <span>ผู้รับผิดชอบ: {project.responsiblePerson || 'ครูผู้รับผิดชอบ'}</span>
                        </div>
                      </td>

                      {/* 3. ยอดเดิมที่เสนอมา */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-slate-700 text-sm">
                          {originalProposed.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">บาท</div>
                      </td>

                      {/* 4. ปรับลด / เพิ่มงบประมาณ */}
                      <td className="py-3.5 px-4">
                        {canEditCurrentDept && !project.approvedBy ? (
                          <div className="space-y-1.5 max-w-[240px] mx-auto">
                            {/* Input Field */}
                            <div className="relative">
                              <input
                                id={`input-budget-${project.id}`}
                                type="number"
                                min="0"
                                step="100"
                                value={currentDraft}
                                onChange={(e) => handleBudgetChange(project.id, e.target.value)}
                                className="w-full pl-3 pr-8 py-1.5 text-right font-mono font-bold text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">
                                ฿
                              </span>
                            </div>

                            {/* Quick adjustment buttons */}
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjust(project.id, -5000)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                                title="ลด 5,000 บาท"
                              >
                                -5,000
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjust(project.id, -1000)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                                title="ลด 1,000 บาท"
                              >
                                -1,000
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjust(project.id, 1000)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="เพิ่ม 1,000 บาท"
                              >
                                +1,000
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjust(project.id, 5000)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="เพิ่ม 5,000 บาท"
                              >
                                +5,000
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center font-mono font-bold text-slate-800">
                            {currentDraft.toLocaleString()} ฿
                          </div>
                        )}

                        {/* Delta Badge */}
                        <div className="text-center mt-1">
                          {delta < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <TrendingDown className="w-3 h-3" />
                              ปรับลด {Math.abs(delta).toLocaleString()} บาท
                            </span>
                          ) : delta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <TrendingUp className="w-3 h-3" />
                              ปรับเพิ่ม {delta.toLocaleString()} บาท
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              คงเดิมตามที่เสนอ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. ยอดสุทธิหลังตัดแผน */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-indigo-700 text-sm">
                          {currentDraft.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-semibold">
                          ยอดจัดสรรจริง
                        </div>
                      </td>

                      {/* 6. บันทึกเหตุผลการตัดงบ */}
                      <td className="py-3.5 px-4">
                        {canEditCurrentDept && !project.approvedBy ? (
                          <input
                            id={`input-note-${project.id}`}
                            type="text"
                            placeholder="ระบุเหตุผล เช่น ปรับลดค่าวัสดุตามมติที่ประชุม"
                            value={note}
                            onChange={(e) => handleNoteChange(project.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
                          />
                        ) : (
                          <div className="text-xs text-slate-600 italic">
                            {note || '-'}
                          </div>
                        )}
                      </td>

                      {/* 7. สถานะการตัดแผน */}
                      <td className="py-3.5 px-3 text-center">
                        {project.isBudgetCutConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800">
                            รอยืนยัน
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer with Summary Totals */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-3 px-4 text-right text-sm">
                    รวมทั้งสิ้น {departmentProjects.length} โครงการ:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-slate-700">
                    {totalOriginalProposed.toLocaleString()} ฿
                  </td>
                  <td className="py-3 px-4 text-center">
                    {netAdjustmentFromProposed < 0 ? (
                      <span className="font-bold text-rose-600 text-xs">
                        ปรับลดสุทธิ -{Math.abs(netAdjustmentFromProposed).toLocaleString()} ฿
                      </span>
                    ) : netAdjustmentFromProposed > 0 ? (
                      <span className="font-bold text-emerald-600 text-xs">
                        ปรับเพิ่มสุทธิ +{netAdjustmentFromProposed.toLocaleString()} ฿
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">ยอดตรงตามเสนอ</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base font-black text-indigo-700">
                    {totalCurrentDraft.toLocaleString()} ฿
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right">
                    {isOverBudget ? (
                      <span className="text-xs font-bold text-rose-600 flex items-center justify-end gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        เกินงบจัดสรร {netDiff.toLocaleString()} ฿
                      </span>
                    ) : isRemaining ? (
                      <span className="text-xs font-bold text-amber-600 flex items-center justify-end gap-1">
                        <Info className="w-3.5 h-3.5" />
                        งบเหลือ {Math.abs(netDiff).toLocaleString()} ฿
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        พอดีงบประมาณเป๊ะ
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* PRINT-ONLY OFFICIAL FORMAT SHEET (แบบฟอร์มทางการราชการสำหรับพิมพ์) */}
      <div className="hidden print:block p-8 font-sarabun text-black bg-white" id="official-budget-cut-sheet">
        <div className="text-center space-y-1 mb-6">
          <div className="text-lg font-bold">แบบสรุปผลการตัดทอนและปรับลดงบประมาณโครงการตามกลุ่มงาน</div>
          <div className="text-base font-bold">
            แผนปฏิบัติการประจำปีงบประมาณ พ.ศ. {activeFiscalYear.year}
          </div>
          <div className="text-sm">
            {school?.name || 'โรงเรียนคุณภาพ สพฐ.'} {school?.educationArea || ''}
          </div>
          <div className="text-sm font-semibold underline mt-2">
            กลุ่มงาน: {activeDepartment?.departmentName}
          </div>
        </div>

        <div className="flex justify-between text-xs mb-3">
          <div>
            <strong>งบประมาณที่กลุ่มงานได้รับการจัดสรร:</strong>{' '}
            {totalAllocated.toLocaleString()} บาท (คิดเป็นร้อยละ {activeDepartment?.percentage}%)
          </div>
          <div>
            <strong>ยอดรวมเดิมที่เสนอขอ:</strong> {totalOriginalProposed.toLocaleString()} บาท
          </div>
          <div>
            <strong>ยอดหลังตัดแผนจริง:</strong> {totalCurrentDraft.toLocaleString()} บาท
          </div>
        </div>

        <table className="w-full text-xs border border-black border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold text-center">
              <th className="border border-black p-2 w-10">ที่</th>
              <th className="border border-black p-2 text-left">ชื่อโครงการ / กิจกรรม</th>
              <th className="border border-black p-2 text-left">ผู้รับผิดชอบ</th>
              <th className="border border-black p-2 text-right w-24">ยอดเดิมที่ขอ (บาท)</th>
              <th className="border border-black p-2 text-right w-24">ปรับลด/เพิ่ม (บาท)</th>
              <th className="border border-black p-2 text-right w-28">ยอดตัดแผนจริง (บาท)</th>
              <th className="border border-black p-2 text-left">เหตุผลความจำเป็นในการปรับลด</th>
            </tr>
          </thead>
          <tbody>
            {departmentProjects.map((p, i) => {
              const orig =
                p.originalProposedBudget !== undefined ? p.originalProposedBudget : p.allocatedBudget;
              const draft = getProjectDraftBudget(p);
              const diff = draft - orig;
              const note = getProjectDraftNote(p);

              return (
                <tr key={p.id} className="border-b border-black">
                  <td className="border border-black p-2 text-center">{i + 1}</td>
                  <td className="border border-black p-2 font-bold">{p.projectName}</td>
                  <td className="border border-black p-2">{p.responsiblePerson}</td>
                  <td className="border border-black p-2 text-right">{orig.toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">
                    {diff < 0
                      ? `-${Math.abs(diff).toLocaleString()}`
                      : diff > 0
                      ? `+${diff.toLocaleString()}`
                      : '0'}
                  </td>
                  <td className="border border-black p-2 text-right font-bold">
                    {draft.toLocaleString()}
                  </td>
                  <td className="border border-black p-2 text-xs">{note || '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2 border-black bg-slate-50">
              <td colSpan={3} className="border border-black p-2 text-right">
                รวมทั้งสิ้น ({departmentProjects.length} โครงการ):
              </td>
              <td className="border border-black p-2 text-right">
                {totalOriginalProposed.toLocaleString()}
              </td>
              <td className="border border-black p-2 text-right">
                {netAdjustmentFromProposed < 0
                  ? `-${Math.abs(netAdjustmentFromProposed).toLocaleString()}`
                  : netAdjustmentFromProposed > 0
                  ? `+${netAdjustmentFromProposed.toLocaleString()}`
                  : '0'}
              </td>
              <td className="border border-black p-2 text-right font-bold">
                {totalCurrentDraft.toLocaleString()}
              </td>
              <td className="border border-black p-2">
                {isExact
                  ? 'จัดสรรพอดีตามกรอบวงเงินกลุ่มงาน'
                  : isOverBudget
                  ? `เกินงบจัดสรร ${netDiff.toLocaleString()} บาท`
                  : `งบคงเหลือ ${Math.abs(netDiff).toLocaleString()} บาท`}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-6">
          <div className="space-y-8">
            <div>ลงชื่อ..............................................................</div>
            <div>
              ({currentUser.fullName})<br />
              หัวหน้ากลุ่มงาน / ผู้รับผิดชอบตัดแผนงบประมาณ
            </div>
            <div>วันที่ ...... เดือน ..................... พ.ศ. ..........</div>
          </div>
          <div className="space-y-8">
            <div>ลงชื่อ..............................................................</div>
            <div>
              ({school?.directorName || 'ผู้อำนวยการโรงเรียน'})<br />
              ผู้อำนวยการ{school?.name || 'โรงเรียน'}
            </div>
            <div>วันที่ ...... เดือน ..................... พ.ศ. ..........</div>
          </div>
        </div>
      </div>
    </div>
  );
};
