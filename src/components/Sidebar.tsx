import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Calculator,
  PieChart,
  Sparkles,
  FolderGit2,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  Target,
  FileText,
  Settings,
  ShieldAlert,
  LogOut,
  X,
  Bot,
  Database,
  Scissors,
  Sheet
} from 'lucide-react';
import { User } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'school'
  | 'students'
  | 'revenue'
  | 'budget'
  | 'learner_activities'
  | 'ai_project_writer'
  | 'projects'
  | 'approved_projects'
  | 'budget_cut'
  | 'expenses'
  | 'disbursements'
  | 'action_plan'
  | 'reports'
  | 'settings'
  | 'users'
  | 'super_admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenGasModal?: () => void;
  onLogout: () => void;
  currentUser: User;
  pendingCount?: number;
  approvedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenGasModal,
  onLogout,
  currentUser,
  pendingCount = 0,
  approvedCount = 0,
}) => {
  const menuItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'dashboard', label: '1. หน้าหลัก / Dashboard', icon: LayoutDashboard },
    { id: 'school', label: '2. ข้อมูลโรงเรียน', icon: Building2 },
    { id: 'students', label: '3. ข้อมูลนักเรียน', icon: Users2 },
    { id: 'revenue', label: '4. ประมาณการรายรับ', icon: Calculator },
    { id: 'budget', label: '5. จัดสรรงบประมาณ', icon: PieChart },
    { id: 'learner_activities', label: '6. กิจกรรมพัฒนาผู้เรียน', icon: Sparkles },
    { id: 'ai_project_writer', label: '7. เขียนโครงการด้วย AI', icon: Bot, badge: 'AI สพฐ.' },
    { id: 'projects', label: '8. แบบเสนอโครงการ', icon: FolderGit2, badge: pendingCount > 0 ? `${pendingCount} รออนุมัติ` : undefined },
    { id: 'approved_projects', label: '8.1 โครงการที่อนุมัติแล้ว', icon: CheckCircle2, badge: approvedCount > 0 ? `${approvedCount}` : undefined },
    { id: 'budget_cut', label: '8.2 ตัดแผนงบประมาณ', icon: Scissors, badge: 'ปรับลด-เพิ่ม' },
    { id: 'expenses', label: '9. รายละเอียดงบโครงการ', icon: FileSpreadsheet },
    { id: 'disbursements', label: '10. การเบิกจ่าย / การใช้เงิน', icon: Receipt },
    { id: 'action_plan', label: '11. แผนปฏิบัติการประจำปี', icon: Target },
    { id: 'reports', label: '12. รายงาน', icon: FileText },
    { id: 'settings', label: '13. ตั้งค่าระบบ', icon: Settings },
    { id: 'users', label: '14. ผู้ใช้งาน', icon: ShieldAlert },
    { id: 'super_admin', label: '15. Super Admin (MySQL & โรงเรียน)', icon: Database, badge: '8 หลัก' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Top */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4 bg-blue-950">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-blue-950 font-black shadow">
              สพ
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">
                แผนปฏิบัติการ & งบฯ
              </div>
              <div className="text-[11px] text-amber-300">ระบบสถานศึกษาขั้นพื้นฐาน</div>
            </div>
          </div>
          <button
            id="btn-close-sidebar-mobile"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm custom-scrollbar">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            โครงสร้างเมนูหลัก
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-menu-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 space-y-1.5">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              การเชื่อมต่อ & ส่งออก
            </div>
            
            {/* Google Apps Script (Code.gs) Button */}
            {onOpenGasModal && (
              <button
                id="sidebar-menu-gas-pkg"
                type="button"
                onClick={() => {
                  onOpenGasModal();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                <Sheet className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="flex-1">
                  <div>Google Apps Script (Code.gs)</div>
                  <div className="text-[10px] text-emerald-400/80 font-normal">Google Sheets & Gemini AI</div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* User profile footer */}
        <div className="border-t border-slate-800 p-3 bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-white">
                {currentUser.role === 'admin' ? 'AD' : currentUser.role === 'director' ? 'DIR' : 'TCH'}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-medium text-white truncate max-w-[130px]">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-amber-400">
                  {currentUser.role === 'admin'
                    ? 'ผู้ดูแลระบบ (Admin)'
                    : currentUser.role === 'director'
                    ? 'ผู้อำนวยการโรงเรียน'
                    : 'ครูผู้รับผิดชอบโครงการ'}
                </div>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800"
              title="14. ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Node.js v22 Backend • สพฐ. 2568</span>
          </div>
        </div>
      </aside>
    </>
  );
};
