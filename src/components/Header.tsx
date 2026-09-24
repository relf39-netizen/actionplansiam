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
              {school.affiliation} • {school.educationArea}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real MySQL Database Status Badge */}
        {dbConnected ? (
          <div
            className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs"
            title={`เชื่อมต่อฐานข้อมูล MySQL สำเร็จ (${dbName || 'schoobwd_planaction'})`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">MySQL เชื่อมต่อสำเร็จ</span>
            <span className="sm:hidden">MySQL OK</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNavigateToSuperAdmin}
            className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 shadow-xs transition-colors cursor-pointer"
            title="ยังไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้ คลิกเพื่อไปตั้งค่าที่เมนู Super Admin"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="hidden sm:inline">MySQL ยังไม่เชื่อมต่อ (คลิกตั้งค่า)</span>
            <span className="sm:hidden">ตั้งค่า MySQL</span>
          </button>
        )}

        {/* Year badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
          <Calendar className="h-3.5 w-3.5 text-amber-600" />
          <span>ปีงบประมาณ พ.ศ. {activeFiscalYear.year}</span>
        </div>

        {school.isActive === false && (
          <div className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>สถานะ: ระงับการใช้งาน</span>
          </div>
        )}

        {/* Super Admin Quick Button */}
        {onNavigateToSuperAdmin && (
          <button
            id="btn-header-super-admin"
            type="button"
            onClick={onNavigateToSuperAdmin}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 transition-colors shadow-xs"
            title="ศูนย์ควบคุม Super Admin (จัดการ MySQL & โรงเรียน)"
          >
            <Database className="h-4 w-4 text-amber-600" />
            <span className="hidden md:inline">Super Admin</span>
          </button>
        )}

        {/* Google Apps Script / Code.gs quick button */}
        {onOpenGasModal && (
          <button
            id="btn-header-gas-modal"
            type="button"
            onClick={onOpenGasModal}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
            title="Google Apps Script (Code.gs) & เชื่อมต่อ Google Sheets"
          >
            <Sheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Code.gs / ชีต</span>
          </button>
        )}

        {/* Role switch pill */}
        {currentUser.username === 'peyarm' ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 py-1 px-2.5 text-xs font-bold text-amber-900">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
            <span>Super Admin (peyarm)</span>
          </div>
        ) : (
          <div className="relative flex items-center">
            <label htmlFor="select-role-switch" className="sr-only">สลับผู้ใช้งาน</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 px-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 hidden sm:inline" />
              <select
                id="select-role-switch"
                value={currentUser.id}
                onChange={(e) => {
                  const target = availableUsers.find((u) => u.id === Number(e.target.value));
                  if (target) onSwitchUser(target);
                }}
                className="bg-transparent font-medium text-slate-700 outline-none text-xs cursor-pointer"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'admin' ? '🛡️ แอดมิน: ' : u.role === 'director' ? '👔 ผอ.: ' : '👩‍🏫 ครู: '}
                    {u.fullName.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Current user info */}
        <div className="hidden xl:flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="text-right leading-tight">
            <div className="text-xs font-semibold text-slate-800">{currentUser.fullName}</div>
            <div className="text-[11px] text-blue-600">{currentUser.position}</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          id="btn-header-logout"
          type="button"
          onClick={onLogout}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="ออกจากระบบ"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
