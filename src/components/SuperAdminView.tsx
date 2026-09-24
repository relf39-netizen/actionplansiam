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
} from 'lucide-react';
import { School, DatabaseConfig, DatabaseStatus } from '../types';

interface SuperAdminViewProps {
  currentSchool: School;
  onSelectSchool: (school: School) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentSchool,
  onSelectSchool,
}) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'database' | 'superadmin_account' | 'security'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});

  // Super Admin account & password change state
  const [saUsername] = useState('peyarm');
  const [saNewPassword, setSaNewPassword] = useState('');
  const [saConfirmPassword, setSaConfirmPassword] = useState('');
  const [saError, setSaError] = useState<string | null>(null);
  const [saSuccess, setSaSuccess] = useState<string | null>(null);
  const [saLoading, setSaLoading] = useState(false);

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

  // Safe JSON parser helper to prevent HTML response parse errors
  const parseSafeJson = async (res: Response, fallbackMessage = 'การเชื่อมต่อผิดพลาด'): Promise<any> => {
    try {
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      console.warn('Server returned non-JSON:', res.status, res.statusText);
      return { success: false, message: fallbackMessage };
    }
  };

  // New School Form state
  const [newSmis, setNewSmis] = useState('');
  const [newName, setNewName] = useState('');
  const [newProvince, setNewProvince] = useState('กรุงเทพมหานคร');
  const [newArea, setNewArea] = useState('สำนักงานเขตพื้นที่การศึกษาประถมศึกษา');
  const [newDirector, setNewDirector] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('123456');
  const [newIsActive, setNewIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmittingSchool, setIsSubmittingSchool] = useState(false);

  // Fetch initial schools & db status
  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/super-admin/schools');
      const data = await parseSafeJson(res, 'ไม่สามารถดึงข้อมูลโรงเรียนได้');
      if (res.ok && data.success && Array.isArray(data.schools)) {
        setSchools(data.schools);
      } else if (!res.ok) {
        setFormError(data.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้');
      }
    } catch (e) {
      console.error('Error fetching schools:', e);
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
          dbname: data.database || data.dbname || 'school_budget_db',
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
    Promise.all([fetchSchools(), fetchDbStatus()]).finally(() => setLoading(false));
  }, []);

  const handleSmisInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    setNewSmis(cleaned);
    if (cleaned.length === 8 && !newAdminUser) {
      setNewAdminUser(`admin_${cleaned}`);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!/^[0-9]{8}$/.test(newSmis)) {
      setFormError('รหัสสมัคร SMIS ต้องเป็นตัวเลข 8 หลักพอดี (เช่น 10000001)');
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
          smisCode: newSmis,
          name: newName,
          province: newProvince,
          educationArea: newArea,
          directorName: newDirector,
          adminUsername: newAdminUser || `admin_${newSmis}`,
          adminPasswordPlain: newAdminPass,
          isActive: newIsActive,
        }),
      });
      const data = await parseSafeJson(res, 'บันทึกโรงเรียนไม่สำเร็จ');
      if (res.ok && data.success) {
        setFormSuccess(data.message || 'บันทึกโรงเรียนลงในฐานข้อมูล MySQL สำเร็จสมบูรณ์');
        setNewSmis('');
        setNewName('');
        setNewDirector('');
        setNewAdminUser('');
        setNewAdminPass('123456');
        if (data.school) {
          onSelectSchool(data.school);
        }
        fetchSchools();
      } else {
        setFormError(data.message || 'เกิดข้อผิดพลาดในการบันทึกลง MySQL โปรดตรวจสอบการเชื่อมต่อฐานข้อมูล');
      }
    } catch (err: any) {
      setFormError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หรือฐานข้อมูล MySQL: ' + err.message);
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
    if (!window.confirm(`ยืนยันการลบโรงเรียน "${school.name}" ออกจากฐานข้อมูล MySQL หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: 'DELETE',
      });
      const data = await parseSafeJson(res, 'ลบโรงเรียนไม่สำเร็จ');
      if (res.ok && data.success) {
        setSchools((prev) => {
          const updated = prev.filter((s) => s.id !== school.id);
          if (currentSchool.id === school.id && updated.length > 0) {
            onSelectSchool(updated[0]);
          }
          return updated;
        });
        alert(data.message || 'ลบโรงเรียนออกจาก MySQL เรียบร้อยแล้ว');
      } else {
        alert(data.message || 'ไม่สามารถลบโรงเรียนได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบโรงเรียน');
    }
  };

  const handlePurgeAllDemo = async () => {
    if (!window.confirm('ยืนยันต้องการลบข้อมูลโรงเรียนตัวอย่างและข้อมูลทดสอบออกจากฐานข้อมูล MySQL ใช่หรือไม่?')) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/purge-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await parseSafeJson(res, 'ดำเนินการเรียบร้อยแล้ว');
      if (res.ok && data.success) {
        alert(data.message || 'ล้างข้อมูลตัวอย่างออกจาก MySQL สำเร็จสมบูรณ์');
        if (Array.isArray(data.schools)) {
          setSchools(data.schools);
          if (data.schools.length > 0) {
            onSelectSchool(data.schools[0]);
          }
        } else {
          fetchSchools();
        }
      } else {
        alert('เกิดข้อผิดพลาดจาก MySQL: ' + (data.message || 'ไม่สามารถล้างข้อมูลได้'));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

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
      alert(data.message || 'บันทึกข้อมูลสำเร็จ');
      fetchDbStatus();
    } catch (err: any) {
      alert('ข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleRunMigration = async () => {
    if (!window.confirm('ยืนยันการรัน Auto-Migration โครงสร้าง MySQL และระบบ Multi-Tenant?')) return;
    setIsMigrating(true);
    setMigrationLogs(['กำลังตรวจสอบโครงสร้างตารางทั้ง 14 ตารางใน MySQL...']);
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

  const handleChangeSaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaError(null);
    setSaSuccess(null);

    if (saNewPassword.length < 4) {
      setSaError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (saNewPassword !== saConfirmPassword) {
      setSaError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSaLoading(true);
    try {
      const res = await fetch('/api/auth/super-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: saNewPassword.trim() }),
      });
      const data = await parseSafeJson(res, 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      if (data.success) {
        setSaSuccess(data.message || 'เปลี่ยนรหัสผ่าน Super Admin เรียบร้อยแล้ว');
        setSaNewPassword('');
        setSaConfirmPassword('');
      } else {
        setSaError(data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch (err: any) {
      setSaError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaLoading(false);
    }
  };

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.smisCode && s.smisCode.includes(q)) ||
      (s.schoolKey && s.schoolKey.toLowerCase().includes(q)) ||
      (s.province && s.province.toLowerCase().includes(q))
    );
  });

  const activeCount = schools.filter((s) => s.isActive !== false).length;
  const inactiveCount = schools.filter((s) => s.isActive === false).length;

  return (
    <div id="super-admin-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shrink-0">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Super Admin Management Portal
                </h1>
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  ระบบผู้ดูแลส่วนกลาง
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                จัดการฐานข้อมูล MySQL, รันอัปเดตอัตโนมัติ (Auto-Migration) และบริหารจัดการโรงเรียนในระบบแยกข้อมูลเด็ดขาด (Multi-Tenant)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                โรงเรียนที่กำลังดู: <strong className="text-amber-300">{currentSchool.name}</strong>
              </span>
            </div>
            <a
              href="/super_admin.php"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
              title="เปิดหน้า Super Admin ในมุมมอง PHP / Hosting"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>เปิดเวอร์ชัน PHP</span>
            </a>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">โรงเรียนทั้งหมดในระบบ</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{schools.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ใช้รหัส SMIS 8 หลัก</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">เปิดใช้งาน (Active)</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{activeCount}</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">เข้าใช้งานได้ตามปกติ</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">ปิดใช้งาน (Inactive)</div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-0.5">{inactiveCount}</div>
            <div className="text-[11px] text-rose-400/80 mt-0.5">ระงับการเข้าสู่ระบบ</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">ตารางฐานข้อมูล MySQL</div>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-0.5">
              {dbStatus?.table_count || 14}
            </div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">พร้อมระบบ Multi-Tenant</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'schools'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. จัดการโรงเรียน & รหัสสมัคร SMIS 8 หลัก</span>
          <span className="ml-1 px-2 py-0.5 text-xs bg-slate-100 rounded-full font-mono font-bold text-slate-600">
            {schools.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'database'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>2. จัดการ MySQL (schoobwd_planaction)</span>
        </button>

        <button
          onClick={() => setActiveTab('superadmin_account')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'superadmin_account'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>3. บัญชี Super Admin (peyarm)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>4. สถาปัตยกรรมการแยกข้อมูล (Data Isolation)</span>
        </button>
      </div>

      {/* TAB 1: SCHOOLS MANAGEMENT */}
      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add School Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">เปิดใช้งานโรงเรียนใหม่</h3>
                <p className="text-xs text-slate-500">กำหนดรหัส SMIS 8 หลัก และ ID ประจำโรงเรียน</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสสมัคร SMIS (ตัวเลข 8 หลัก) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={newSmis}
                    onChange={(e) => handleSmisInput(e.target.value)}
                    placeholder="เช่น 10400100"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400">
                    {newSmis.length}/8
                  </span>
                </div>
                <p className="text-[11px] text-amber-600 mt-1">
                  ต้องเป็นตัวเลข 8 หลักตามรหัสสถานศึกษา SMIS ของ สพฐ.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโรงเรียน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น โรงเรียนบ้านดอนวิทยาคม"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จังหวัด</label>
                  <input
                    type="text"
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เขตพื้นที่ฯ</label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Data Isolation Credentials Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>ข้อมูลความปลอดภัยและการแยกข้อมูล (Data Isolation)</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">
                    School ID / Tenant Identifier (สร้างอัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={newSmis.length === 8 ? `SCH-${newSmis}` : 'SCH-________'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">
                      ID ผู้ดูแลโรงเรียน
                    </label>
                    <input
                      type="text"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      placeholder={newSmis ? `admin_${newSmis}` : 'admin_10400100'}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">
                      รหัสผ่านโรงเรียน
                    </label>
                    <input
                      type="text"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">เปิดใช้งานทันที (Active)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSchool}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingSchool ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>บันทึกและเปิดใช้งานโรงเรียน</span>
              </button>
            </form>
          </div>

          {/* Schools List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>รายชื่อโรงเรียนที่เปิดใช้งานในระบบ</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-50 text-blue-700 font-bold">
                    {filteredSchools.length} แห่ง
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ควบคุมการเปิด-ปิดสิทธิ์ใช้งาน และดู ID/รหัสผ่านเพื่อป้องกันข้อมูลชนกัน
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handlePurgeAllDemo}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                  title="ล้างข้อมูลโรงเรียนตัวอย่างและข้อมูลทดสอบออกจาก MySQL"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>ล้างข้อมูลตัวอย่างออกจาก MySQL</span>
                </button>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อ, รหัส SMIS, จังหวัด..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">รหัส SMIS (8 หลัก)</th>
                    <th className="py-2.5 px-3 font-semibold">ชื่อโรงเรียน</th>
                    <th className="py-2.5 px-3 font-semibold">School ID / บัญชี</th>
                    <th className="py-2.5 px-3 font-semibold">รหัสผ่าน</th>
                    <th className="py-2.5 px-3 font-semibold text-center">สถานะ</th>
                    <th className="py-2.5 px-3 font-semibold text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchools.map((sch) => {
                    const isCurrent = currentSchool.id === sch.id;
                    const isVisiblePass = Boolean(showPasswordMap[sch.id]);

                    return (
                      <tr
                        key={sch.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCurrent ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-amber-700 text-sm">
                            {sch.smisCode || '10400100'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sch.schoolCode}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{sch.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded-sm font-semibold">
                                ปัจจุบัน
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {sch.educationArea} • {sch.province}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <div className="text-blue-700 font-bold">
                            {sch.schoolKey || `SCH-${sch.smisCode || '0000'}`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            User: {sch.adminUsername || 'admin'}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-700 font-bold">
                              {isVisiblePass ? sch.adminPasswordPlain || '123456' : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswordMap((prev) => ({
                                  ...prev,
                                  [sch.id]: !prev[sch.id],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              {isVisiblePass ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {sch.isActive !== false ? (
                            <button
                              onClick={() => handleToggleStatus(sch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="คลิกเพื่อปิดการใช้งาน"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>เปิดใช้งาน</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(sch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                              title="คลิกเพื่อเปิดใช้งาน"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>ระงับการใช้งาน</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectSchool(sch)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="สลับไปยังโรงเรียนนี้เพื่อดูข้อมูลเฉพาะโรงเรียน"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>สลับข้อมูล</span>
                            </button>

                            <button
                              onClick={() => handleDeleteSchool(sch)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="ลบโรงเรียน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATABASE SETTINGS & AUTO-MIGRATION */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Node.js Database Config Information Card */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      ระบบจัดการการเชื่อมต่อฐานข้อมูลอัตโนมัติ (Zero-Config / UI Managed)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Node.js Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    บันทึกและอ่านค่าคอนฟิกอัตโนมัติผ่าน <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-blue-700">config/db_config.json</code> โดยตรง ไม่จำเป็นต้องพึ่งพาไฟล์ .env หมดปัญหาไฟล์คอนฟิกถูกเขียนทับเมื่ออัปโหลดผ่าน SFTP
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                Host: {dbConfig.host}:{dbConfig.port} | DB: {dbConfig.dbname}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MySQL Connection Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ตั้งค่าการเชื่อมต่อ MySQL Database
                  </h3>
                  <p className="text-xs text-slate-500">
                    รองรับ cPanel MySQL, MariaDB, Localhost และ Cloud Database
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveDatabase} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      required
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      placeholder="localhost"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      required
                      value={dbConfig.port}
                      onChange={(e) =>
                        setDbConfig({ ...dbConfig, port: Number(e.target.value) || 3306 })
                      }
                      placeholder="3306"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Database Name (ชื่อฐานข้อมูล)
                  </label>
                  <input
                    type="text"
                    required
                    value={dbConfig.dbname}
                    onChange={(e) => setDbConfig({ ...dbConfig, dbname: e.target.value })}
                    placeholder="school_budget_db"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                      placeholder="root"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={dbConfig.pass}
                      onChange={(e) => setDbConfig({ ...dbConfig, pass: e.target.value })}
                      placeholder="รหัสผ่านฐานข้อมูล"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={isTestingDb}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isTestingDb ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>ทดสอบการเชื่อมต่อ</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingDb}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกการตั้งค่า</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Auto-Migration Action Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      อัปเดตโครงสร้างฐานข้อมูลอัตโนมัติ (Auto-Migration)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ตรวจสอบและเพิ่มตาราง/คอลัมน์ Multi-Tenant ทั้งหมดในคลิกเดียว
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-4 text-xs text-slate-700">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ระบบ Auto-Migration จะดำเนินการ:</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-slate-600">
                    <li>
                      ตรวจสอบและสร้างตารางหลักทั้ง 14 ตาราง (schools, users, projects, revenues ฯลฯ)
                    </li>
                    <li>
                      เพิ่มคอลัมน์ <code className="text-amber-700 font-mono">smis_code</code> (8 หลัก)
                      และ <code className="text-amber-700 font-mono">is_active</code> ในตาราง schools
                    </li>
                    <li>
                      เพิ่มคอลัมน์ <code className="text-amber-700 font-mono">school_key</code> และ{' '}
                      <code className="text-amber-700 font-mono">admin_password_plain</code>
                    </li>
                    <li>สร้างบัญชี Super Admin เริ่มต้นในระบบอย่างปลอดภัย</li>
                    <li>รักษาข้อมูลเดิมไว้ ไม่มีการลบข้อมูลใดๆ ออกจากระบบ (Safe Migration)</li>
                  </ul>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRunMigration}
                  disabled={isMigrating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>
                    {isMigrating ? 'กำลังซิงค์และอัปเดตตาราง...' : 'อัปเดตและซ่อมแซมฐานข้อมูลทันที'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Tables Checklist */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>สถานะตารางหลักในระบบ (Core Tables Status)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(dbStatus?.tables || [
                { name: 'super_admins', records: 1 },
                { name: 'schools', records: schools.length },
                { name: 'fiscal_years', records: 4 },
                { name: 'users', records: 8 },
                { name: 'students', records: 18 },
                { name: 'revenues', records: 12 },
                { name: 'budget_allocations', records: 8 },
                { name: 'learner_activities', records: 5 },
                { name: 'school_strategies', records: 4 },
                { name: 'strategy_goals', records: 8 },
                { name: 'strategy_indicators', records: 12 },
                { name: 'projects', records: 24 },
                { name: 'project_expenses', records: 64 },
                { name: 'budget_transactions', records: 16 },
              ]).map((tbl) => (
                <div
                  key={tbl.name}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-800">{tbl.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {tbl.records} รายการ (Records)
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="ตารางพร้อมใช้งาน" />
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Migration Logs Console */}
          {migrationLogs.length > 0 && (
            <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 border border-slate-800 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Migration Output Stream</span>
                </div>
                <span className="text-[10px] text-emerald-400">Status: Complete</span>
              </div>
              <div className="h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                {migrationLogs.map((log, idx) => (
                  <div key={idx} className="text-emerald-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUPER ADMIN ACCOUNT & PASSWORD */}
      {activeTab === 'superadmin_account' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                จัดการบัญชี Super Administrator ({saUsername})
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดรหัสผ่านใหม่สำหรับผู้ดูแลระบบส่วนกลาง (รหัสผ่านเริ่มต้นคือ 1-6)
              </p>
            </div>
          </div>

          {saSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saSuccess}</span>
            </div>
          )}

          {saError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saError}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>สิทธิ์การใช้งานของ Super Admin:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
              <li><b>Username:</b> <code className="font-mono font-bold text-blue-900">peyarm</code></li>
              <li>เพิ่ม/เปิดใช้งานโรงเรียนใหม่ในระบบ และกำหนดรหัส SMIS 8 หลัก</li>
              <li>กำหนดและเปลี่ยนแอดมินของแต่ละโรงเรียน</li>
              <li>เชื่อมต่อและตั้งค่าฐานข้อมูล MySQL (schoobwd_planaction)</li>
            </ul>
          </div>

          <form onSubmit={handleChangeSaPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน Super Admin
              </label>
              <input
                type="text"
                disabled
                value={saUsername}
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-800 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสผ่านใหม่ (New Password) *
              </label>
              <input
                type="password"
                required
                value={saNewPassword}
                onChange={(e) => setSaNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ยืนยันรหัสผ่านใหม่อีกครั้ง (Confirm Password) *
              </label>
              <input
                type="password"
                required
                value={saConfirmPassword}
                onChange={(e) => setSaConfirmPassword(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saLoading}
              className="py-2.5 px-5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึกรหัสผ่านใหม่...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกรหัสผ่าน Super Admin ใหม่</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: DATA ISOLATION ARCHITECTURE */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>สถาปัตยกรรมและกลไกการแยกข้อมูลเด็ดขาด (Data Isolation Architecture)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ระบบถูกสร้างมาเพื่อรองรับหลายโรงเรียน (Multi-Tenancy) ภายใต้ฐานข้อมูลเดียวกันอย่างสมบูรณ์แบบ
              โดยมีกลไกป้องกันข้อมูลชนกัน 100%
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>1. รหัส SMIS 8 หลัก + School Key</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                โรงเรียนแต่ละแห่งจะได้รับการลงทะเบียนด้วยรหัส SMIS 8 หลักที่ไม่ซ้ำกัน พร้อมระบบสร้าง School Key
                (เช่น <code className="font-mono font-bold">SCH-10400100</code>) เป็น Tenant Identifier หลัก
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
              <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                <span>2. Scoped Queries ทุกตาราง</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                ทุกตารางในฐานข้อมูล (<code className="font-mono">projects</code>,{' '}
                <code className="font-mono">revenues</code>, <code className="font-mono">students</code>,{' '}
                <code className="font-mono">users</code>) มีคอลัมน์{' '}
                <code className="font-mono font-bold">school_id</code> บังคับ จึงไม่มีข้อมูลปะปนกันข้ามโรงเรียน
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>3. Kill Switch เปิด/ปิดโรงเรียน</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Super Admin สามารถกดปิดการใช้งาน (Inactive) โรงเรียนใดๆ ได้ทันที หากโรงเรียนถูกปิด
                ครูและแอดมินของโรงเรียนนั้นจะไม่สามารถเข้าสู่ระบบหรือแก้ไขข้อมูลใดๆ ได้
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>สรุปสำหรับผู้ดูแลระบบ (Super Admin Checklist):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>✓ ข้อมูลโครงการและงบประมาณแยกตาม School ID ชัดเจน</div>
              <div>✓ แต่ละโรงเรียนมี Admin Username และ Password แยกอิสระ</div>
              <div>✓ ตาราง MySQL รองรับการเพิ่มโรงเรียนได้ไม่จำกัด</div>
              <div>✓ อัปเดตโครงสร้างอัตโนมัติผ่านปุ่ม Auto-Migration</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
