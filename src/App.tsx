import React, { useState, useEffect } from 'react';
import {
  initialSchoolData,
  initialFiscalYears,
  initialUsers,
  initialStudentsData,
  initialRevenuesData,
  initialBudgetAllocations,
  initialLearnerActivities,
  initialProjectsData,
  initialTransactions,
  initialStrategies,
} from './data/initialData';
import {
  School,
  FiscalYear,
  User,
  StudentLevel,
  RevenueItem,
  BudgetAllocation,
  BudgetSettings,
  LearnerActivity,
  Project,
  BudgetTransaction,
  Strategy,
} from './types';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SchoolInfoView } from './components/SchoolInfoView';
import { StudentDataView } from './components/StudentDataView';
import { RevenueView } from './components/RevenueView';
import { BudgetAllocationView } from './components/BudgetAllocationView';
import { LearnerActivitiesView } from './components/LearnerActivitiesView';
import { AiProjectWriterView } from './components/AiProjectWriterView';
import { ProjectsView } from './components/ProjectsView';
import { ProjectExpensesView } from './components/ProjectExpensesView';
import { DisbursementsView } from './components/DisbursementsView';
import { ActionPlanView } from './components/ActionPlanView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';
import { SuperAdminView } from './components/SuperAdminView';
import { BudgetCutView } from './components/BudgetCutView';
import { GasIntegrationModal } from './components/GasIntegrationModal';
import { AuthView } from './components/AuthView';
import { Lock, LogIn, Building2, Sparkles, Database, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  // App state
  const [school, setSchool] = useState<School>(initialSchoolData);
  const [allSchools, setAllSchools] = useState<School[]>([initialSchoolData]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(initialFiscalYears);
  const [activeFiscalYear, setActiveFiscalYear] = useState<FiscalYear>(
    initialFiscalYears.find((fy) => fy.isActive) || initialFiscalYears[0]
  );
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]); // default admin
  const [students, setStudents] = useState<StudentLevel[]>(initialStudentsData);
  const [revenues, setRevenues] = useState<RevenueItem[]>(initialRevenuesData);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>(initialBudgetAllocations);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({ carryover: 0, manualTotal: null });
  const [activities, setActivities] = useState<LearnerActivity[]>(initialLearnerActivities);
  const [activitiesInitialized, setActivitiesInitialized] = useState(false);
  const [projects, setProjects] = useState<Project[]>(initialProjectsData);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>(initialTransactions);
  const [strategies, setStrategies] = useState<Strategy[]>(initialStrategies);

  // DB Status
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedProjectIdForExpenses, setSelectedProjectIdForExpenses] = useState<number | undefined>(undefined);

  // Initial load from real MySQL
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 1. Get database status
        const dbRes = await fetch('/api/super-admin/db-status');
        if (dbRes.ok) {
          const text = await dbRes.text();
          try {
            const dbData = JSON.parse(text);
            setDbStatus(dbData);
          } catch (e) {}
        }

        // 2. Load all registered schools directly from MySQL
        try {
          const schRes = await fetch('/api/super-admin/schools');
          if (schRes.ok) {
            const schJson = await schRes.json();
            if (schJson.success && Array.isArray(schJson.schools)) {
              setAllSchools(schJson.schools);
              if (schJson.schools.length > 0) {
                setSchool((prev) => {
                  const found = schJson.schools.find((s: School) => s.id === prev.id);
                  return found || schJson.schools[0];
                });
              }
            }
          }
        } catch (e) {}

        // 3. Load stored application data from MySQL
        const savedSession = JSON.parse(localStorage.getItem('school_current_user') || 'null');
        const appRes = await fetch(savedSession?.schoolId ? `/api/database?school_id=${savedSession.schoolId}` : '/api/database');
        if (appRes.ok) {
          const text = await appRes.text();
          try {
            const appJson = JSON.parse(text);
            if (appJson.success && appJson.data) {
              const d = appJson.data;
              if (d.school) setSchool(d.school);
              if (Array.isArray(d.fiscalYears)) {
                setFiscalYears(d.fiscalYears);
                const active = d.fiscalYears.find((fy: FiscalYear) => fy.isActive) || d.fiscalYears[0];
                if (active) setActiveFiscalYear(active);
              }
              if (d.activeFiscalYear) setActiveFiscalYear(d.activeFiscalYear);
              if (Array.isArray(d.users)) setUsers(d.users);
              if (Array.isArray(d.students)) setStudents(d.students);
              if (Array.isArray(d.revenues)) setRevenues(d.revenues);
              if (Array.isArray(d.allocations)) setAllocations(d.allocations);
              setBudgetSettings(d.budgetSettings || { carryover: 0, manualTotal: null });
              if (Array.isArray(d.activities)) setActivities(d.activities);
              setActivitiesInitialized(d.activitiesInitialized === true);
              if (Array.isArray(d.projects)) setProjects(d.projects);
              if (Array.isArray(d.transactions)) setTransactions(d.transactions);
              if (Array.isArray(d.strategies)) setStrategies(d.strategies);
            }
          } catch (e) {}
        }

        // 4. Restore user session if stored
        try {
          const savedUser = localStorage.getItem('school_current_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.id) {
              setCurrentUser(parsedUser);
            }
          }
        } catch (e) {}
      } catch (err) {
        console.error('Error fetching initial database state:', err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchInitialData();
  }, []);

  // Helper to persist data to server / MySQL
  const persistToServer = async (overrides: Record<string, any> = {}): Promise<boolean> => {
    try {
      const payload = overrides;

      const targetSchoolId = payload.school?.id || currentUser.schoolId || school.id;
      const res = await fetch(`/api/database?school_id=${targetSchoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const errorData = await res.json().catch(() => ({}));
      if (!res.ok || errorData.success !== true) {
        setSaveError(errorData.message || 'บันทึกข้อมูลลง MySQL ไม่สำเร็จ');
        return false;
      } else {
        setSaveError(null);
        return true;
      }
    } catch (err) {
      setSaveError('ติดต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลไม่ได้');
      return false;
    }
  };

  // Auth screen state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('school_logged_in') === 'true';
  });

  // Handle Auth Success from AuthView
  const handleAuthSuccess = async (user: User, loggedSchool?: School, isSuperAdmin?: boolean) => {
    setCurrentUser(user);
    if (loggedSchool) {
      setSchool(loggedSchool);
    }
    setIsLoggedIn(true);
    localStorage.setItem('school_logged_in', 'true');
    localStorage.setItem('school_current_user', JSON.stringify(user));
    if (isSuperAdmin) {
      setActiveTab('super_admin');
    } else if (user.schoolId) {
      try {
        const res = await fetch(`/api/database?school_id=${user.schoolId}`);
        const result = await res.json();
        if (res.ok && result.success && result.data) {
          const d = result.data;
          if (d.school) setSchool(d.school);
          if (Array.isArray(d.students)) setStudents(d.students);
          if (Array.isArray(d.revenues)) setRevenues(d.revenues);
          if (Array.isArray(d.allocations)) setAllocations(d.allocations);
          setBudgetSettings(d.budgetSettings || { carryover: 0, manualTotal: null });
          if (Array.isArray(d.activities)) setActivities(d.activities);
          setActivitiesInitialized(d.activitiesInitialized === true);
          if (Array.isArray(d.fiscalYears)) {
            setFiscalYears(d.fiscalYears);
            const active = d.fiscalYears.find((fy: FiscalYear) => fy.isActive) || d.fiscalYears[0];
            if (active) setActiveFiscalYear(active);
          }
        }
      } catch (e) {
        setSaveError('ไม่สามารถโหลดข้อมูลของโรงเรียนจาก MySQL ได้');
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem('school_logged_in');
    localStorage.removeItem('school_current_user');
    setIsLoggedIn(false);
  };

  // Total student count
  const totalStudents = students.reduce((sum, s) => sum + s.totalCount, 0);

  // Total revenue
  const totalRevenue = revenues.reduce((sum, r) => sum + r.calculatedAmount, 0);

  // Count pending projects
  const pendingProjectsCount = projects.filter((p) => !p.approvedBy).length;
  // Count approved active projects
  const approvedProjectsCount = projects.filter((p) => p.approvedBy && p.status !== 'completed').length;

  // Sync revenue amounts when students change
  const handleUpdateStudents = async (updatedList: StudentLevel[]): Promise<boolean> => {
    const newTotal = updatedList.reduce((sum, s) => sum + s.totalCount, 0);

    // Auto-sync eligible count on head-count dependent revenue items
    const updatedRevenues = revenues.map((r) => {
      if (r.note?.startsWith('stage:')) {
        const count = updatedList.filter(s => s.stage === r.note.slice(6)).reduce((sum, s) => sum + s.totalCount, 0);
        const eligibleCount = r.category === 'small_school' && newTotal >= 120 ? 0 : count;
        return { ...r, eligibleCount, calculatedAmount: r.ratePerHead * eligibleCount };
      }
      if (!r.isCustomRate && (r.itemName.includes('นักเรียน') || r.id <= 6 || r.id === 8)) {
        return {
          ...r,
          eligibleCount: newTotal,
          calculatedAmount: Math.round(r.ratePerHead * newTotal),
        };
      }
      return r;
    });

    const saved = await persistToServer({ students: updatedList, revenues: updatedRevenues, activeFiscalYear });
    if (saved) {
      const fresh = await fetch(`/api/database?school_id=${school.id}`).then(r => r.json()).catch(() => null);
      const actual = fresh?.data?.students;
      const requestedGrades = updatedList.map(s => s.gradeLevel.trim()).sort();
      const storedGrades = Array.isArray(actual) ? actual.map((s: StudentLevel) => s.gradeLevel.trim()).sort() : null;
      if (!storedGrades || JSON.stringify(requestedGrades) !== JSON.stringify(storedGrades)) {
        setSaveError('ข้อมูลระดับชั้นที่อ่านกลับจาก MySQL ไม่ตรงกับที่บันทึก');
        return false;
      }
      setStudents(actual);
      setRevenues(fresh.data.revenues || []);
    }
    return saved;
  };

  const handleUpdateSchool = async (updated: School): Promise<boolean> => {
    const saved = await persistToServer({ school: updated });
    if (saved) {
      const response = await fetch(`/api/database?school_id=${updated.id}`).then(r => r.json()).catch(() => null);
      if (!response?.success || !response.data?.school) {
        setSaveError('บันทึกแล้วแต่ไม่สามารถตรวจสอบข้อมูลโรงเรียนจาก MySQL ได้');
        return false;
      }
      setSchool(response.data.school);
    }
    return saved;
  };

  const handleUpdateProjects = (updated: Project[]) => {
    setProjects(updated);
    persistToServer({ projects: updated });
  };

  const handleUpdateAllocations = async (updated: BudgetAllocation[], settings: BudgetSettings = budgetSettings): Promise<boolean> => {
    const saved = await persistToServer({ allocations: updated, budgetSettings: settings, activeFiscalYear });
    if (!saved) return false;
    const fresh = await fetch(`/api/database?school_id=${school.id}`).then(r => r.json()).catch(() => null);
    if (!fresh?.success || !Array.isArray(fresh.data?.allocations)) {
      setSaveError('บันทึกแล้วแต่ตรวจสอบการจัดสรรจาก MySQL ไม่สำเร็จ');
      return false;
    }
    setAllocations(fresh.data.allocations);
    setBudgetSettings(fresh.data.budgetSettings || settings);
    return true;
  };

  const handleUpdateRevenues = async (updated: RevenueItem[]): Promise<boolean> => {
    const saved = await persistToServer({ revenues: updated, activeFiscalYear });
    if (saved) {
      const fresh = await fetch(`/api/database?school_id=${school.id}`).then(r => r.json()).catch(() => null);
      setRevenues(fresh?.data?.revenues || updated);
    }
    return saved;
  };

  const handleUpdateActivities = async (updated: LearnerActivity[]): Promise<boolean> => {
    const saved = await persistToServer({ activities: updated, activeFiscalYear });
    if (!saved) return false;
    const fresh = await fetch(`/api/database?school_id=${school.id}`).then(r => r.json()).catch(() => null);
    if (!fresh?.success || !Array.isArray(fresh.data?.activities) || fresh.data.activities.length !== updated.length) {
      setSaveError('บันทึกแล้วแต่ตรวจสอบกิจกรรมจาก MySQL ไม่สำเร็จ');
      return false;
    }
    setActivities(fresh.data.activities);
    setActivitiesInitialized(true);
    return true;
  };

  const handleUpdateTransactions = (updatedTrans: BudgetTransaction[], updatedProjects: Project[]) => {
    setTransactions(updatedTrans);
    setProjects(updatedProjects);
    persistToServer({ transactions: updatedTrans, projects: updatedProjects });
  };

  // Handle preset rate application
  const handleApplyPresetRates = () => {
    setRevenues((prev) =>
      prev.map((r) => {
        if (r.itemName.includes('เงินอุดหนุนรายหัวนักเรียน')) {
          return { ...r, ratePerHead: 2000, calculatedAmount: 2000 * r.eligibleCount };
        }
        if (r.itemName.includes('หนังสือเรียน')) {
          return { ...r, ratePerHead: 650, calculatedAmount: 650 * r.eligibleCount };
        }
        if (r.itemName.includes('เครื่องแบบ')) {
          return { ...r, ratePerHead: 400, calculatedAmount: 400 * r.eligibleCount };
        }
        if (r.itemName.includes('อุปกรณ์การเรียน')) {
          return { ...r, ratePerHead: 220, calculatedAmount: 220 * r.eligibleCount };
        }
        if (r.itemName.includes('กิจกรรมพัฒนาผู้เรียน')) {
          return { ...r, ratePerHead: 500, calculatedAmount: 500 * r.eligibleCount };
        }
        return r;
      })
    );
  };

  const saveFiscalYear = async (action: 'create' | 'select' | 'update', year: number, fiscalYear?: FiscalYear): Promise<boolean> => {
    try {
      const schoolId = school.id;
      if (!schoolId) throw new Error('กรุณาเลือกโรงเรียนก่อนตั้งปีงบประมาณ');
      const res = await fetch('/api/fiscal-years', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, year, schoolId, fiscalYear }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'บันทึกปีงบประมาณไม่สำเร็จ');
      const refreshed = await fetch(`/api/database?school_id=${schoolId}`);
      const data = await refreshed.json();
      if (!refreshed.ok || !data.success || !data.data) throw new Error('บันทึกแล้วแต่โหลดข้อมูลปีงบประมาณกลับไม่สำเร็จ');
      const d = data.data;
      setFiscalYears(d.fiscalYears || []);
      const selected = d.fiscalYears?.find((fy: FiscalYear) => fy.isActive) || d.fiscalYears?.[0];
      if (action !== 'update' && selected?.year !== year) throw new Error('ปีงบประมาณที่อ่านกลับจาก MySQL ไม่ตรงกับที่เลือก');
      if (selected) setActiveFiscalYear(selected);
      if (d.school) setSchool(d.school);
      setStudents(d.students || []);
      setRevenues(d.revenues || []);
      setAllocations(d.allocations || []);
      setBudgetSettings(d.budgetSettings || { carryover: 0, manualTotal: null });
      setActivities(d.activities || []);
      setActivitiesInitialized(d.activitiesInitialized === true);
      setSaveError(null);
      return true;
    } catch (err: any) {
      setSaveError(err.message || 'บันทึกปีงบประมาณลง MySQL ไม่สำเร็จ');
      return false;
    }
  };
  const handleAddFiscalYear = (yearNum: number) => saveFiscalYear('create', yearNum);
  const handleSelectFiscalYear = (fy: FiscalYear) => saveFiscalYear('select', fy.year);
  const handleUpdateFiscalYear = (updatedFy: FiscalYear) => saveFiscalYear('update', updatedFy.year, updatedFy);

  // Handle restoring data from backup JSON
  const handleRestoreData = (backup: any) => {
    if (backup.school) setSchool(backup.school);
    if (backup.activeFiscalYear) setActiveFiscalYear(backup.activeFiscalYear);
    if (backup.students) setStudents(backup.students);
    if (backup.revenues) setRevenues(backup.revenues);
    if (backup.allocations) setAllocations(backup.allocations);
    if (backup.projects) setProjects(backup.projects);
    if (backup.transactions) setTransactions(backup.transactions);
  };

  // Switch to Project Expenses tab for specific project
  const handleOpenExpensesForProject = (project: Project) => {
    setSelectedProjectIdForExpenses(project.id);
    setActiveTab('expenses');
  };

  // Real Login & Registration Screen if logged out (No demo buttons)
  if (!isLoggedIn) {
    return (
      <AuthView
        schools={allSchools.length > 0 ? allSchools : [school]}
        onLoginSuccess={handleAuthSuccess}
      />
    );
  }

  // Dedicated Super Admin Portal (Completely separated from school view)
  if (currentUser?.role === 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <SuperAdminView
            currentSchool={school}
            onSelectSchool={(selected) => setSchool(selected)}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <Header
        school={school}
        activeFiscalYear={activeFiscalYear}
        currentUser={currentUser}
        onSwitchUser={(user) => setCurrentUser(user)}
        availableUsers={users}
        onOpenGasModal={() => setIsGasModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
        dbConnected={Boolean(dbStatus?.connected)}
        dbName={dbStatus?.database}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenGasModal={() => setIsGasModalOpen(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
          pendingCount={pendingProjectsCount}
          approvedCount={approvedProjectsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {saveError && (
              <div role="alert" className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900">
                บันทึกข้อมูลไม่สำเร็จ: {saveError}
              </div>
            )}
            {/* MySQL Connection Status Banner for School Users */}
            {dbStatus && !dbStatus.connected && (
              <div className="mb-6 p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-950">
                      ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      ต้องตรวจสอบ
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    ข้อมูลที่กรอกจะยังไม่บันทึกลงฐานข้อมูล กรุณาติดต่อ Super Admin เพื่อตรวจสอบการเชื่อมต่อ
                  </p>
                </div>
              </div>
            )}
            {school.isActive === false && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-900 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                  !
                </div>
                <div>
                  <h4 className="text-sm font-bold">สถานศึกษาถูกระงับการใช้งานชั่วคราว (Inactive)</h4>
                  <p className="text-xs text-rose-600">
                    โปรดติดต่อผู้ดูแลระบบส่วนกลาง (Super Admin) เพื่อขอเปิดใช้งานสถานศึกษา
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                school={school}
                activeFiscalYear={activeFiscalYear}
                students={students}
                revenues={revenues}
                allocations={allocations}
                projects={projects}
                transactions={transactions}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'school' && (
              <SchoolInfoView
                school={school}
                activeFiscalYear={activeFiscalYear}
                onUpdateSchool={handleUpdateSchool}
              />
            )}

            {activeTab === 'students' && (
              <StudentDataView
                students={students}
                revenues={revenues}
                activeFiscalYear={activeFiscalYear}
                onUpdateStudents={handleUpdateStudents}
                onUpdateFiscalYear={handleUpdateFiscalYear}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueView
                revenues={revenues}
                students={students}
                activeFiscalYear={activeFiscalYear}
                totalStudents={totalStudents}
                onUpdateRevenues={handleUpdateRevenues}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetAllocationView
                allocations={allocations}
                budgetSettings={budgetSettings}
                activeFiscalYear={activeFiscalYear}
                revenues={revenues}
                onUpdateAllocations={handleUpdateAllocations}
                onNavigateToBudgetCut={() => setActiveTab('budget_cut')}
              />
            )}

            {activeTab === 'learner_activities' && (
              <LearnerActivitiesView
                activities={activities}
                activitiesInitialized={activitiesInitialized}
                activeFiscalYear={activeFiscalYear}
                revenues={revenues}
                onUpdateActivities={handleUpdateActivities}
              />
            )}

            {activeTab === 'ai_project_writer' && (
              <AiProjectWriterView
                school={school}
                fiscalYear={activeFiscalYear}
                strategies={strategies}
                allocations={allocations}
                users={users}
                currentUser={currentUser}
                onSaveToProjects={async (newProject) => {
                  // IDs are global in MySQL, across every school. Pick a 32-bit ID
                  // outside the sequential seed range and verify after saving.
                  const nextId = 1000000000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 3000000000);
                  const project = { ...newProject, id: nextId };
                  if (!await persistToServer({ projects: [project, ...projects] })) return false;
                  const fresh = await fetch(`/api/database?school_id=${school.id}`).then(r => r.json()).catch(() => null);
                  const persisted = fresh?.success && Array.isArray(fresh.data?.projects)
                    ? fresh.data.projects.find((p: Project) => Number(p.id) === nextId && p.projectName === project.projectName && Number(p.fiscalYearId) === Number(project.fiscalYearId))
                    : null;
                  if (!persisted) { setSaveError('ไม่พบโครงการที่บันทึกใน MySQL'); return false; }
                  setProjects(fresh.data.projects);
                  return true;
                }}
                onNavigateToProjects={() => setActiveTab('projects')}
              />
            )}

            {(activeTab === 'projects' || activeTab === 'approved_projects') && (
              <ProjectsView
                projects={projects}
                currentUser={currentUser}
                departments={allocations}
                activeFiscalYear={activeFiscalYear}
                school={school}
                initialSubTab={activeTab === 'approved_projects' ? 'approved' : 'all'}
                onSelectSubTab={(tab) => {
                  if (tab === 'approved') {
                    setActiveTab('approved_projects');
                  } else {
                    setActiveTab('projects');
                  }
                }}
                onUpdateProjects={handleUpdateProjects}
                onOpenExpensesForProject={handleOpenExpensesForProject}
                onNavigateToAiWriter={() => setActiveTab('ai_project_writer')}
              />
            )}

            {activeTab === 'budget_cut' && (
              <BudgetCutView
                projects={projects}
                allocations={allocations}
                activeFiscalYear={activeFiscalYear}
                currentUser={currentUser}
                school={school}
                onUpdateProjects={handleUpdateProjects}
                onUpdateAllocations={handleUpdateAllocations}
                onNavigateToProjectExpenses={handleOpenExpensesForProject}
              />
            )}

            {activeTab === 'expenses' && (
              <ProjectExpensesView
                projects={projects}
                selectedProjectId={selectedProjectIdForExpenses}
                currentUser={currentUser}
                transactions={transactions}
                school={school}
                activeFiscalYear={activeFiscalYear}
                onUpdateProjects={handleUpdateProjects}
                onBackToProjects={() => setActiveTab('projects')}
              />
            )}

            {activeTab === 'disbursements' && (
              <DisbursementsView
                transactions={transactions}
                projects={projects}
                currentUser={currentUser}
                activeFiscalYear={activeFiscalYear}
                onUpdateTransactions={handleUpdateTransactions}
              />
            )}

            {activeTab === 'action_plan' && (
              <ActionPlanView
                projects={projects}
                school={school}
                activeFiscalYear={activeFiscalYear}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                school={school}
                activeFiscalYear={activeFiscalYear}
                students={students}
                revenues={revenues}
                allocations={allocations}
                activities={activities}
                projects={projects}
                transactions={transactions}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                school={school}
                fiscalYears={fiscalYears}
                activeFiscalYear={activeFiscalYear}
                onSelectFiscalYear={handleSelectFiscalYear}
                onAddFiscalYear={handleAddFiscalYear}
                onUpdateFiscalYear={handleUpdateFiscalYear}
                students={students}
                revenues={revenues}
                allocations={allocations}
                projects={projects}
                transactions={transactions}
                onRestoreData={handleRestoreData}
                onOpenGasModal={() => setIsGasModalOpen(true)}
              />
            )}

            {activeTab === 'users' && (
              <UsersView
                users={users}
                currentUser={currentUser}
                onUpdateUsers={(updated) => setUsers(updated)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Google Apps Script (Code.gs) & Google Sheets Integration Modal */}
      <GasIntegrationModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
        school={school}
        currentUser={currentUser}
        fiscalYears={fiscalYears}
        users={users}
        students={students}
        revenues={revenues}
        allocations={allocations}
        activities={activities}
        projects={projects}
        transactions={transactions}
        strategies={strategies}
      />
    </div>
  );
}
