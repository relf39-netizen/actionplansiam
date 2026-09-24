import React, { useState, useEffect } from 'react';
import { User, TEACHER_POSITIONS } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Edit,
  Trash2,
  Check,
  X,
  KeyRound,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  CreditCard,
  Building,
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onUpdateUsers: (updated: User[]) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onUpdateUsers,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'approved' | 'pending'>('approved');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal for approving a pending teacher with specific role & position
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState<'admin' | 'director' | 'teacher'>('teacher');
  const [selectedPositionForApproval, setSelectedPositionForApproval] = useState<string>('ครู');

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'teacher' as User['role'],
    position: 'ครู',
    password: '',
  });

  // Separate approved users and pending users
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status !== 'pending');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'teacher',
      position: 'ครู',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      position: u.position || 'ครู',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (id === currentUser.id) {
      alert('ไม่สามารถลบบัญชีผู้ใช้งานที่กำลังล็อกอินอยู่ได้');
      return;
    }
    if (confirm('ต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) {
      const updated = users.filter((u) => u.id !== id);
      onUpdateUsers(updated);
    }
  };

  // Open modal to approve pending teacher
  const handleStartApprove = (u: User) => {
    setApprovingUser(u);
    const validRole = (u.role === 'admin' || u.role === 'director') ? u.role : 'teacher';
    setSelectedRoleForApproval(validRole);
    setSelectedPositionForApproval(u.position || 'ครู');
  };

  // Submit approval
  const handleConfirmApprove = async () => {
    if (!approvingUser) return;
    try {
      // Call backend API
      await fetch('/api/school/approve-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: approvingUser.id,
          role: selectedRoleForApproval,
          position: selectedPositionForApproval,
        }),
      });
    } catch (e) {
      console.warn('Backend sync failed, updating local state:', e);
    }

    const updated = users.map((u) =>
      u.id === approvingUser.id
        ? {
            ...u,
            status: 'approved' as const,
            role: selectedRoleForApproval,
            position: selectedPositionForApproval,
            isActive: true,
          }
        : u
    );
    onUpdateUsers(updated);
    setActionSuccess(`อนุมัติคุณครู ${approvingUser.fullName} เรียบร้อยแล้ว`);
    setApprovingUser(null);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Reject a pending teacher
  const handleRejectTeacher = async (u: User) => {
    if (!confirm(`ต้องการปฏิเสธคำขอสมัครของ ${u.fullName} ใช่หรือไม่?`)) return;

    try {
      await fetch('/api/school/reject-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      });
    } catch (e) {
      console.warn('Backend reject sync error:', e);
    }

    const updated = users.filter((item) => item.id !== u.id);
    onUpdateUsers(updated);
    setActionSuccess(`ปฏิเสธคำขอสมัครของ ${u.fullName} เรียบร้อยแล้ว`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updated = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: formData.username,
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              role: formData.role,
              position: formData.position,
            }
          : u
      );
      onUpdateUsers(updated);
      setActionSuccess(`แก้ไขข้อมูลของ ${formData.fullName} เรียบร้อยแล้ว`);
    } else {
      const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      const newUser: User = {
        id: newId,
        schoolId: currentUser.schoolId || 1,
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        position: formData.position,
        isActive: true,
        status: 'approved',
      };
      onUpdateUsers([...users, newUser]);
      setActionSuccess(`เพิ่มผู้ใช้งาน ${formData.fullName} เรียบร้อยแล้ว`);
    }
    setIsModalOpen(false);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
            <span>ระบบผู้ใช้งานและอนุมัติคุณครู (User Management & Approvals)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แอดมินโรงเรียนสามารถอนุมัติคำขอสมัครของคุณครู และกำหนดสิทธิ์การใช้งานภายในโรงเรียน
          </p>
        </div>

        <button
          id="btn-add-user"
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>เพิ่มบุคลากรใหม่</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Role explanation boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-700"></span>
            <span>Administrator (ผู้ดูแลระบบโรงเรียน)</span>
          </div>
          <p className="text-[11px] text-blue-800 mt-1">
            อนุมัติคำขอสมัครของคุณครู จัดการข้อมูลโรงเรียน งบประมาณ และบริหารจัดการโครงการ
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600"></span>
            <span>ผู้อำนวยการโรงเรียน (Director)</span>
          </div>
          <p className="text-[11px] text-amber-900 mt-1">
            ดูภาพรวม Dashboard อนุมัติโครงการในแผนปฏิบัติการ และตรวจสอบรายงานราชการ
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            <span>ครู / ผู้รับผิดชอบโครงการ (Teacher)</span>
          </div>
          <p className="text-[11px] text-emerald-900 mt-1">
            เสนอโครงการ เขียนแผนด้วย AI เบิกจ่ายงบประมาณ และติดตามความก้าวหน้า
          </p>
        </div>
      </div>

      {/* Sub-tab selection: Approved Users vs Pending Approvals */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('approved')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeSubTab === 'approved'
              ? 'border-blue-900 text-blue-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-blue-700" />
          <span>บุคลากรที่ได้รับการอนุมัติแล้ว ({approvedUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pending')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeSubTab === 'pending'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>คำขอสมัครรอการอนุมัติ</span>
          {pendingUsers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: APPROVED USERS TABLE */}
      {activeSubTab === 'approved' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-12 text-center">ที่</th>
                  <th className="py-3 px-4 min-w-[150px]">ชื่อผู้ใช้ (เลขบัตร ปชช.)</th>
                  <th className="py-3 px-4 min-w-[200px]">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-4 min-w-[160px]">ตำแหน่ง</th>
                  <th className="py-3 px-4 w-40 text-center">ระดับสิทธิ์ (Role)</th>
                  <th className="py-3 px-4 min-w-[160px]">ติดต่อ</th>
                  <th className="py-3 px-4 w-24 text-center">สถานะ</th>
                  <th className="py-3 px-4 w-28 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvedUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {u.username}
                      {u.isPasswordChanged ? (
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-normal">● เปลี่ยนรหัสแล้ว</span>
                      ) : (
                        <span className="ml-1.5 text-[10px] text-amber-600 font-normal">● รหัสเริ่มต้น (1-6)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{u.position || 'ครู'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          u.role === 'admin'
                            ? 'bg-blue-100 text-blue-900'
                            : u.role === 'director'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {u.role === 'admin'
                          ? 'ผู้ดูแลระบบ (Admin)'
                          : u.role === 'director'
                          ? 'ผู้อำนวยการ'
                          : 'ครูผู้รับผิดชอบ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {u.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{u.phone}</div>}
                      {u.email && <div className="flex items-center gap-1 text-[11px]"><Mail className="w-3 h-3 text-slate-400" />{u.email}</div>}
                      {!u.phone && !u.email && '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        อนุมัติแล้ว
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูล / ปรับระดับสิทธิ์"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          disabled={u.id === currentUser.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.id === currentUser.id
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                          }`}
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PENDING APPROVAL REQUESTS */}
      {activeSubTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-sm text-slate-700">ไม่มีคำขอสมัครรอการอนุมัติในขณะนี้</p>
              <p className="text-xs text-slate-400 mt-0.5">คุณครูที่สมัครเข้าใช้งานด้วยรหัส SMIS 8 หลัก จะปรากฏที่นี่</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-amber-50/80 border-b border-amber-200 text-amber-950 font-bold">
                    <th className="py-3 px-4 w-12 text-center">ที่</th>
                    <th className="py-3 px-4 min-w-[150px]">เลขประจำตัวประชาชน (Username)</th>
                    <th className="py-3 px-4 min-w-[200px]">ชื่อ - นามสกุลคุณครู</th>
                    <th className="py-3 px-4 min-w-[160px]">ตำแหน่งที่สมัคร</th>
                    <th className="py-3 px-4 min-w-[160px]">ข้อมูลติดต่อ</th>
                    <th className="py-3 px-4 w-32 text-center">วันที่ยื่นคำขอ</th>
                    <th className="py-3 px-4 w-40 text-center">การอนุมัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{u.username}</td>
                      <td className="py-3 px-4 font-bold text-blue-900">{u.fullName}</td>
                      <td className="py-3 px-4 text-slate-700">{u.position || 'ครู'}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {u.phone && <div>{u.phone}</div>}
                        {u.email && <div className="text-[11px] text-slate-400">{u.email}</div>}
                        {!u.phone && !u.email && '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('th-TH') : 'ล่าสุด'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartApprove(u)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="อนุมัติและกำหนดสิทธิ์"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectTeacher(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                            title="ปฏิเสธคำขอ"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: APPROVE TEACHER & SET ROLE/POSITION */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>อนุมัติคำขอสมัครของคุณครู</span>
              </h3>
              <p className="text-xs text-blue-200 mt-1">
                กำหนดระดับสิทธิ์และตำแหน่งสำหรับ {approvingUser.fullName}
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div><b>ชื่อ - นามสกุล:</b> {approvingUser.fullName}</div>
                <div><b>เลขประจำตัวประชาชน (Username):</b> <span className="font-mono font-bold text-blue-900">{approvingUser.username}</span></div>
                <div><b>รหัสผ่านเริ่มต้น:</b> <span className="font-bold text-slate-800">1-6</span> (ระบบจะแจ้งให้เปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก)</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กำหนดระดับสิทธิ์ (Role) *
                </label>
                <select
                  value={selectedRoleForApproval}
                  onChange={(e) => setSelectedRoleForApproval(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="teacher">ครู / ผู้รับผิดชอบโครงการ (Teacher)</option>
                  <option value="admin">Administrator (ผู้ดูแลระบบโรงเรียน)</option>
                  <option value="director">ผู้อำนวยการโรงเรียน (Director)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กำหนดตำแหน่งทางการศึกษา *
                </label>
                <select
                  value={selectedPositionForApproval}
                  onChange={(e) => setSelectedPositionForApproval(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {TEACHER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  ยืนยันการอนุมัติคุณครู
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <span>{editingUser ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรเข้าสู่ระบบ'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้ (Username หรือ เลขบัตร ปชช. 13 หลัก) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {TEACHER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-800 bg-white"
                >
                  <option value="admin">Administrator (ผู้ดูแลระบบโรงเรียน)</option>
                  <option value="director">ผู้อำนวยการโรงเรียน (Director)</option>
                  <option value="teacher">ครู / ผู้รับผิดชอบโครงการ (Teacher)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
