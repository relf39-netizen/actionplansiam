import React, { useState, useEffect } from 'react';
import { User, School, TEACHER_POSITIONS } from '../types';
import {
  Lock,
  LogIn,
  UserPlus,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  CreditCard,
  Hash,
  Sparkles,
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: User, school?: School, isSuperAdmin?: boolean) => void;
  schools: School[];
  onOpenSuperAdminDirect?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  schools,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login state (NO DEMO PRESETS)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration state
  const [regSmis, setRegSmis] = useState('');
  const [matchedSchool, setMatchedSchool] = useState<School | null>(null);
  const [regCitizenId, setRegCitizenId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPosition, setRegPosition] = useState('ครู');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // First-time change password modal
  const [pendingChangeUser, setPendingChangeUser] = useState<{
    user: User;
    school?: School;
    isSuperAdmin?: boolean;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassLoading, setChangePassLoading] = useState(false);

  // Live lookup school by SMIS code
  useEffect(() => {
    const cleanSmis = regSmis.replace(/\D/g, '').slice(0, 8);
    if (cleanSmis.length === 8) {
      const found = schools.find((s) => s.smisCode === cleanSmis);
      setMatchedSchool(found || null);
    } else {
      setMatchedSchool(null);
    }
  }, [regSmis, schools]);

  // Safe JSON fetch helper
  const fetchSafe = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        console.warn('API returned non-JSON:', text);
        return { success: false, message: 'การตอบสนองจากเซิร์ฟเวอร์ไม่ถูกต้อง' };
      }
    } catch (e: any) {
      return { success: false, message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: ' + e.message };
    }
  };

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUser = loginUsername.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanUser) {
      setLoginError('กรุณากรอกชื่อผู้ใช้งาน หรือ เลขประจำตัวประชาชน 13 หลัก');
      return;
    }
    if (!cleanPass) {
      setLoginError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoginLoading(true);

    try {
      const data = await fetchSafe('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      if (data.success && data.user) {
        // If first login and needs to change password
        if (data.mustChangePassword) {
          setPendingChangeUser({
            user: data.user,
            school: data.school,
            isSuperAdmin: Boolean(data.isSuperAdmin),
          });
          setLoginLoading(false);
          return;
        }

        onLoginSuccess(data.user, data.school, Boolean(data.isSuperAdmin));
      } else {
        setLoginError(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: any) {
      setLoginError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMessage(null);

    const cleanSmis = regSmis.replace(/\D/g, '').slice(0, 8);
    const cleanCitizenId = regCitizenId.replace(/\D/g, '').slice(0, 13);
    const cleanFullName = regFullName.trim();

    if (cleanSmis.length !== 8) {
      setRegError('รหัสสถานศึกษา SMIS ต้องเป็นตัวเลข 8 หลักพอดี');
      return;
    }
    if (!matchedSchool) {
      setRegError(`ไม่พบโรงเรียนที่มีรหัส SMIS "${cleanSmis}" ในระบบ กรุณาติดต่อผู้ดูแลระบบส่วนกลาง (Super Admin) เพื่อเพิ่มโรงเรียนก่อน`);
      return;
    }
    if (cleanCitizenId.length !== 13) {
      setRegError('เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลักพอดี');
      return;
    }
    if (!cleanFullName) {
      setRegError('กรุณาระบุชื่อ-นามสกุล (พร้อมคำนำหน้าชื่อ)');
      return;
    }

    setRegLoading(true);

    try {
      const data = await fetchSafe('/api/auth/register-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smisCode: cleanSmis,
          citizenId: cleanCitizenId,
          fullName: cleanFullName,
          position: regPosition,
          phone: regPhone.trim(),
          email: regEmail.trim(),
        }),
      });

      if (data.success) {
        setRegSuccessMessage(data.message);
        // Reset form
        setRegSmis('');
        setRegCitizenId('');
        setRegFullName('');
        setRegPhone('');
        setRegEmail('');
        setMatchedSchool(null);
      } else {
        setRegError(data.message || 'ไม่สามารถสมัครเข้าใช้งานได้');
      }
    } catch (err: any) {
      setRegError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // Handle First-Time Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    if (newPassword.length < 4) {
      setChangePassError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!pendingChangeUser) return;
    setChangePassLoading(true);

    try {
      const url = pendingChangeUser.isSuperAdmin
        ? '/api/auth/super-admin/change-password'
        : '/api/auth/change-password';

      const data = await fetchSafe(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingChangeUser.user.id,
          newPassword: newPassword.trim(),
        }),
      });

      if (data.success) {
        const updatedUser = {
          ...pendingChangeUser.user,
          isPasswordChanged: true,
        };
        onLoginSuccess(updatedUser, pendingChangeUser.school, pendingChangeUser.isSuperAdmin);
      } else {
        setChangePassError(data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch (err: any) {
      setChangePassError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setChangePassLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-center text-white relative">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl shadow-lg mb-3">
            สพฐ
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            ระบบแผนปฏิบัติการและงบประมาณ
          </h1>
          <p className="text-xs text-blue-200/90 mt-1 font-medium">
            สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (ระบบงานจริง)
          </p>

          {/* Tab Switcher: Login vs Register */}
          <div className="mt-6 flex rounded-xl bg-blue-950/70 p-1 border border-blue-800/60">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegError(null);
                setRegSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>สมัครเข้าใช้งานคุณครู</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8">
          {/* TAB 1: LOGIN (NO DEMO BUTTONS) */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-xs text-slate-500 text-center pb-1">
                เข้าสู่ระบบด้วยเลขประจำตัวประชาชน 13 หลัก (คุณครู) หรือ บัญชี Super Admin
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">{loginError}</div>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>ชื่อผู้ใช้งาน / เลขประจำตัวประชาชน 13 หลัก</span>
                  <span className="text-[11px] font-normal text-slate-500">Username</span>
                </label>
                <div className="relative">
                  <input
                    id="input-login-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="peyarm หรือ เลขบัตรประชาชน 13 หลัก"
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all pl-10"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>รหัสผ่าน</span>
                  <span className="text-[11px] font-normal text-slate-500">Password</span>
                </label>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all pl-10 pr-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showLoginPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 p-3.5 text-sm font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังตรวจสอบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>เข้าสู่ระบบปฏิบัติงาน</span>
                  </>
                )}
              </button>

              {/* Guidance Info (Clean, strictly no mock demo buttons) */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                    <span>คำแนะนำการใช้งานระบบ:</span>
                  </div>
                  <div>• <b>คุณครูและบุคลากร:</b> สมัครเข้าใช้งานด้วยรหัสสถานศึกษา SMIS 8 หลัก และใช้เลขประจำตัวประชาชน 13 หลักเป็น Username</div>
                  <div>• <b>Super Admin:</b> บัญชีผู้ดูแลระบบส่วนกลาง (<code className="bg-amber-100 text-amber-900 px-1 rounded font-bold">peyarm</code>) สำหรับบริหารจัดการสถานศึกษาและฐานข้อมูล</div>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setRegError(null);
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                  >
                    ยังไม่มีบัญชีผู้ใช้? คลิกที่นี่เพื่อลงทะเบียนคุณครูใหม่
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER TEACHER (SMIS 8 DIGITS + CITIZEN ID) */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-xs text-slate-500 text-center pb-1">
                สำหรับคุณครูและบุคลากรทางการศึกษาเพื่อสมัครเข้าใช้งานโรงเรียนในสังกัด
              </div>

              {regSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>สมัครเข้าใช้งานสำเร็จ!</span>
                  </div>
                  <p>{regSuccessMessage}</p>
                  <div className="p-2.5 rounded-lg bg-white/70 border border-emerald-200 text-[11px]">
                    <b>ข้อควรทราบ:</b> บัญชีของคุณอยู่ระหว่างรอแอดมินของโรงเรียนอนุมัติการใช้งาน เมื่อแอดมินอนุมัติแล้ว จะสามารถเข้าสู่ระบบด้วยเลขประจำตัวประชาชน 13 หลักได้ทันที
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginUsername(regCitizenId);
                      setRegSuccessMessage(null);
                    }}
                    className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    กลับสู่หน้าเข้าสู่ระบบ
                  </button>
                </div>
              )}

              {regError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">{regError}</div>
                </div>
              )}

              {/* SMIS Code Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>รหัสสถานศึกษา SMIS (8 หลัก) *</span>
                  <span className="text-[11px] font-normal text-slate-500">ตรวจสอบโรงเรียน</span>
                </label>
                <div className="relative">
                  <input
                    id="input-reg-smis"
                    type="text"
                    required
                    maxLength={8}
                    value={regSmis}
                    onChange={(e) => setRegSmis(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="เช่น 10000001"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold tracking-wide pl-10 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                {/* Live School Match Feedback */}
                {regSmis.length === 8 && (
                  <div className="mt-1.5">
                    {matchedSchool ? (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <b>{matchedSchool.name}</b>
                          <div className="text-[11px] text-emerald-700">
                            {matchedSchool.educationArea || matchedSchool.province}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>ไม่พบโรงเรียนรหัส SMIS {regSmis} ในระบบ (กรุณาให้ Super Admin เพิ่มโรงเรียนก่อน)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Citizen ID Input (Username) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>เลขประจำตัวประชาชน 13 หลัก (ใช้เป็น Username) *</span>
                  <span className="text-[11px] font-normal text-slate-500">13 หลัก</span>
                </label>
                <div className="relative">
                  <input
                    id="input-reg-citizen-id"
                    type="text"
                    required
                    maxLength={13}
                    value={regCitizenId}
                    onChange={(e) => setRegCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    placeholder="เช่น 1100000000001"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold tracking-wider pl-10 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Full Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำนำหน้า ชื่อ - สกุล ของคุณครู *
                </label>
                <input
                  id="input-reg-full-name"
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="เช่น นายสมเกียรติ รักการสอน"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Position Dropdown (8 Standard Positions) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่ง (Position) *
                </label>
                <select
                  id="select-reg-position"
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {TEACHER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone & Email (Row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    id="input-reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    id="input-reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@school.ac.th"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Policy note */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                  <span>ข้อกำหนดความปลอดภัย:</span>
                </div>
                <div>• เมื่อได้รับการอนุมัติจากแอดมินโรงเรียนและเข้าสู่ระบบครั้งแรก ระบบจะแจ้งให้ท่านตั้งรหัสผ่านใหม่ทันทีเพื่อความปลอดภัย</div>
              </div>

              {/* Submit Registration Button */}
              <button
                id="btn-register-submit"
                type="submit"
                disabled={regLoading || !matchedSchool}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 p-3.5 text-sm font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {regLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึกข้อมูลการสมัคร...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>ยืนยันการสมัครเข้าใช้งาน</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setRegError(null);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  มีบัญชีอยู่แล้ว? กลับสู่หน้าเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* MODAL: MANDATORY FIRST-TIME PASSWORD CHANGE */}
      {pendingChangeUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              กรุณาเปลี่ยนรหัสผ่านสำหรับการใช้งานครั้งแรก
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              เพื่อความปลอดภัยของข้อมูลบัญชีผู้ใช้งาน "{pendingChangeUser.user.fullName}" กรุณากำหนดรหัสผ่านส่วนตัวใหม่
            </p>

            {changePassError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร) *
                </label>
                <input
                  id="input-new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง *
                </label>
                <input
                  id="input-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <button
                id="btn-submit-change-password"
                type="submit"
                disabled={changePassLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 p-3 text-sm font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {changePassLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึกรหัสผ่านใหม่...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>บันทึกรหัสผ่านใหม่และเริ่มใช้งาน</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
