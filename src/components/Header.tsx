import React from 'react';
import { School, User, FiscalYear } from '../types';
import { 
  Building2, 
  Calendar, 
  UserCircle2, 
  ShieldCheck, 
  LogOut,
  Bell,
  Menu,
  Database,
  Sheet
} from 'lucide-react';

interface HeaderProps {
  school: School;
  activeFiscalYear: FiscalYear;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  onOpenGasModal?: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onNavigateToSuperAdmin?: () => void;
  dbConnected?: boolean;
  dbName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  school,
  activeFiscalYear,
  currentUser,
  onSwitchUser,
  availableUsers,
  onOpenGasModal,
  onToggleSidebar,
  onLogout,
  onNavigateToSuperAdmin,
  dbConnected,
  dbName,
}) => {
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar"
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none lg:hidden"
          title="เมนู"
        >
          <Menu className="h-5 w-5" />
        </button>

        {isSuperAdmin ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black shadow">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 sm:text-base">
                  ระบบบริหารจัดการส่วนกลาง (Super Admin)
                </h1>
                <span className="hidden sm:inline text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  ศูนย์ควบคุมหลัก
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) • บริหารโรงเรียนและอนุมัติผู้ใช้งาน
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-amber-400 font-bold shadow">
              {school.logoUrl ? (
                <img 
                  src={school.logoUrl} 
                  alt={school.name} 
                  className="h-8 w-8 rounded object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 line-clamp-1 sm:text-base">
                {school.name}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {school.affiliation || 'สพฐ.'} {school.educationArea ? `• ${school.educationArea}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real MySQL Database Status Badge */}
        {dbConnected ? (
          <div
            className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs"
            title={`เชื่อมต่อฐานข้อมูล MySQL สำเร็จ (${dbName || 'schoobwd_planaction'})`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">MySQL Online</span>
            <span className="sm:hidden">MySQL OK</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs"
            title="ทำงานด้วย Local Storage สำรอง"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="hidden sm:inline">Local Storage (พร้อมใช้งาน)</span>
            <span className="sm:hidden">Local OK</span>
          </div>
        )}

        {/* Year badge - for school users */}
        {!isSuperAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            <span>ปีงบประมาณ พ.ศ. {activeFiscalYear.year}</span>
          </div>
        )}

        {!isSuperAdmin && school.isActive === false && (
          <div className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>สถานะ: ระงับการใช้งาน</span>
          </div>
        )}

        {/* User Info & Role Badge */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{currentUser.fullName}</div>
            <div className="text-[11px] font-semibold text-blue-600">
              {isSuperAdmin
                ? 'ผู้ดูแลระบบส่วนกลาง (Super Admin)'
                : currentUser.role === 'admin'
                ? 'แอดมินโรงเรียน (School Admin)'
                : currentUser.position || 'คุณครู'}
            </div>
          </div>

          <button
            id="btn-header-logout"
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
