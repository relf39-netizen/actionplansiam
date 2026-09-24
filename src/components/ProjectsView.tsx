import React, { useState, useEffect } from 'react';
import { Project, User, BudgetAllocation, FiscalYear, School } from '../types';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Edit,
  Trash2,
  Check,
  ShieldCheck,
  X,
  Calendar,
  UserCheck,
  Bot,
  Sparkles,
  Lock,
  Unlock,
  Coins,
  Printer,
  FileText,
  CheckCircle,
  Archive,
  RotateCcw,
  Download,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { exportProjectExpenseRecordToWordDoc } from '../utils/exportUtils';

interface ProjectsViewProps {
  projects: Project[];
  currentUser: User;
  departments: BudgetAllocation[];
  activeFiscalYear: FiscalYear;
  school?: School;
  initialSubTab?: 'all' | 'pending' | 'approved' | 'completed';
  onSelectSubTab?: (tab: string) => void;
  onUpdateProjects: (updated: Project[]) => void;
  onOpenExpensesForProject: (project: Project) => void;
  onNavigateToAiWriter?: () => void;
}

function formatCitizenId(id?: string) {
  if (!id) return '';
  const clean = id.replace(/\D/g, '');
  if (clean.length !== 13) return id;
  return `${clean[0]}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean[12]}`;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  currentUser,
  departments,
  activeFiscalYear,
  school,
  initialSubTab = 'all',
  onSelectSubTab,
  onUpdateProjects,
  onOpenExpensesForProject,
  onNavigateToAiWriter,
}) => {
  // Navigation Sub-Tab: all | pending | approved | completed
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending' | 'approved' | 'completed'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSwitchSubTab = (tab: 'all' | 'pending' | 'approved' | 'completed') => {
    setActiveSubTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Budget Adjustment State (for Budget Officer / Director)
  const [adjustingProject, setAdjustingProject] = useState<Project | null>(null);
  const [adjustedBudgetAmount, setAdjustedBudgetAmount] = useState<number>(0);
  const [adjustBudgetNote, setAdjustBudgetNote] = useState<string>('');

  // Close Project Confirmation State (for Admin / Director)
  const [closingProject, setClosingProject] = useState<Project | null>(null);
  const [closureNote, setClosureNote] = useState<string>('');

  // Expense Record Modal State (Official Memorandum / Expense Statement)
  const [expenseRecordProject, setExpenseRecordProject] = useState<Project | null>(null);

  // Quick Approval Modal with Budget Confirmation
  const [approvingProject, setApprovingProject] = useState<Project | null>(null);
  const [approvingBudget, setApprovingBudget] = useState<number>(0);

  // Form State for new/edit
  const [formData, setFormData] = useState<Partial<Project>>({
    projectCode: '',
    projectName: '',
    rationales: '',
    objectives: '',
    quantitativeTarget: '',
    qualitativeTarget: '',
    kpi: '',
    procedures: '',
    duration: `ตลอดปีการศึกษา ${activeFiscalYear.year}`,
    location: school?.name || 'โรงเรียนคุณภาพ สพฐ.',
    targetGroup: 'นักเรียนและครูทุกคน',
    responsiblePerson: currentUser.fullName,
    proposerName: currentUser.fullName,
    proposerCitizenId: currentUser.citizenId || '',
    attachmentName: '',
    department: departments[0]?.departmentName || 'ฝ่ายวิชาการ',
    budgetSource: 'เงินอุดหนุนรายหัว (สพฐ.)',
    allocatedBudget: 50000,
    status: 'not_started',
    approvedBy: undefined,
    approvedDate: undefined,
  });

  // Calculate counts for sub-tabs
  const allCount = projects.length;
  const pendingCount = projects.filter((p) => !p.approvedBy).length;
  const approvedCount = projects.filter((p) => p.approvedBy && p.status !== 'completed').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  // Filter projects based on active sub-tab, search, and dropdown filters
  const filteredProjects = projects.filter((p) => {
    // 1. Sub-tab condition
    if (activeSubTab === 'pending' && p.approvedBy) return false;
    if (activeSubTab === 'approved' && (!p.approvedBy || p.status === 'completed')) return false;
    if (activeSubTab === 'completed' && p.status !== 'completed') return false;

    // 2. Search query
    const matchSearch =
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.proposerName && p.proposerName.toLowerCase().includes(searchTerm.toLowerCase()));

    // 3. Department filter
    const matchDept = deptFilter === 'all' || p.department === deptFilter;

    // 4. Status filter (when on 'all' tab)
    const matchStatus =
      statusFilter === 'all' ||
      (activeSubTab === 'all' && p.status === statusFilter) ||
      (activeSubTab !== 'all');

    return matchSearch && matchDept && matchStatus;
  });

  // Check if current user has permissions
  const canManageBudget = currentUser.role === 'admin' || currentUser.role === 'director';
  const isDirector = currentUser.role === 'director';

  const handleOpenAddModal = () => {
    if (activeFiscalYear.isProposalOpen === false && currentUser.role !== 'admin') {
      alert(`ขณะนี้ระบบปิดรับการเสนอโครงการประจำปีงบประมาณ พ.ศ. ${activeFiscalYear.year}\n${activeFiscalYear.proposalNotice || 'กรุณาติดต่อฝ่ายแผนงานหรือผู้บริหารสถานศึกษา'}`);
      return;
    }
    setEditingProject(null);
    const codeNum = projects.length + 1;
    setFormData({
      projectCode: `P68-${codeNum < 10 ? '0' + codeNum : codeNum}`,
      projectName: '',
      rationales: 'เพื่อส่งเสริมและพัฒนาการจัดการศึกษาตามมาตรฐานการศึกษาขั้นพื้นฐาน',
      objectives: '1. เพื่อพัฒนาศักยภาพผู้เรียน\n2. เพื่อยกระดับผลสัมฤทธิ์ทางการเรียน',
      quantitativeTarget: 'นักเรียนร้อยละ 85 ได้รับการพัฒนา',
      qualitativeTarget: 'นักเรียนมีทักษะและคุณลักษณะอันพึงประสงค์ตามเกณฑ์',
      kpi: 'ร้อยละของนักเรียนที่ผ่านเกณฑ์ประเมินไม่น้อยกว่า 85%',
      procedures: '1. วางแผนดำเนินงาน (P)\n2. ดำเนินการตามกิจกรรม (D)\n3. นิเทศติดตามประเมินผล (C)\n4. ปรับปรุงพัฒนาและสรุปรายงาน (A)',
      duration: `พฤษภาคม ${activeFiscalYear.year} - มีนาคม ${activeFiscalYear.year + 1}`,
      location: school?.name || 'โรงเรียนคุณภาพ สพฐ.',
      targetGroup: 'นักเรียนและครูทุกคน',
      responsiblePerson: currentUser.fullName,
      proposerName: currentUser.fullName,
      proposerCitizenId: currentUser.citizenId || '',
      attachmentName: '',
      department: departments[0]?.departmentName || 'ฝ่ายวิชาการ',
      budgetSource: 'เงินอุดหนุนรายหัว (สพฐ.)',
      allocatedBudget: 30000,
      status: 'not_started',
      approvedBy: undefined,
      approvedDate: undefined,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProject(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleDeleteProject = (id: number) => {
    if (confirm('ยืนยันการลบโครงการนี้ออกจากแผนปฏิบัติการประจำปี?')) {
      const updated = projects.filter((p) => p.id !== id);
      onUpdateProjects(updated);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName || !formData.projectCode) {
      alert('กรุณากรอกรหัสและชื่อโครงการ');
      return;
    }

    if (formData.proposerCitizenId && formData.proposerCitizenId.replace(/\D/g, '').length !== 13) {
      alert('เลขประจำตัวประชาชนของครูผู้เสนอโครงการต้องมีครบ 13 หลัก');
      return;
    }

    const cleanCitizenId = formData.proposerCitizenId ? formData.proposerCitizenId.replace(/\D/g, '') : undefined;
    const cleanResponsiblePerson = formData.proposerName || formData.responsiblePerson || currentUser.fullName;

    if (editingProject) {
      // Update
      const updated = projects.map((p) => {
        if (p.id === editingProject.id) {
          const alloc = Number(formData.allocatedBudget) || 0;
          return {
            ...p,
            ...(formData as Project),
            responsiblePerson: cleanResponsiblePerson,
            proposerCitizenId: cleanCitizenId,
            proposerName: cleanResponsiblePerson,
            allocatedBudget: alloc,
            remainingBudget: Math.max(0, alloc - p.spentBudget),
          };
        }
        return p;
      });
      onUpdateProjects(updated);
    } else {
      // Create new
      const newId = projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
      const alloc = Number(formData.allocatedBudget) || 0;
      const newProj: Project = {
        ...(formData as Project),
        id: newId,
        schoolId: 1,
        fiscalYearId: activeFiscalYear.id,
        responsiblePerson: cleanResponsiblePerson,
        proposerCitizenId: cleanCitizenId,
        proposerName: cleanResponsiblePerson,
        allocatedBudget: alloc,
        spentBudget: 0,
        remainingBudget: alloc,
        status: formData.status || 'not_started',
        approvalStatus: currentUser.role === 'admin' || currentUser.role === 'director' ? 'approved' : 'pending',
      };
      onUpdateProjects([...projects, newProj]);
    }
    setIsModalOpen(false);
  };

  // Open Budget Adjustment Modal
  const handleOpenBudgetAdjust = (project: Project) => {
    setAdjustingProject(project);
    setAdjustedBudgetAmount(project.allocatedBudget);
    setAdjustBudgetNote(project.budgetAdjustmentNote || '');
  };

  // Save Budget Adjustment
  const handleSaveBudgetAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProject) return;

    const newAmount = Number(adjustedBudgetAmount) || 0;
    const updated = projects.map((p) => {
      if (p.id === adjustingProject.id) {
        return {
          ...p,
          originalProposedBudget: p.originalProposedBudget ?? p.allocatedBudget,
          allocatedBudget: newAmount,
          remainingBudget: Math.max(0, newAmount - p.spentBudget),
          budgetAdjustedBy: currentUser.fullName,
          budgetAdjustedDate: new Date().toISOString().split('T')[0],
          budgetAdjustmentNote: adjustBudgetNote.trim() || 'ปรับเปลี่ยนงบประมาณตามมติฝ่ายบริหารสถานศึกษา',
        };
      }
      return p;
    });

    onUpdateProjects(updated);
    setAdjustingProject(null);
  };

  // Open Close Project Modal
  const handleOpenCloseProject = (project: Project) => {
    setClosingProject(project);
    setClosureNote(
      project.remainingBudget > 0
        ? `ดำเนินกิจกรรมเสร็จสิ้นตามวัตถุประสงค์ ส่งคืนงบประมาณคงเหลือจำนวน ${project.remainingBudget.toLocaleString()} บาท เข้ากองทุนพัฒนาสถานศึกษา`
        : 'ดำเนินกิจกรรมเสร็จสิ้นตามวัตถุประสงค์ และรายงานผลการดำเนินโครงการเรียบร้อยแล้ว'
    );
  };

  // Confirm Close Project
  const handleConfirmCloseProject = () => {
    if (!closingProject) return;

    const updated = projects.map((p) => {
      if (p.id === closingProject.id) {
        return {
          ...p,
          status: 'completed' as const,
          closedBy: currentUser.fullName,
          closedDate: new Date().toISOString().split('T')[0],
          budgetAdjustmentNote: closureNote ? `${p.budgetAdjustmentNote ? p.budgetAdjustmentNote + ' | ' : ''}บันทึกปิดโครงการ: ${closureNote}` : p.budgetAdjustmentNote,
        };
      }
      return p;
    });

    onUpdateProjects(updated);
    setClosingProject(null);
  };

  // Re-open a completed project (Admin/Director only)
  const handleReopenProject = (project: Project) => {
    if (confirm(`ต้องการเปิดโครงการ "${project.projectName}" ใหม่อีกครั้งหรือไม่?`)) {
      const updated = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            status: 'in_progress' as const,
            closedBy: undefined,
            closedDate: undefined,
          };
        }
        return p;
      });
      onUpdateProjects(updated);
    }
  };

  // Open Approval confirmation
  const handleStartApproval = (project: Project) => {
    setApprovingProject(project);
    setApprovingBudget(project.allocatedBudget);
  };

  // Confirm Approval (with budget confirmation/adjustment)
  const handleConfirmApproval = () => {
    if (!approvingProject) return;
    const finalBudget = Number(approvingBudget) || approvingProject.allocatedBudget;

    const updated = projects.map((p) => {
      if (p.id === approvingProject.id) {
        return {
          ...p,
          approvedBy: currentUser.fullName,
          approvedDate: new Date().toISOString().split('T')[0],
          status: p.status === 'not_started' ? ('in_progress' as const) : p.status,
          originalProposedBudget: p.originalProposedBudget ?? p.allocatedBudget,
          allocatedBudget: finalBudget,
          remainingBudget: Math.max(0, finalBudget - p.spentBudget),
          budgetAdjustedBy: finalBudget !== p.allocatedBudget ? currentUser.fullName : p.budgetAdjustedBy,
          budgetAdjustedDate: finalBudget !== p.allocatedBudget ? new Date().toISOString().split('T')[0] : p.budgetAdjustedDate,
        };
      }
      return p;
    });

    onUpdateProjects(updated);
    setApprovingProject(null);
  };

  // Quick Status change
  const handleQuickStatusChange = (project: Project, newStatus: Project['status']) => {
    const updated = projects.map((p) => {
      if (p.id === project.id) {
        if (newStatus === 'completed') {
          return {
            ...p,
            status: newStatus,
            closedBy: currentUser.fullName,
            closedDate: new Date().toISOString().split('T')[0],
          };
        }
        return { ...p, status: newStatus };
      }
      return p;
    });
    onUpdateProjects(updated);
  };

  // Print expense record handler
  const handlePrintExpenseSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="h-6 w-6 text-blue-700" />
            <span>ระบบบริหารโครงการตามแผนปฏิบัติการ (Project Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการแบบเสนอโครงการ พิจารณาอนุมัติ ปรับเปลี่ยนงบประมาณ บันทึกค่าใช้จ่าย และปิดโครงการเมื่อเสร็จสิ้น
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToAiWriter && (
            <button
              id="btn-nav-ai-writer-shortcut"
              type="button"
              onClick={onNavigateToAiWriter}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all"
              title="เปิดระบบเขียนโครงการด้วย AI ตามแบบฟอร์ม สพฐ."
            >
              <Bot className="h-4 w-4 text-amber-300" />
              <span>ใช้ AI ช่วยเขียนโครงการ</span>
            </button>
          )}

          <button
            id="btn-add-new-project"
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มโครงการใหม่</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 no-print">
        <button
          id="tab-all-projects"
          type="button"
          onClick={() => handleSwitchSubTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'all'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>แฟ้มโครงการทั้งหมด</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'all' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {allCount}
          </span>
        </button>

        <button
          id="tab-pending-projects"
          type="button"
          onClick={() => handleSwitchSubTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'pending'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>รอพิจารณาอนุมัติ</span>
          {pendingCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeSubTab === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          id="tab-approved-projects"
          type="button"
          onClick={() => handleSwitchSubTab('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span>โครงการที่อนุมัติแล้ว</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'approved'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {approvedCount}
          </span>
        </button>

        <button
          id="tab-completed-projects"
          type="button"
          onClick={() => handleSwitchSubTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'completed'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Archive className="h-4 w-4" />
          <span>ดำเนินการเสร็จสิ้น / ปิดโครงการแล้ว</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {completedCount}
          </span>
        </button>
      </div>

      {/* Sub-Tab Information Banners */}
      {activeSubTab === 'approved' && (
        <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-900">
                แถบโครงการที่อนุมัติแล้ว (Approved Projects)
              </div>
              <p className="text-xs text-emerald-800">
                โครงการที่ผ่านความเห็นชอบและผู้อำนวยการอนุมัติให้ดำเนินกิจกรรม: เจ้าของโครงการสามารถ{' '}
                <strong className="underline decoration-emerald-500">พิมพ์บันทึกรายการค่าใช้จ่าย</strong>{' '}
                เพื่อใช้เบิกจ่าย และเจ้าหน้าที่แผนงาน/Admin สามารถ{' '}
                <strong className="underline decoration-emerald-500">กดปุ่มปิดโครงการ</strong>{' '}
                เมื่อดำเนินงานเสร็จสิ้น
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block text-xs font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1 rounded-lg">
              รวม {approvedCount} โครงการ
            </span>
          </div>
        </div>
      )}

      {activeSubTab === 'pending' && (
        <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 shadow-xs no-print">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-900">
                รายการแบบเสนอโครงการที่รอการพิจารณาอนุมัติ
              </div>
              <p className="text-xs text-amber-800">
                เจ้าหน้าที่แผนงบประมาณและผู้อำนวยการสามารถปรับเปลี่ยนวงเงินงบประมาณที่เสนอขอ และกดอนุมัติโครงการเพื่อนำเข้าสู่แผนปฏิบัติการ
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white text-amber-900 border border-amber-300 px-3 py-1 rounded-lg shrink-0">
            รออนุมัติ {pendingCount} โครงการ
          </span>
        </div>
      )}

      {activeSubTab === 'completed' && (
        <div className="rounded-xl p-4 bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-between gap-3 shadow-xs no-print">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">
                แฟ้มโครงการที่ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว (Closed Projects)
              </div>
              <p className="text-xs text-slate-600">
                โครงการที่เจ้าหน้าที่แผนปฏิบัติการหรือ Admin ได้บันทึกปิดโครงการ สรุปรายงานและส่งคืนงบประมาณคงเหลือเรียบร้อยแล้ว
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white text-slate-700 border border-slate-300 px-3 py-1 rounded-lg shrink-0">
            ปิดโครงการแล้ว {completedCount} โครงการ
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-project"
            type="text"
            placeholder="ค้นหารหัส, ชื่อโครงการ, ผู้รับผิดชอบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>ฝ่าย:</span>
            <select
              id="select-filter-dept"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 focus:outline-none"
            >
              <option value="all">ทุกฝ่ายงาน</option>
              {departments.map((d) => (
                <option key={d.id} value={d.departmentName}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          {activeSubTab === 'all' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>สถานะ:</span>
              <select
                id="select-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 focus:outline-none"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="not_started">ยังไม่ดำเนินการ</option>
                <option value="in_progress">อยู่ระหว่างดำเนินการ</option>
                <option value="completed">ดำเนินการเสร็จสิ้น (ปิดแล้ว)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-24">รหัส</th>
                <th className="py-3 px-3 min-w-[240px]">ชื่อโครงการ</th>
                <th className="py-3 px-3 w-28">ฝ่ายงาน</th>
                <th className="py-3 px-3 w-36">ผู้รับผิดชอบ</th>
                <th className="py-3 px-3 w-32 text-right">งบจัดสรร (บาท)</th>
                <th className="py-3 px-3 w-28 text-right">ใช้ไป (บาท)</th>
                <th className="py-3 px-3 w-28 text-right font-semibold text-emerald-700">คงเหลือ (บาท)</th>
                <th className="py-3 px-3 w-32 text-center">สถานะ</th>
                <th className="py-3 px-3 w-32 text-center">การอนุมัติ</th>
                <th className="py-3 px-3 w-44 text-center">การดำเนินงาน / จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FolderGit2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <span>ไม่พบโครงการตามเงื่อนไขที่เลือกในแถบนี้</span>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const isProjectOwner =
                    p.responsiblePerson === currentUser.fullName ||
                    p.proposerName === currentUser.fullName ||
                    (p.proposerCitizenId && currentUser.citizenId && p.proposerCitizenId.replace(/\D/g, '') === currentUser.citizenId.replace(/\D/g, ''));
                  const canPrintExpenseRecord = isProjectOwner || canManageBudget;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700 align-top">
                        {p.projectCode}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 align-top">
                        <div className="font-semibold text-slate-900">{p.projectName}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.objectives}</div>
                        {p.budgetAdjustedBy && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block mt-1 font-mono">
                            ปรับงบโดย: {p.budgetAdjustedBy} ({p.budgetAdjustedDate || ''})
                          </div>
                        )}
                        {p.closedBy && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block mt-1 font-mono">
                            ✓ ปิดโครงการโดย: {p.closedBy} ({p.closedDate || ''})
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 align-top">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                          {p.department}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 align-top">
                        <div className="font-semibold text-slate-900">{p.responsiblePerson}</div>
                        {p.proposerCitizenId && (
                          <div
                            className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-blue-100"
                            title="เลขประจำตัวประชาชนผู้เสนอโครงการ"
                          >
                            {formatCitizenId(p.proposerCitizenId)}
                          </div>
                        )}
                        {p.attachmentName && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5" title={p.attachmentName}>
                            📎 {p.attachmentName}
                          </div>
                        )}
                      </td>

                      {/* Allocated Budget Column + Quick Budget Adjustment Button */}
                      <td className="py-3 px-3 text-right align-top">
                        <div className="font-mono font-bold text-slate-800">
                          {p.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {p.originalProposedBudget !== undefined && p.originalProposedBudget !== p.allocatedBudget && (
                          <div className="text-[10px] text-slate-400 line-through">
                            ขอ: {p.originalProposedBudget.toLocaleString()}
                          </div>
                        )}
                        {p.isBudgetCutConfirmed && (
                          <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                            ✓ ตัดแผนแล้ว
                          </div>
                        )}
                        {canManageBudget && (
                          <div>
                            <button
                              id={`btn-adjust-budget-${p.id}`}
                              type="button"
                              onClick={() => handleOpenBudgetAdjust(p)}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 hover:underline mt-0.5 font-medium"
                              title="ปรับเปลี่ยนงบประมาณโครงการ (สำหรับ จนท.แผนงาน และ ผอ.)"
                            >
                              <Coins className="h-3 w-3 text-amber-600" />
                              <span>ปรับงบ</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-600 align-top">
                        {p.spentBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 align-top">
                        {p.remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-center align-top">
                        {p.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span>ปิดโครงการแล้ว</span>
                          </span>
                        ) : (
                          <select
                            value={p.status}
                            onChange={(e) => handleQuickStatusChange(p, e.target.value as any)}
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold border-0 outline-none cursor-pointer ${
                              p.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <option value="not_started">ยังไม่ดำเนินการ</option>
                            <option value="in_progress">อยู่ระหว่างดำเนิน</option>
                            <option value="completed">เสร็จสิ้น (ปิดโครงการ)</option>
                          </select>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3 px-3 text-center align-top">
                        {p.approvedBy ? (
                          <div className="text-[11px] text-emerald-700 flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="h-3 w-3" /> อนุมัติแล้ว
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">{p.approvedDate}</span>
                          </div>
                        ) : canManageBudget ? (
                          <button
                            id={`btn-approve-project-${p.id}`}
                            type="button"
                            onClick={() => handleStartApproval(p)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>อนุมัติโครงการ</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">รอ ผอ. อนุมัติ</span>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="py-3 px-3 text-center align-top">
                        <div className="flex flex-col gap-1.5 items-center">
                          {/* Print Expense Statement Button (Especially for Approved Projects) */}
                          {p.approvedBy && (
                            <button
                              id={`btn-print-expense-record-${p.id}`}
                              type="button"
                              onClick={() => setExpenseRecordProject(p)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
                              title="พิมพ์บันทึกรายการค่าใช้จ่ายของโครงการนี้"
                            >
                              <Printer className="h-3.5 w-3.5 text-emerald-600" />
                              <span>พิมพ์บันทึกค่าใช้จ่าย</span>
                            </button>
                          )}

                          {/* Close Project Button for Admin (When project is in progress / approved) */}
                          {canManageBudget && p.approvedBy && p.status !== 'completed' && (
                            <button
                              id={`btn-close-project-${p.id}`}
                              type="button"
                              onClick={() => handleOpenCloseProject(p)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors shadow-xs"
                              title="เจ้าหน้าที่แผนปฏิบัติการ Admin กดปิดโครงการเมื่อดำเนินการเสร็จสิ้น"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span>ปิดโครงการ (เสร็จสิ้น)</span>
                            </button>
                          )}

                          {/* Re-open button if project is already completed */}
                          {canManageBudget && p.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleReopenProject(p)}
                              className="w-full inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-600 hover:bg-slate-100 border border-slate-300"
                              title="เปิดโครงการใหม่อีกครั้ง"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>เปิดโครงการใหม่</span>
                            </button>
                          )}

                          {/* Secondary Icon Buttons */}
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => onOpenExpensesForProject(p)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="แตกรายละเอียดค่าใช้จ่ายโครงการ (เมนู 9)"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="แก้ไขข้อมูลโครงการ"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="ลบโครงการ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs sm:text-sm">
                <td colSpan={4} className="py-3 px-3 text-right">
                  งบประมาณโครงการรวม ({filteredProjects.length} โครงการ):
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300">
                  {filteredProjects.reduce((s, p) => s + p.allocatedBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-300">
                  {filteredProjects.reduce((s, p) => s + p.spentBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  {filteredProjects.reduce((s, p) => s + p.remainingBudget, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={3} className="py-3 px-3 text-xs text-slate-400 font-normal">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: BUDGET ADJUSTMENT (FOR BUDGET OFFICER / DIRECTOR)     */}
      {/* ------------------------------------------------------------- */}
      {adjustingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-50/70">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-700" />
                <span>ปรับเปลี่ยนงบประมาณโครงการ (Budget Adjustment)</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingProject(null)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetAdjust} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs text-slate-500">รหัสโครงการ: <span className="font-mono font-bold text-blue-700">{adjustingProject.projectCode}</span></div>
                <div className="font-bold text-slate-900">{adjustingProject.projectName}</div>
                <div className="text-xs text-slate-600">
                  ฝ่ายงาน: <span className="font-medium text-slate-800">{adjustingProject.department}</span> | ผู้รับผิดชอบ: <span className="font-medium text-slate-800">{adjustingProject.responsiblePerson}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-100 rounded-lg text-center">
                  <span className="text-xs text-slate-500 block">งบประมาณเสนอขอเดิม</span>
                  <span className="text-sm font-bold font-mono text-slate-800">
                    {(adjustingProject.originalProposedBudget || adjustingProject.allocatedBudget).toLocaleString()} บาท
                  </span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <span className="text-xs text-blue-700 block">งบประมาณปัจจุบัน</span>
                  <span className="text-sm font-bold font-mono text-blue-900">
                    {adjustingProject.allocatedBudget.toLocaleString()} บาท
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  กำหนดวงเงินงบประมาณใหม่ (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={adjustedBudgetAmount}
                  onChange={(e) => setAdjustedBudgetAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-base font-bold font-mono text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>ตัวเลข: {adjustedBudgetAmount.toLocaleString()} บาท</span>
                  <span className={adjustedBudgetAmount >= adjustingProject.allocatedBudget ? 'text-blue-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {adjustedBudgetAmount > adjustingProject.allocatedBudget
                      ? `+ เพิ่มขึ้น ${(adjustedBudgetAmount - adjustingProject.allocatedBudget).toLocaleString()} บาท`
                      : adjustedBudgetAmount < adjustingProject.allocatedBudget
                      ? `- ลดลง ${(adjustingProject.allocatedBudget - adjustedBudgetAmount).toLocaleString()} บาท`
                      : 'เท่าเดิม'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  บันทึกเหตุผลการปรับเปลี่ยนงบประมาณ
                </label>
                <textarea
                  rows={2}
                  value={adjustBudgetNote}
                  onChange={(e) => setAdjustBudgetNote(e.target.value)}
                  placeholder="เช่น ปรับลดตามกรอบวงเงินงบประมาณจัดสรรของโรงเรียน หรือปรับเพิ่มเพื่อรองรับผู้เข้าร่วมกิจกรรม"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  ผู้บันทึกการปรับงบ: <strong>{currentUser.fullName}</strong> ({currentUser.position || 'เจ้าหน้าที่แผนงาน/ผอ.'})
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustingProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <Coins className="h-4 w-4" />
                  <span>บันทึกการปรับงบประมาณ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CLOSE PROJECT CONFIRMATION (ADMIN / DIRECTOR)        */}
      {/* ------------------------------------------------------------- */}
      {closingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span>บันทึกปิดโครงการ (เสร็จสิ้นการดำเนินงาน)</span>
              </h3>
              <button
                type="button"
                onClick={() => setClosingProject(null)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs text-slate-500 font-mono">รหัส: {closingProject.projectCode}</div>
                <div className="font-bold text-slate-900 text-base">{closingProject.projectName}</div>
                <div className="text-xs text-slate-600">
                  ผู้รับผิดชอบโครงการ: <strong>{closingProject.responsiblePerson}</strong> | ฝ่าย: {closingProject.department}
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-3 rounded-xl text-center">
                <div>
                  <span className="text-[11px] text-slate-500 block">งบที่ได้รับอนุมัติ</span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {closingProject.allocatedBudget.toLocaleString()} บาท
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">งบที่ใช้จ่ายจริง</span>
                  <span className="text-xs font-bold font-mono text-amber-700">
                    {closingProject.spentBudget.toLocaleString()} บาท
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">งบประมาณคงเหลือ</span>
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    {closingProject.remainingBudget.toLocaleString()} บาท
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  บันทึกสรุปผลการดำเนินงาน / หมายเหตุการปิดโครงการ
                </label>
                <textarea
                  rows={3}
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>เจ้าหน้าที่แผนปฏิบัติการ / ผู้บันทึกปิดโครงการ:</span>
                </div>
                <div className="mt-1">
                  <strong>{currentUser.fullName}</strong> (ตำแหน่ง: {currentUser.position || 'เจ้าหน้าที่แผนงาน/แอดมิน'})
                  <br />
                  <span className="text-slate-600">
                    เมื่อกดปิดโครงการ สถานะของโครงการจะเปลี่ยนเป็น &quot;ดำเนินการแล้ว (เสร็จสิ้น)&quot; และย้ายเข้าสู่แฟ้มโครงการเสร็จสิ้น
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setClosingProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseProject}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-200" />
                  <span>ยืนยันปิดโครงการ (ดำเนินการเสร็จสิ้น)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: DIRECTOR APPROVAL WITH BUDGET REVIEW MODAL           */}
      {/* ------------------------------------------------------------- */}
      {approvingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-blue-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-300" />
                <span>พิจารณาอนุมัติโครงการ</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovingProject(null)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs text-blue-700 font-mono font-bold">{approvingProject.projectCode}</div>
                <div className="font-bold text-slate-900 text-base">{approvingProject.projectName}</div>
                <div className="text-xs text-slate-600 mt-1">
                  ฝ่ายงาน: {approvingProject.department} | ผู้รับผิดชอบ: {approvingProject.responsiblePerson}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  วงเงินงบประมาณที่อนุมัติให้ใช้ (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={approvingBudget}
                  onChange={(e) => setApprovingBudget(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-base font-bold font-mono text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  งบที่เสนอขอเบื้องต้น: {approvingProject.allocatedBudget.toLocaleString()} บาท (สามารถปรับยอดก่อนอนุมัติได้)
                </span>
              </div>

              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl text-xs space-y-1">
                <div className="font-bold">ผู้อนุมัติโครงการ:</div>
                <div>{currentUser.fullName} ({currentUser.position || 'ผู้อำนวยการโรงเรียน'})</div>
                <div className="text-[11px] text-blue-700">วันที่อนุมัติ: {new Date().toISOString().split('T')[0]}</div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>ยืนยันอนุมัติโครงการ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: OFFICIAL EXPENSE RECORD SHEET (PRINTABLE PREVIEW)     */}
      {/* ------------------------------------------------------------- */}
      {expenseRecordProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Action Bar (Top) - Hidden when printing */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-100 no-print">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-700" />
                <span className="font-bold text-sm text-slate-900">
                  บันทึกรายการค่าใช้จ่ายตามโครงการที่ได้รับอนุมัติ
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  โครงการที่อนุมัติแล้ว
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (school) {
                      exportProjectExpenseRecordToWordDoc(expenseRecordProject, school, activeFiscalYear);
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  title="ดาวน์โหลดเป็นไฟล์ Microsoft Word (.doc)"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>ดาวน์โหลด Word</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintExpenseSheet}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>พิมพ์เอกสาร / บันทึก PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseRecordProject(null)}
                  className="text-slate-400 hover:text-slate-700 rounded-lg p-1.5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Official Document Sheet (A4 Styled) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50">
              <div
                id="official-project-expense-sheet"
                className="bg-white rounded-xl border border-slate-300 shadow-sm p-8 md:p-12 text-slate-900 max-w-3xl mx-auto printable-proposal font-sans leading-relaxed"
              >
                {/* Official Memorandum Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="text-lg md:text-xl font-bold text-slate-950">
                    บันทึกรายการค่าใช้จ่ายตามโครงการที่ได้รับอนุมัติ
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    ตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. {activeFiscalYear.year}
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">
                    {school?.name || 'โรงเรียนคุณภาพ สพฐ.'}
                  </div>
                  <div className="text-xs text-slate-600">
                    สำนักงานเขตพื้นที่การศึกษา{school?.educationArea || school?.affiliation || 'การศึกษาขั้นพื้นฐาน'}
                  </div>
                </div>

                {/* Project Header Info */}
                <div className="space-y-2 text-xs md:text-sm mb-6 border-b border-slate-200 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold text-slate-950">ชื่อโครงการ: </span>
                      <span className="font-semibold text-blue-950">{expenseRecordProject.projectName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-950">รหัสโครงการ: </span>
                      <span className="font-mono font-bold text-slate-800">{expenseRecordProject.projectCode}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold text-slate-950">กลุ่มงาน / ฝ่าย: </span>
                      <span>{expenseRecordProject.department}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-950">ผู้รับผิดชอบโครงการ: </span>
                      <span>{expenseRecordProject.responsiblePerson}</span>
                      {expenseRecordProject.proposerCitizenId && (
                        <span className="text-xs text-slate-500 ml-1">
                          (เลขบัตร: {formatCitizenId(expenseRecordProject.proposerCitizenId)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold text-slate-950">ผู้อนุมัติโครงการ: </span>
                      <span>{expenseRecordProject.approvedBy || school?.directorName || 'ผู้อำนวยการโรงเรียน'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-950">วันที่อนุมัติ: </span>
                      <span>{expenseRecordProject.approvedDate || 'อนุมัติตามแผนปฏิบัติการ'}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-300 rounded-xl p-4 mb-6 text-center">
                  <div className="border-r border-slate-200">
                    <div className="text-xs text-slate-600 font-semibold">วงเงินงบประมาณที่ได้รับอนุมัติ</div>
                    <div className="text-base md:text-lg font-bold font-mono text-blue-950 mt-1">
                      {expenseRecordProject.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                  <div className="border-r border-slate-200">
                    <div className="text-xs text-slate-600 font-semibold">งบประมาณที่ใช้ไป / เบิกจ่ายแล้ว</div>
                    <div className="text-base md:text-lg font-bold font-mono text-amber-700 mt-1">
                      {expenseRecordProject.spentBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600 font-semibold">งบประมาณคงเหลือสุทธิ</div>
                    <div className="text-base md:text-lg font-bold font-mono text-emerald-700 mt-1">
                      {expenseRecordProject.remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>

                {/* Itemized Expenses Table */}
                <div className="space-y-3 mb-8">
                  <div className="font-bold text-slate-950 text-sm flex items-center justify-between">
                    <span>รายละเอียดรายการค่าใช้จ่ายจำแนกตามหมวด (4 หมวด สพฐ.):</span>
                    <span className="text-xs font-normal text-slate-500 no-print">
                      (ค่าตอบแทน, ค่าใช้สอย, ค่าวัสดุ, ค่าครุภัณฑ์)
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                          <th className="border border-slate-300 py-2 px-2 text-center w-10">ที่</th>
                          <th className="border border-slate-300 py-2 px-3">รายการค่าใช้จ่าย</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-24">หมวด</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-16">จำนวน</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-16">หน่วย</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-24">ราคา/หน่วย</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-28">รวมเงิน (บาท)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRecordProject.expenseItems && expenseRecordProject.expenseItems.length > 0 ? (
                          expenseRecordProject.expenseItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600 font-mono">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-3 font-medium text-slate-900">
                                {item.itemName}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-700">
                                {item.category || 'ค่าใช้สอย'}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono text-slate-800">
                                {item.quantity.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600">
                                {item.unit}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono text-slate-800">
                                {item.unitPrice.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                                {item.totalAmount.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr>
                              <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">1</td>
                              <td className="border border-slate-300 py-1.5 px-3 font-medium">ค่าวัสดุและอุปกรณ์ดำเนินกิจกรรมตามโครงการ</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center">ค่าวัสดุ</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono">1</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center">ชุด</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono">
                                {Math.round(expenseRecordProject.allocatedBudget * 0.6).toLocaleString()}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold">
                                {Math.round(expenseRecordProject.allocatedBudget * 0.6).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">2</td>
                              <td className="border border-slate-300 py-1.5 px-3 font-medium">ค่าใช้สอยในการจัดกิจกรรมและการดำเนินงาน</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center">ค่าใช้สอย</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono">1</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-center">งาน</td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono">
                                {Math.round(expenseRecordProject.allocatedBudget * 0.4).toLocaleString()}
                              </td>
                              <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold">
                                {Math.round(expenseRecordProject.allocatedBudget * 0.4).toLocaleString()}
                              </td>
                            </tr>
                          </>
                        )}
                        <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-300">
                          <td colSpan={6} className="border border-slate-300 py-2.5 px-3 text-right">
                            รวมงบประมาณที่ได้รับอนุมัติทั้งสิ้น:
                          </td>
                          <td className="border border-slate-300 py-2.5 px-2 text-right font-mono text-blue-900 text-sm font-bold">
                            {expenseRecordProject.allocatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3-Part Official Signatory Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs">
                  {/* Part 1: Project Owner */}
                  <div className="space-y-1">
                    <p className="text-slate-600">ขอรับรองว่ารายการดังกล่าวถูกต้อง</p>
                    <p className="pt-8">ลงชื่อ..........................................................</p>
                    <p className="font-bold text-slate-950">({expenseRecordProject.responsiblePerson})</p>
                    <p className="text-slate-700">ผู้รับผิดชอบโครงการ</p>
                    <p className="text-slate-500 text-[11px]">วันที่ ...../...../.........</p>
                  </div>

                  {/* Part 2: Plan and Budget Officer */}
                  <div className="space-y-1">
                    <p className="text-slate-600">ตรวจสอบความถูกต้องตามแผนงาน</p>
                    <p className="pt-8">ลงชื่อ..........................................................</p>
                    <p className="font-bold text-slate-950">(นายวางแผน รอบคอบ)</p>
                    <p className="text-slate-700">เจ้าหน้าที่แผนงานและงบประมาณ</p>
                    <p className="text-slate-500 text-[11px]">วันที่ ...../...../.........</p>
                  </div>

                  {/* Part 3: School Director */}
                  <div className="space-y-1">
                    <p className="text-slate-600">อนุมัติการใช้จ่ายงบประมาณ</p>
                    <p className="pt-8">ลงชื่อ..........................................................</p>
                    <p className="font-bold text-slate-950">({school?.directorName || 'ผู้อำนวยการสถานศึกษา'})</p>
                    <p className="text-slate-700">ผู้อำนวยการ{school?.name || 'โรงเรียน'}</p>
                    <p className="text-slate-500 text-[11px]">วันที่ ...../...../.........</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 no-print">
              <button
                type="button"
                onClick={() => {
                  setExpenseRecordProject(null);
                  onOpenExpensesForProject(expenseRecordProject);
                }}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>ไปที่หน้าแก้ไข/แจกแจงรายการค่าใช้จ่ายโครงการ (เมนู 9)</span>
              </button>

              <button
                type="button"
                onClick={() => setExpenseRecordProject(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: ADD / EDIT PROJECT DETAILS                          */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-blue-700" />
                <span>{editingProject ? 'แก้ไขข้อมูลโครงการ' : 'เพิ่มโครงการใหม่ตามแผนปฏิบัติการ'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสโครงการ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectCode}
                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อโครงการ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หลักการและเหตุผล</label>
                <textarea
                  rows={2}
                  value={formData.rationales}
                  onChange={(e) => setFormData({ ...formData, rationales: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วัตถุประสงค์</label>
                <textarea
                  rows={2}
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เป้าหมายเชิงปริมาณ</label>
                  <input
                    type="text"
                    value={formData.quantitativeTarget}
                    onChange={(e) => setFormData({ ...formData, quantitativeTarget: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เป้าหมายเชิงคุณภาพ</label>
                  <input
                    type="text"
                    value={formData.qualitativeTarget}
                    onChange={(e) => setFormData({ ...formData, qualitativeTarget: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ตัวชี้วัดความสำเร็จ (KPI)</label>
                <input
                  type="text"
                  value={formData.kpi}
                  onChange={(e) => setFormData({ ...formData, kpi: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วิธีการดำเนินงาน / กิจกรรมสำคัญ</label>
                <textarea
                  rows={2}
                  value={formData.procedures}
                  onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระยะเวลาดำเนินการ</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่ดำเนินการ</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มเป้าหมาย</label>
                  <input
                    type="text"
                    value={formData.targetGroup}
                    onChange={(e) => setFormData({ ...formData, targetGroup: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Teacher Proposer & Citizen ID Card */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-700" />
                    ข้อมูลครูผู้เสนอโครงการ (Teacher Proposer)
                  </span>
                  <span className="text-[11px] text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                    ยืนยันตัวตนด้วยเลขบัตรประชาชน 13 หลัก
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อ-สกุล ครูผู้เสนอโครงการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.proposerName || formData.responsiblePerson || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proposerName: e.target.value,
                          responsiblePerson: e.target.value,
                        })
                      }
                      placeholder="เช่น ครูสอนดี เก่งมาก"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      value={formData.proposerCitizenId || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, proposerCitizenId: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="เช่น 1234567890123"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="text-[10px] mt-1 flex items-center justify-between">
                      <span className="font-mono text-slate-600">
                        {formData.proposerCitizenId ? formatCitizenId(formData.proposerCitizenId) : 'ระบุเลข 13 หลัก'}
                      </span>
                      <span
                        className={
                          formData.proposerCitizenId?.replace(/\D/g, '').length === 13
                            ? 'text-emerald-600 font-semibold'
                            : 'text-amber-600'
                        }
                      >
                        {formData.proposerCitizenId?.replace(/\D/g, '').length === 13
                          ? '✓ ครบ 13 หลัก'
                          : `(${formData.proposerCitizenId?.replace(/\D/g, '').length || 0}/13)`}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เอกสารแนบโครงการ / ลิงก์รายละเอียดโครงการ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={formData.attachmentName || ''}
                    onChange={(e) => setFormData({ ...formData, attachmentName: e.target.value })}
                    placeholder="เช่น แบบเสนอโครงการ_ฉบับสมบูรณ์.pdf หรือระบุ URL ลิงก์ไฟล์"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่ายที่รับผิดชอบ</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.departmentName}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้รับผิดชอบโครงการ</label>
                  <input
                    type="text"
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">แหล่งงบประมาณ</label>
                  <input
                    type="text"
                    value={formData.budgetSource}
                    onChange={(e) => setFormData({ ...formData, budgetSource: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    งบประมาณที่ได้รับจัดสรร (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={formData.allocatedBudget}
                    onChange={(e) => setFormData({ ...formData, allocatedBudget: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold font-mono text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">สถานะโครงการ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="not_started">ยังไม่ดำเนินการ</option>
                    <option value="in_progress">อยู่ระหว่างดำเนินการ</option>
                    <option value="completed">ดำเนินการแล้ว (ปิดโครงการ)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white shadow-sm"
                >
                  บันทึกข้อมูลโครงการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
