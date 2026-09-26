import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  Building2,
  CheckCircle2,
  XCircle,
  Key,
  RefreshCw,
  Plus,
  Search,
  Server,
  Terminal,
  ArrowRightLeft,
  Lock,
  ExternalLink,
  Save,
  Check,
  AlertTriangle,
  Info,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Clock,
  UserPlus,
  Users2,
  Phone,
  Mail,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { School, DatabaseConfig, DatabaseStatus, User } from '../types';

interface SuperAdminViewProps {
  currentSchool?: School;
  onSelectSchool?: (school: School) => void;
  onLogout?: () => void;
  currentUser?: User;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentSchool,
  onSelectSchool,
  onLogout,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'teachers' | 'superadmin_account' | 'database'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSchoolFilter, setTeacherSchoolFilter] = useState<string>('all');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Super Admin account & password change state
  const [saUsername, setSaUsername] = useState('peyarm');
  const [saFullName, setSaFullName] = useState('ผู้ดูแลระบบส่วนกลาง (Super Admin)');
  const [saEmail, setSaEmail] = useState('peyarm@obec.mail.go.th');
  const [saNewPassword, setSaNewPassword] = useState('');
  const [saConfirmPassword, setSaConfirmPassword] = useState('');
  const [showSaPassword, setShowSaPassword] = useState(false);
  const [saError, setSaError] = useState<string | null>(null);
  const [saSuccess, setSaSuccess] = useState<string | null>(null);
  const [saLoading, setSaLoading] = useState(false);
  const [saSource, setSaSource] = useState<'mysql' | 'local_file'>('mysql');

  // DB Config & Status state
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 3306,
    dbname: 'schoobwd_planaction',
    user: 'root',
    pass: '',
  });
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Safe JSON parser helper
  const parseSafeJson = async (res: Response, fallbackMessage = 'การเชื่อมต่อผิดพลาด'): Promise<any> => {
    try {
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      console.warn('Server returned non-JSON:', res.status, res.statusText);
      return { success: false, message: fallbackMessage };
    }
  };

  // New School Form state (ONLY 8-digit SMIS and School Name)
  const [newSmis, setNewSmis] = useState('');
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmittingSchool, setIsSubmittingSchool] = useState(false);

  // Fetch initial schools, users, sa account & db status
  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/super-admin/schools');
      const data = await parseSafeJson(res, 'ไม่สามารถดึงข้อมูลโรงเรียนได้');
      if (res.ok && data.success && Array.isArray(data.schools)) {
        setSchools(data.schools);
      }
    } catch (e) {
      console.error('Error fetching schools:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/super-admin/users');
      const data = await parseSafeJson(res);
      if (res.ok && data.success && Array.isArray(data.users)) {
        setAllUsers(data.users);
        setUsersError(null);
      } else {
        setUsersError(data.message || 'ไม่สามารถดึงรายชื่อคุณครูจาก MySQL ได้');
      }
    } catch (e) {
      console.error('Error fetching users for super admin:', e);
      setUsersError('ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อดึงรายชื่อคุณครูได้');
    }
  };

  const fetchSuperAdminAccount = async () => {
    try {
      const res = await fetch('/api/super-admin/account');
      const data = await parseSafeJson(res);
      if (data.success && data.account) {
        setSaUsername(data.account.username || 'peyarm');
        setSaFullName(data.account.fullName || 'ผู้ดูแลระบบส่วนกลาง (Super Admin)');
        setSaEmail(data.account.email || 'peyarm@obec.mail.go.th');
        setSaSource(data.account.source || 'mysql');
      }
    } catch (e) {
      console.error('Error fetching super admin account:', e);
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/super-admin/db-status');
      const data = await parseSafeJson(res);
      if (data && (data.connected !== undefined || data.success)) {
        setDbStatus(data);
        setDbConfig({
          host: data.host || 'localhost',
          port: data.port || 3306,
          dbname: data.database || data.dbname || 'schoobwd_planaction',
          user: data.user || 'root',
          pass: '',
        });
      }
    } catch (e) {
      console.error('Error fetching db status:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSchools(), fetchUsers(), fetchSuperAdminAccount(), fetchDbStatus()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
    if (activeTab === 'teachers') void fetchUsers();
  }, [activeTab]);

  const handleSmisInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    setNewSmis(cleaned);
  };

  // 1. Add School (ONLY 8-digit SMIS and School Name)
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanSmis = newSmis.trim();
    if (!/^[0-9]{8}$/.test(cleanSmis)) {
      setFormError('รหัสสถานศึกษา SMIS ต้องเป็นตัวเลข 8 หลักพอดี (เช่น 10000001)');
      return;
    }

    if (!newName.trim()) {
      setFormError('กรุณาระบุชื่อโรงเรียน');
      return;
    }

    setIsSubmittingSchool(true);
    try {
      const res = await fetch('/api/super-admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smisCode: cleanSmis,
          name: newName.trim(),
        }),
      });
      const data = await parseSafeJson(res, 'บันทึกโรงเรียนไม่สำเร็จ');
      if (res.ok && data.success) {
        setFormSuccess(
          `เพิ่มโรงเรียน "${newName.trim()}" (รหัส SMIS: ${cleanSmis}) สำเร็จสมบูรณ์! คุณครูในโรงเรียนนี้สามารถสมัครเข้าใช้งานด้วยรหัส SMIS นี้ได้ทันที`
        );
        setNewSmis('');
        setNewName('');
        if (data.school && onSelectSchool) {
          onSelectSchool(data.school);
        }
        await fetchSchools();
      } else {
        setFormError(data.message || 'เกิดข้อผิดพลาดในการบันทึกลงฐานข้อมูล MySQL');
      }
    } catch (err: any) {
      setFormError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmittingSchool(false);
    }
  };

  const handleToggleStatus = async (school: School) => {
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}/toggle`, {
        method: 'PATCH',
      });
      const data = await parseSafeJson(res);
      if (data.success) {
        setSchools((prev) =>
          prev.map((s) => (s.id === school.id ? { ...s, isActive: data.isActive } : s))
        );
      }
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDeleteSchool = async (school: School) => {
    if (!window.confirm(`ยืนยันการลบโรงเรียน "${school.name}" (SMIS: ${school.smisCode}) ออกจากระบบหรือไม่?`)) return;
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: 'DELETE',
      });
      const data = await parseSafeJson(res, 'ลบโรงเรียนไม่สำเร็จ');
      if (res.ok && data.success) {
        setSchools((prev) => prev.filter((s) => s.id !== school.id));
        alert(data.message || 'ลบโรงเรียนเรียบร้อยแล้ว');
      } else {
        alert(data.message || 'ไม่สามารถลบโรงเรียนได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบโรงเรียน');
    }
  };

  // 2. Teacher Approvals & Designating School Admin
  const handleApproveTeacher = async (userId: number, role: 'admin' | 'teacher' | 'director' = 'teacher') => {
    try {
      const res = await fetch('/api/super-admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, status: 'approved' }),
      });
      const data = await parseSafeJson(res);
      if (data.success) {
        alert(data.message || 'อนุมัติเรียบร้อยแล้ว');
        await fetchUsers();
        await fetchSchools();
      } else {
        alert(data.message || 'ไม่สามารถอนุมัติได้');
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
  };

  const handleSetSchoolAdmin = async (user: any) => {
    if (!window.confirm(`ต้องการแต่งตั้ง "${user.fullName}" เป็นแอดมินของโรงเรียน "${user.schoolName || user.schoolSmis}" ใช่หรือไม่?\n\nเมื่อเป็นแอดมินโรงเรียน คุณครูท่านนี้จะมีสิทธิ์อนุมัติคุณครูคนอื่นๆ ในโรงเรียนของตนเองได้`)) {
      return;
    }
    try {
      const res = await fetch('/api/super-admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: 'admin', status: 'approved' }),
      });
      const data = await parseSafeJson(res);
      if (data.success) {
        alert(data.message || `แต่งตั้ง ${user.fullName} เป็นแอดมินของโรงเรียนเรียบร้อยแล้ว`);
        await fetchUsers();
        await fetchSchools();
      } else {
        alert(data.message || 'ไม่สามารถแต่งตั้งได้');
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
  };

  const handleRejectUser = async (userId: number, name: string) => {
    if (!window.confirm(`ต้องการปฏิเสธและลบคำขอสมัครของ "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/super-admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: 'rejected' }),
      });
      const data = await parseSafeJson(res);
      if (data.success) {
        alert(data.message || 'ลบคำขอเรียบร้อยแล้ว');
        await fetchUsers();
      } else {
        alert(data.message || 'ไม่สามารถลบได้');
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
  };

  // 3. Super Admin Account & Password Update (MySQL Database)
  const handleUpdateSaAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaError(null);
    setSaSuccess(null);

    if (saUsername.trim().length < 3) {
      setSaError('ชื่อผู้ใช้งาน Super Admin ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }

    if (saNewPassword) {
      if (saNewPassword.length < 4) {
        setSaError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
        return;
      }
      if (saNewPassword !== saConfirmPassword) {
        setSaError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    setSaLoading(true);
    try {
      const res = await fetch('/api/super-admin/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: saUsername.trim(),
          password: saNewPassword ? saNewPassword.trim() : undefined,
          fullName: saFullName.trim(),
          email: saEmail.trim(),
        }),
      });
      const data = await parseSafeJson(res, 'ไม่สามารถบันทึกข้อมูล Super Admin ได้');
      if (data.success) {
        setSaSuccess(data.message || 'บันทึก Username และ Password ของ Super Admin ลงฐานข้อมูล MySQL สำเร็จสมบูรณ์!');
        setSaNewPassword('');
        setSaConfirmPassword('');
        fetchSuperAdminAccount();
      } else {
        setSaError(data.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err: any) {
      setSaError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaLoading(false);
    }
  };

  // 4. Database Test, Save & Migration
  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/super-admin/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      const data = await parseSafeJson(res, 'ไม่สามารถติดต่อเซิร์ฟเวอร์ทดสอบได้');
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ทดสอบได้: ' + err.message,
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDb(true);
    try {
      const res = await fetch('/api/super-admin/save-db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      const data = await parseSafeJson(res, 'บันทึกข้อมูลเรียบร้อย');
      alert(data.message || 'บันทึกข้อมูลการตั้งค่า MySQL สำเร็จ');
      fetchDbStatus();
    } catch (err: any) {
      alert('ข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleRunMigration = async () => {
    if (!window.confirm('ยืนยันการรัน Auto-Migration โครงสร้างตารางทั้ง 14 ตารางใน MySQL รวมถึงตาราง super_admins และ multi-tenant?')) return;
    setIsMigrating(true);
    setMigrationLogs(['กำลังตรวจสอบและสร้างตารางใน MySQL...']);
    try {
      const res = await fetch('/api/super-admin/auto-migrate', {
        method: 'POST',
      });
      const data = await parseSafeJson(res, 'ไม่สามารถรัน Migration ได้');
      if (data.logs) {
        setMigrationLogs(data.logs);
      }
      fetchDbStatus();
      fetchSchools();
    } catch (err: any) {
      setMigrationLogs((prev) => [...prev, '✗ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message]);
    } finally {
      setIsMigrating(false);
    }
  };

  // Filtered lists
  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.smisCode && s.smisCode.includes(q)) ||
      (s.schoolKey && s.schoolKey.toLowerCase().includes(q)) ||
      (s.adminTeacherName && s.adminTeacherName.toLowerCase().includes(q))
    );
  });

  const filteredTeachers = allUsers.filter((u) => {
    if (u.role === 'superadmin') return false;
    if (teacherSchoolFilter !== 'all' && String(u.schoolId) !== teacherSchoolFilter && u.schoolSmis !== teacherSchoolFilter) {
      return false;
    }
    if (teacherStatusFilter === 'pending' && u.status !== 'pending') return false;
    if (teacherStatusFilter === 'approved' && u.status === 'pending') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.fullName?.toLowerCase().includes(q);
      const matchUser = u.username?.toLowerCase().includes(q);
      const matchSchool = u.schoolName?.toLowerCase().includes(q);
      const matchSmis = u.schoolSmis?.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchSchool && !matchSmis) return false;
    }
    return true;
  });

  const pendingTeachersCount = allUsers.filter((u) => u.role !== 'superadmin' && u.status === 'pending').length;
  const activeCount = schools.filter((s) => s.isActive !== false).length;
  const inactiveCount = schools.filter((s) => s.isActive === false).length;

  return (
    <div id="super-admin-view" className="space-y-6">
      {/* Top Super Admin Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-amber-500/15 via-blue-600/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-2xl shadow-xl shrink-0">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Super Admin Management Portal
                </h1>
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-0.5 rounded-full">
                  ศูนย์ควบคุมผู้ดูแลระบบส่วนกลาง
                </span>
                {dbStatus?.connected ? (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    MySQL Database Online
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Local Storage Active
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                ระบบจัดการสถานศึกษาด้วยรหัส SMIS 8 หลัก • อนุมัติคุณครูและแต่งตั้งแอดมินโรงเรียน • บริหารจัดการ MySQL Database
              </p>
            </div>
          </div>

          {/* Quick profile info & Logout */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
            <div className="text-right px-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{saUsername}</span>
              </div>
              <div className="text-[10px] text-amber-300">Super Administrator</div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="ออกจากระบบ Super Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div
            onClick={() => setActiveTab('schools')}
            className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>โรงเรียนทั้งหมด</span>
              <Building2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">{schools.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">รหัส SMIS 8 หลัก</div>
          </div>

          <div
            onClick={() => setActiveTab('teachers')}
            className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>คุณครูรออนุมัติ</span>
              <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
              {pendingTeachersCount}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">รอ Super Admin / Admin อนุมัติ</div>
          </div>

          <div
            onClick={() => setActiveTab('teachers')}
            className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>คุณครูทั้งหมด</span>
              <Users2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {allUsers.filter((u) => u.role !== 'superadmin').length}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">สมัครเข้าใช้งานผ่าน SMIS</div>
          </div>

          <div
            onClick={() => setActiveTab('superadmin_account')}
            className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>ฐานข้อมูล Super Admin</span>
              <Key className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-blue-300 font-mono mt-1 truncate">
              {saUsername}
            </div>
            <div className="text-[11px] text-blue-400/80 mt-0.5">เก็บใน MySQL (super_admins)</div>
          </div>
        </div>
      </div>

      {/* Super Admin Main Tabs (ONLY Super Admin Menus) */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schools'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-800" />
          <span>1. เพิ่มและจัดการโรงเรียน (SMIS 8 หลัก)</span>
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 rounded-full font-mono font-bold text-slate-700">
            {schools.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'teachers'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-600" />
          <span>2. อนุมัติคุณครู & แต่งตั้ง Admin โรงเรียน</span>
          {pendingTeachersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-amber-500 text-slate-950 rounded-full font-bold">
              {pendingTeachersCount} รออนุมัติ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('superadmin_account')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'superadmin_account'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4 text-purple-700" />
          <span>3. บัญชี Super Admin (Username & Password ใน MySQL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'database'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-700" />
          <span>4. จัดการฐานข้อมูล MySQL & โครงสร้างระบบ</span>
        </button>
      </div>

      {/* TAB 1: SCHOOLS MANAGEMENT (FORM ONLY HAS SMIS 8 DIGITS & SCHOOL NAME) */}
      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add School Form - Strictly requires ONLY SMIS 8 digits & School Name */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">เพิ่มสถานศึกษาใหม่</h3>
                <p className="text-xs text-slate-500">ระบุเฉพาะรหัส SMIS 8 หลัก และชื่อโรงเรียนเท่านั้น</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-medium">{formSuccess}</div>
              </div>
            )}

            <form onSubmit={handleAddSchool} className="space-y-4">
              {/* Field 1: SMIS Code 8 Digits */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>1. รหัสสถานศึกษา SMIS (8 หลัก) *</span>
                  <span className="text-[11px] font-normal text-slate-500">8 หลักพอดี</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={newSmis}
                    onChange={(e) => handleSmisInput(e.target.value)}
                    placeholder="เช่น 10000001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-3 text-base font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-mono font-bold text-slate-400">
                    {newSmis.length}/8
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  • คุณครูจะใช้รหัสนี้ในการค้นหาโรงเรียนและสมัครเข้าใช้งาน
                </p>
              </div>

              {/* Field 2: School Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  2. ชื่อโรงเรียน *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น โรงเรียนบ้านดอนวิทยาคม"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {/* Automated Tenant preview note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>ระบบอัตโนมัติ:</span>
                </div>
                <div>• ระบบจะสร้าง Tenant Key: <code className="font-bold text-amber-700">{newSmis.length === 8 ? `SCH-${newSmis}` : 'SCH-________'}</code></div>
                <div>• โรงเรียนจะเปิดใช้งานทันที พร้อมให้คุณครูเข้ามาสมัคร</div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSchool || newSmis.length !== 8 || !newName.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSchool ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>เพิ่มโรงเรียนใหม่</span>
              </button>
            </form>
          </div>

          {/* Schools List Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>รายชื่อโรงเรียนในระบบ</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-100 text-blue-900 font-bold">
                    {filteredSchools.length} แห่ง
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ตรวจสอบรหัส SMIS, สถานะการใช้งาน และแอดมินของโรงเรียนที่ได้รับการแต่งตั้ง
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือ รหัส SMIS..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 w-12 text-center">ที่</th>
                    <th className="py-3 px-3 w-28">รหัส SMIS</th>
                    <th className="py-3 px-4 min-w-[200px]">ชื่อโรงเรียน</th>
                    <th className="py-3 px-3 min-w-[150px]">แอดมินโรงเรียน</th>
                    <th className="py-3 px-3 text-center w-24">สถานะ</th>
                    <th className="py-3 px-3 text-center w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchools.map((s, idx) => {
                    const teachersInSchool = allUsers.filter(
                      (u) => u.schoolId === s.id || u.schoolSmis === s.smisCode
                    );
                    const adminUser = teachersInSchool.find((u) => u.role === 'admin');

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-700">
                          {s.smisCode || s.schoolCode?.slice(0, 8) || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">
                            คุณครูที่ลงทะเบียน: {teachersInSchool.length} คน
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {adminUser || s.adminTeacherName ? (
                            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span>{adminUser?.fullName || s.adminTeacherName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ยังไม่ได้แต่งตั้ง Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              s.isActive !== false
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {s.isActive !== false ? 'เปิดใช้งาน' : 'ระงับการใช้'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSchool(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบโรงเรียน"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSchools.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        ไม่พบข้อมูลโรงเรียนตามที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHER APPROVALS & DESIGNATING SCHOOL ADMIN */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          {usersError && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">{usersError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <span>การอนุมัติคุณครู & แต่งตั้ง Admin ของโรงเรียน</span>
                {pendingTeachersCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                    {pendingTeachersCount} รอการอนุมัติ
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เมื่อคุณครูสมัครเข้าใช้งานด้วยรหัส SMIS 8 หลักแล้ว Super Admin มีหน้าที่อนุมัติการใช้งานและแต่งตั้งเป็น Admin ของโรงเรียน เพื่อให้ Admin ของโรงเรียนไปอนุมัติครูคนอื่นๆ ต่อไป
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void fetchUsers()} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50">
                รีเฟรชรายชื่อ
              </button>
              <select
                value={teacherSchoolFilter}
                onChange={(e) => setTeacherSchoolFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">ทุกโรงเรียน ({schools.length} แห่ง)</option>
                {schools.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({s.smisCode})
                  </option>
                ))}
              </select>

              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รออนุมัติเท่านั้น ({pendingTeachersCount})</option>
                <option value="approved">อนุมัติแล้ว</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, เลขบัตรประชาชน..."
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-48"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-12 text-center">ที่</th>
                  <th className="py-3 px-3 min-w-[140px]">เลขบัตร ปชช. (Username)</th>
                  <th className="py-3 px-4 min-w-[180px]">ชื่อ - สกุลคุณครู</th>
                  <th className="py-3 px-4 min-w-[180px]">โรงเรียน (SMIS 8 หลัก)</th>
                  <th className="py-3 px-3 min-w-[140px]">ตำแหน่ง</th>
                  <th className="py-3 px-3 w-32 text-center">สถานะ</th>
                  <th className="py-3 px-3 w-36 text-center">บทบาท (Role)</th>
                  <th className="py-3 px-3 min-w-[220px] text-center">การดำเนินการของ Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {u.username || u.citizenId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-blue-950">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">
                        {u.phone && <span>โทร: {u.phone} </span>}
                        {u.email && <span>• {u.email}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{u.schoolName}</div>
                      <div className="text-[11px] font-mono text-amber-700">SMIS: {u.schoolSmis}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.position || 'ครู'}</td>
                    <td className="py-3 px-3 text-center">
                      {u.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>รออนุมัติ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>อนุมัติแล้ว</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          u.role === 'admin'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : u.role === 'director'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin โรงเรียน</span>
                          </>
                        ) : u.role === 'director' ? (
                          'ผู้อำนวยการ'
                        ) : (
                          'คุณครู'
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {u.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTeacher(u.id, 'teacher')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            title="อนุมัติการใช้งานเป็นคุณครู"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติ</span>
                          </button>
                        )}

                        {u.role !== 'admin' ? (
                          <button
                            type="button"
                            onClick={() => handleSetSchoolAdmin(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            title="ตั้งค่าคุณครูท่านนี้เป็นแอดมินของโรงเรียน"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>ตั้งเป็น Admin โรงเรียน</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApproveTeacher(u.id, 'teacher')}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
                            title="สลับเป็นคุณครูปกติ"
                          >
                            <span>เป็นครูปกติ</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRejectUser(u.id, u.fullName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="ปฏิเสธ / ลบคำขอ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div>ไม่พบรายการคุณครูตามเงื่อนไขที่เลือก</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPER ADMIN ACCOUNT & CREDENTIALS IN MYSQL */}
      {activeTab === 'superadmin_account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Current Credentials & Status */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  บัญชีผู้ดูแลระบบส่วนกลาง (Super Admin)
                </h3>
                <p className="text-xs text-slate-500">
                  จัดเก็บในฐานข้อมูล MySQL ตาราง <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-purple-700 font-bold">super_admins</code>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">ชื่อผู้ใช้งาน (Username):</span>
                <span className="font-mono font-bold text-purple-900 text-sm">{saUsername}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">ชื่อ-นามสกุล:</span>
                <span className="font-bold text-slate-800">{saFullName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">อีเมลติดต่อ:</span>
                <span className="text-slate-700">{saEmail || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-200">
                <span className="text-slate-600 font-medium">แหล่งจัดเก็บข้อมูลจริง:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>MySQL Database (super_admins)</span>
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1.5 pt-2">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                <span>คำแนะนำความปลอดภัย:</span>
              </div>
              <div>• หากเปลี่ยน Username หรือ รหัสผ่าน ระบบจะทำการอัปเดตลงตาราง <code className="font-mono bg-slate-100 px-1">super_admins</code> ใน MySQL ทันที</div>
              <div>• สามารถนำ Username และรหัสผ่านใหม่นี้ไปล็อกอินเข้าสู่ระบบได้ทันที</div>
            </div>
          </div>

          {/* Form: Update Super Admin Username & Password */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ปรับปรุง Username และ Password ของ Super Admin
            </h3>
            <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
              บันทึกการเปลี่ยนแปลงตรงไปยัง MySQL เพื่อความเป็นระบบ
            </p>

            {saError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{saError}</span>
              </div>
            )}

            {saSuccess && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{saSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSaAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน Super Admin (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={saUsername}
                  onChange={(e) => setSaUsername(e.target.value)}
                  placeholder="เช่น peyarm"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={saFullName}
                  onChange={(e) => setSaFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  value={saEmail}
                  onChange={(e) => setSaEmail(e.target.value)}
                  placeholder="name@obec.mail.go.th"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (ระบุเมื่อต้องการเปลี่ยนรหัสผ่าน)
                </label>
                <div className="relative">
                  <input
                    type={showSaPassword ? 'text' : 'password'}
                    value={saNewPassword}
                    onChange={(e) => setSaNewPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSaPassword(!showSaPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {saNewPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ยืนยันรหัสผ่านใหม่อีกครั้ง *
                  </label>
                  <input
                    type={showSaPassword ? 'text' : 'password'}
                    required
                    value={saConfirmPassword}
                    onChange={(e) => setSaConfirmPassword(e.target.value)}
                    placeholder="กรอกยืนยันรหัสผ่านใหม่"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saLoading}
                className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>บันทึกข้อมูลและรหัสผ่าน Super Admin ลงฐานข้อมูล MySQL</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE CONFIG & MIGRATION */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">กำหนดค่าการเชื่อมต่อ MySQL</h3>
                <p className="text-xs text-slate-500">บันทึกลงใน config/db_config.json สำหรับใช้งานจริง</p>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="font-medium">{testResult.message}</div>
              </div>
            )}

            <form onSubmit={handleSaveDatabase} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">DB Host</label>
                  <input
                    type="text"
                    required
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Database Name</label>
                <input
                  type="text"
                  required
                  value={dbConfig.dbname}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbname: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">User</label>
                <input
                  type="text"
                  required
                  value={dbConfig.user}
                  onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={dbConfig.pass}
                  onChange={(e) => setDbConfig({ ...dbConfig, pass: e.target.value })}
                  placeholder="กรอกรหัสผ่าน MySQL"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestDatabase}
                  disabled={isTestingDb}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isTestingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                  <span>ทดสอบการเชื่อมต่อ</span>
                </button>
                <button
                  type="submit"
                  disabled={isSavingDb}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isSavingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>บันทึกการตั้งค่า</span>
                </button>
              </div>
            </form>
          </div>

          {/* Auto-migration and Table Status */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Auto-Migration & โครงสร้างระบบ</h3>
                  <p className="text-xs text-slate-500">สร้างตารางทั้ง 14 ตาราง รวมทั้ง super_admins</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunMigration}
                disabled={isMigrating}
                className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isMigrating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>รัน Auto-Migration</span>
              </button>
            </div>

            {migrationLogs.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
                {migrationLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800">ตารางหลักในระบบ (14 ตาราง):</div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="p-1.5 bg-slate-50 rounded-lg">● super_admins (แอดมินกลาง)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● schools (สถานศึกษา)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● users (ผู้ใช้งาน/คุณครู)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● fiscal_years (ปีงบประมาณ)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● students (ข้อมูลนักเรียน)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● revenues (ประมาณการรายรับ)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● budget_allocations (จัดสรรงบ)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● learner_activities (กิจกรรมผู้เรียน)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● projects (โครงการ สพฐ.)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● budget_transactions (เบิกจ่าย)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● strategies & goals (ยุทธศาสตร์)</div>
                <div className="p-1.5 bg-slate-50 rounded-lg">● project_expense_items (ค่าใช้จ่าย)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
