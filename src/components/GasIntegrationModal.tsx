import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sheet,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Link,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  Save
} from 'lucide-react';
import {
  School,
  FiscalYear,
  User,
  StudentLevel,
  RevenueItem,
  BudgetAllocation,
  LearnerActivity,
  Project,
  BudgetTransaction,
  Strategy
} from '../types';
import {
  getStoredGasConfig,
  saveStoredGasConfig,
  pingGasWebApp,
  pushDataToGoogleSheets,
  initGoogleSheetsDatabase,
  GasConfig
} from '../utils/gasIntegration';

interface GasIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  currentUser: User;
  fiscalYears: FiscalYear[];
  users: User[];
  students: StudentLevel[];
  revenues: RevenueItem[];
  allocations: BudgetAllocation[];
  activities: LearnerActivity[];
  projects: Project[];
  transactions: BudgetTransaction[];
  strategies: Strategy[];
}

export const GasIntegrationModal: React.FC<GasIntegrationModalProps> = ({
  isOpen,
  onClose,
  school,
  currentUser,
  fiscalYears,
  users,
  students,
  revenues,
  allocations,
  activities,
  projects,
  transactions,
  strategies,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'code' | 'guide' | 'photos'>('connect');
  const [gasCode, setGasCode] = useState<string>('');
  const [photoCode, setPhotoCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFolderId, setPhotoFolderId] = useState('');
  const [photoSecret, setPhotoSecret] = useState('');
  const [photoStatus, setPhotoStatus] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const canConfigurePhotos = currentUser.role === 'admin' || currentUser.role === 'director';
  useEffect(() => {
    if (!isOpen) { setPhotoSecret(''); return; }
    void fetch('/api/project-photos/code').then(r => r.json()).then(result => { if (result.success) setPhotoCode(result.code); }).catch(() => setPhotoStatus('โหลดโค้ดไม่สำเร็จ'));
    if (canConfigurePhotos) void fetch(`/api/project-photo-settings?schoolId=${school.id}`).then(r => r.json()).then(result => {
      if (result.success) { setPhotoUrl(result.webAppUrl || ''); setPhotoFolderId(result.folderId || ''); setPhotoStatus(result.configured ? 'โรงเรียนนี้ตั้งค่า Drive แล้ว' : 'ยังไม่ได้ตั้งค่า Drive ของโรงเรียนนี้'); }
      else setPhotoStatus(result.message || 'อ่านการตั้งค่าไม่สำเร็จ');
    }).catch(() => setPhotoStatus('อ่านการตั้งค่าไม่สำเร็จ'));
  }, [isOpen, school.id, canConfigurePhotos]);
  const savePhotoIntegration = async () => {
    setPhotoBusy(true); setPhotoStatus('');
    try {
      const response = await fetch('/api/project-photo-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, folderId: photoFolderId.trim(), webAppUrl: photoUrl.trim(), bridgeSecret: photoSecret.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'บันทึกไม่สำเร็จ');
      setPhotoSecret(''); setPhotoStatus(`บันทึกการเชื่อมต่อของ ${school.name} แล้ว`);
    } catch (error) { setPhotoStatus(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); }
    finally { setPhotoBusy(false); }
  };
  const [loadingCode, setLoadingCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Connection settings
  const [config, setConfig] = useState<GasConfig>(getStoredGasConfig());
  const [webAppUrlInput, setWebAppUrlInput] = useState<string>(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; spreadsheetUrl?: string } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInitializingSheets, setIsInitializingSheets] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchGasCode();
      const currentConfig = getStoredGasConfig();
      setConfig(currentConfig);
      setWebAppUrlInput(currentConfig.webAppUrl || '');
    }
  }, [isOpen]);

  const fetchGasCode = async () => {
    setLoadingCode(true);
    try {
      const res = await fetch('/api/gas/code');
      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          setGasCode(data.code);
        }
      }
    } catch (e) {
      console.error('Failed to load Code.gs', e);
    } finally {
      setLoadingCode(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!gasCode) return;
    navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadGasFile = () => {
    const blob = new Blob([gasCode], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webAppUrlInput.trim()) {
      setTestResult({ success: false, message: 'กรุณาระบุ URL ของ Google Apps Script Web App' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const ping = await pingGasWebApp(webAppUrlInput.trim());
    setIsTesting(false);

    if (ping.success) {
      const updatedConfig: GasConfig = {
        ...config,
        webAppUrl: webAppUrlInput.trim(),
        status: 'connected',
        lastSyncTime: new Date().toLocaleTimeString('th-TH'),
        spreadsheetUrl: ping.spreadsheetUrl,
      };
      setConfig(updatedConfig);
      saveStoredGasConfig(updatedConfig);
      setTestResult({
        success: true,
        message: ping.message || 'เชื่อมต่อกับ Google Apps Script Web App สำเร็จ!',
        spreadsheetUrl: ping.spreadsheetUrl,
      });
    } else {
      const updatedConfig: GasConfig = {
        ...config,
        webAppUrl: webAppUrlInput.trim(),
        status: 'error',
        errorMessage: ping.error,
      };
      setConfig(updatedConfig);
      saveStoredGasConfig(updatedConfig);
      setTestResult({
        success: false,
        message: ping.error || 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL และสิทธิ์การเข้าถึง (Anyone)',
      });
    }
  };

  const handleSyncNow = async () => {
    const targetUrl = webAppUrlInput.trim() || config.webAppUrl;
    if (!targetUrl) {
      alert('กรุณาระบุ Google Apps Script Web App URL ก่อน');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    const res = await pushDataToGoogleSheets(targetUrl, {
      school,
      fiscalYears,
      users,
      students,
      revenues,
      allocations,
      activities,
      projects,
      transactions,
      strategies,
    });

    setIsSyncing(false);
    if (res.success) {
      const updated = {
        ...config,
        lastSyncTime: new Date().toLocaleTimeString('th-TH'),
        status: 'connected' as const,
      };
      setConfig(updated);
      saveStoredGasConfig(updated);
      setSyncResult({
        success: true,
        message: 'ซิงค์ข้อมูลทั้งหมดขึ้น Google Sheets สำเร็จเรียบร้อย!',
      });
      setTimeout(() => setSyncResult(null), 5000);
    } else {
      setSyncResult({
        success: false,
        message: res.error || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
      });
    }
  };

  const handleInitSheets = async () => {
    const targetUrl = webAppUrlInput.trim() || config.webAppUrl;
    if (!targetUrl) {
      alert('กรุณาระบุ Google Apps Script Web App URL ก่อน');
      return;
    }

    if (!confirm('ต้องการสร้าง/รีเซ็ตหัวตารางทุก Sheet ใน Google Spreadsheet หรือไม่?')) {
      return;
    }

    setIsInitializingSheets(true);
    const res = await initGoogleSheetsDatabase(targetUrl);
    setIsInitializingSheets(false);

    if (res.success) {
      alert(res.message || 'เตรียมโครงสร้าง Google Sheets เรียบร้อย');
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการสร้าง Sheets');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 text-white border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md text-sm">
              GAS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  ศูนย์เชื่อมต่อ Google Apps Script
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-blue-200">
                รองรับการทำงานกับ Google AI Studio, Google Sheets Database และ Gemini 2.5/3.8 Flash
              </p>
            </div>
          </div>

          <button
            id="btn-close-gas-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'connect'
                ? 'border-blue-700 text-blue-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link className="h-4 w-4" />
            <span>1. เชื่อมต่อ Web App & ซิงค์ข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'code'
                ? 'border-blue-700 text-blue-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>2. ดูโค้ด Code.gs (Apps Script)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-blue-700 text-blue-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>3. ขั้นตอนการติดตั้งบน Google Drive</span>
          </button>
          <button type="button" onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 ${activeTab === 'photos' ? 'border-blue-700 bg-white font-bold text-blue-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            <UploadCloud className="h-4 w-4" /> ภาพโครงการ → Drive โรงเรียน
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'photos' && <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-bold text-blue-950">ภาพกิจกรรมของ {school.name}</h4>
              <p className="mt-1 text-xs">แต่ละโรงเรียนต้องสร้าง Apps Script และเลือกโฟลเดอร์ใน Google Drive ของตนเอง การตั้งค่าของโรงเรียนอื่นจะไม่ถูกนำมาใช้</p>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed">
              <li>สร้างโฟลเดอร์ภาพกิจกรรมใน Drive ของโรงเรียน แล้วคัดลอก Folder ID จาก URL</li>
              <li>เปิด <a href="https://script.google.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Google Apps Script</a> ของโรงเรียน สร้างโปรเจ็กต์ใหม่ แล้ววางโค้ดด้านล่างใน Code.gs</li>
              <li>Project Settings → Script Properties: ตั้ง ROOT_FOLDER_ID เป็น Folder ID และ BRIDGE_SECRET เป็นรหัสสุ่มของโรงเรียนอย่างน้อย 32 ตัวอักษร</li>
              <li>Deploy → New deployment → Web app → Execute as Me → Anyone แล้วคัดลอก URL /exec มาใส่ด้านล่าง</li>
            </ol>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong>โค้ด ProjectPhotos.gs</strong><div className="flex gap-2"><button type="button" disabled={!photoCode} onClick={() => void navigator.clipboard.writeText(photoCode)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">คัดลอกโค้ด</button><button type="button" disabled={!photoCode} onClick={() => { const url = URL.createObjectURL(new Blob([photoCode], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'ProjectPhotos.gs'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="rounded-lg border px-3 py-1.5 text-xs">ดาวน์โหลด .gs</button></div></div>
              <pre className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">{photoCode || 'กำลังโหลดโค้ด...'}</pre>
            </div>
            {canConfigurePhotos ? <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
              <label className="text-xs font-bold">Folder ID ของโรงเรียน<input value={photoFolderId} onChange={e => setPhotoFolderId(e.target.value)} placeholder="ID หลัง /folders/ ใน URL" className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label>
              <label className="text-xs font-bold">URL Web App ของโรงเรียน (ลงท้าย /exec)<input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label>
              <label className="text-xs font-bold">BRIDGE_SECRET ของโรงเรียน (เว้นว่างเพื่อคงรหัสเดิม)<input type="password" autoComplete="new-password" value={photoSecret} onChange={e => setPhotoSecret(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPhotoSecret(Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join(''))} className="rounded-lg border px-3 py-2 text-xs">สร้างรหัสสุ่ม</button>
                <button type="button" disabled={!photoSecret} onClick={() => void navigator.clipboard.writeText(photoSecret)} className="rounded-lg border px-3 py-2 text-xs">คัดลอกรหัสไปใส่ Script Properties</button>
                <button type="button" disabled={photoBusy} onClick={() => void savePhotoIntegration()} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">บันทึกการเชื่อมต่อโรงเรียนนี้</button></div>
              {photoStatus && <p role="status" className="text-xs text-blue-900">{photoStatus}</p>}
            </div> : <p className="rounded-lg bg-amber-50 p-3 text-xs">ผู้ดูแลระบบหรือผู้อำนวยการโรงเรียนเป็นผู้บันทึกการเชื่อมต่อ Drive</p>}
          </div>}

          {/* TAB 1: CONNECT & SYNC */}
          {activeTab === 'connect' && (
            <div className="space-y-6">
              {/* Status Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                    config.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {config.status === 'connected' ? <CheckCircle2 className="h-5 w-5" /> : <Link className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">สถานะการเชื่อมต่อ</div>
                    <div className="text-sm font-bold text-slate-900">
                      {config.status === 'connected' ? 'เชื่อมต่อออนไลน์' : 'ยังไม่ได้เชื่อมต่อ'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Sheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">ฐานข้อมูลเป้าหมาย</div>
                    <div className="text-sm font-bold text-slate-900">Google Spreadsheet</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">AI Engine</div>
                    <div className="text-sm font-bold text-slate-900">Gemini 2.5 / 3.8 Flash</div>
                  </div>
                </div>
              </div>

              {/* URL Config Form */}
              <form onSubmit={handleTestConnection} className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-blue-700" />
                  <h4 className="text-sm font-bold text-slate-900">ระบุ URL เว็บแอป (Google Apps Script Web App URL)</h4>
                </div>

                <p className="text-xs text-slate-600">
                  URL ที่ได้จากการกด <strong>Deploy (ทำให้ใช้งานได้)</strong> &gt; <strong>Web app (เว็บแอป)</strong> ใน Google Apps Script Editor
                </p>

                <div className="space-y-2">
                  <input
                    id="input-gas-webapp-url"
                    type="url"
                    required
                    value={webAppUrlInput}
                    onChange={(e) => setWebAppUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    id="btn-test-gas-connection"
                    type="submit"
                    disabled={isTesting}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                  </button>

                  <button
                    id="btn-sync-to-google-sheets"
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    <span>{isSyncing ? 'กำลังส่งข้อมูล...' : 'ซิงค์ข้อมูลขึ้น Google Sheets ทันที'}</span>
                  </button>

                  <button
                    id="btn-init-sheets-schema"
                    type="button"
                    onClick={handleInitSheets}
                    disabled={isInitializingSheets}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Database className="h-4 w-4 text-slate-500" />
                    <span>สร้างตาราง Sheets ทั้งหมด</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{testResult.message}</div>
                      {testResult.spreadsheetUrl && (
                        <a
                          href={testResult.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 underline mt-1 hover:text-blue-900"
                        >
                          <span>เปิดดู Google Spreadsheet ของคุณ</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {syncResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    syncResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {syncResult.success ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                    <span>{syncResult.message}</span>
                  </div>
                )}
              </form>

              {/* Data Summary to Sync */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-700" />
                  <span>ข้อมูลที่จะถูกซิงค์ไปยัง Google Sheets:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">โรงเรียน & ผอ.</div>
                    <div className="font-bold text-slate-800 truncate">{school.name}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">โครงการทั้งหมด</div>
                    <div className="font-bold text-slate-800">{projects.length} โครงการ</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">กลุ่มงานที่จัดสรร</div>
                    <div className="font-bold text-slate-800">{allocations.length} กลุ่มงาน</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">รายการเบิกจ่าย</div>
                    <div className="font-bold text-slate-800">{transactions.length} รายการ</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE VIEWER */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-100 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-indigo-700" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">ไฟล์ Code.gs (สำหรับใส่ใน Google Apps Script Editor)</div>
                    <div className="text-[11px] text-slate-500">โค้ดสมบูรณ์พร้อม API จัดการข้อมูลและระบบเขียนโครงการด้วย Gemini AI</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-copy-gas-code"
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'คัดลอกเรียบร้อย!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                  </button>

                  <button
                    id="btn-download-gas-code"
                    type="button"
                    onClick={handleDownloadGasFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>ดาวน์โหลดไฟล์ Code.gs</span>
                  </button>
                </div>
              </div>

              {loadingCode ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-700 mr-2" />
                  กำลังโหลดไฟล์ Code.gs...
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[460px] custom-scrollbar leading-relaxed">
                    {gasCode}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h4 className="font-bold text-sm text-blue-950 mb-1 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-700" />
                  <span>คู่มือการติดตั้ง Google Apps Script (Code.gs) สเต็ปต่อสเต็ป</span>
                </h4>
                <p className="text-slate-600">
                  ทำตามขั้นตอน 5 นาทีนี้เพื่อเปลี่ยน Google Spreadsheet ส่วนตัวของคุณให้กลายเป็นเซิร์ฟเวอร์ฐานข้อมูลเต็มรูปแบบ:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>สร้าง Google Spreadsheet ใหม่</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    เปิด Google Drive แล้วสร้าง Google Sheets ใหม่ ตั้งชื่อว่า <strong>"ระบบแผนปฏิบัติการและงบประมาณโรงเรียน"</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>เปิด Apps Script Editor</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    ในเมนูด้านบนของ Google Sheets คลิกที่ <strong>"ส่วนขยาย" (Extensions) &gt; "Apps Script"</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>วางโค้ด Code.gs</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    ลบโค้ดเดิมทั้งหมดในไฟล์ <code>Code.gs</code> แล้วกดปุ่ม <strong>"คัดลอกโค้ดทั้งหมด"</strong> จากแท็บที่ 2 มาวาง แล้วกดไอคอน Save (บันทึก)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>ตั้งค่า Gemini API Key (ทางเลือกเพื่อใช้ AI ในชีต)</span>
                  </div>
                  <p className="text-slate-600 pl-7">
                    ไปที่ <strong>Project Settings (รูปเฟืองด้านซ้าย) &gt; Script Properties (คุณสมบัติของสคริปต์)</strong> &gt; เพิ่ม Property: <code>GEMINI_API_KEY</code> แล้วใส่คีย์ของคุณ
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">5</span>
                    <span>Deploy เป็น Web App</span>
                  </div>
                  <div className="text-slate-600 pl-7 space-y-1">
                    <p>คลิกปุ่ม <strong>"ทำให้ใช้งานได้" (Deploy) &gt; "การทำให้ใช้งานได้รายการใหม่" (New deployment)</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      <li>ประเภท: <strong>เว็บแอป (Web app)</strong></li>
                      <li>ดำเนินการในฐานะ (Execute as): <strong>ฉัน (Me)</strong></li>
                      <li>ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong>ทุกคน (Anyone)</strong></li>
                    </ul>
                    <p className="text-indigo-700 font-semibold pt-1">
                      คัดลอก Web app URL ที่ได้ นำมาใส่ในช่องของแท็บที่ 1 แล้วกด "ทดสอบการเชื่อมต่อ" เป็นอันเสร็จสิ้น!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <div className="text-[11px] text-slate-500">
            ระบบรองรับ Google Apps Script V8 Runtime & Google Sheets API
          </div>
          <button
            id="btn-footer-close-gas-modal"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
