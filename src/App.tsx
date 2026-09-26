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
  const [activities, setActivities] = useState<LearnerActivity[]>(initialLearnerActivities);
  const [projects, setProjects] = useState<Project[]>(initialProjectsData);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>(initialTransactions);
  const [strategies, setStrategies] = useState<Strategy[]>(initialStrategies);

  // DB Status
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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

        // 3. Check saved user session first to determine schoolId
        let targetSchoolId = 1;
        try {
          const savedUser = localStorage.getItem('school_current_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.id) {
              setCurrentUser(parsedUser);
              if (parsedUser.schoolId && Number(parsedUser.schoolId) > 0) {
                targetSchoolId = Number(parsedUser.schoolId);
              }
            }
          }
        } catch (e) {}

        // 4. Load application data from MySQL for target school and its active fiscal year
        await loadDataForSchoolAndYear(targetSchoolId);
      } catch (err) {
        console.error('Error fetching initial database state:', err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchInitialData();
  }, []);

  // Helper to load application data for a specific school and fiscal year from MySQL
  const loadDataForSchoolAndYear = async (targetSchoolId: number, targetFyId?: number) => {
    try {
      const url = targetFyId
        ? `/api/database?school_id=${targetSchoolId}&fiscal_year_id=${targetFyId}`
        : `/api/database?school_id=${targetSchoolId}`;
      const appRes = await fetch(url);
      if (appRes.ok) {
        const text = await appRes.text();
        try {
          const appJson = JSON.parse(text);
          if (appJson.success && appJson.data) {
            const d = appJson.data;
            if (d.school) setSchool(d.school);
            if (Array.isArray(d.fiscalYears)) {
              setFiscalYears(d.fiscalYears);
            }
            if (d.activeFiscalYear) {
              setActiveFiscalYear(d.activeFiscalYear);
            } else if (Array.isArray(d.fiscalYears)) {
              const active = d.fiscalYears.find((fy: FiscalYear) => fy.isActive) || d.fiscalYears[0];
              if (active) setActiveFiscalYear(active);
            }
            if (Array.isArray(d.users)) setUsers(d.users);
            // Load students and revenues strictly from MySQL for this school and fiscal year
            setStudents(Array.isArray(d.students) ? d.students : []);
            setRevenues(Array.isArray(d.revenues) ? d.revenues : []);
            if (Array.isArray(d.allocations)) setAllocations(d.allocations);
            if (Array.isArray(d.activities)) setActivities(d.activities);
            if (Array.isArray(d.projects)) setProjects(d.projects);
            if (Array.isArray(d.transactions)) setTransactions(d.transactions);
            if (Array.isArray(d.strategies)) setStrategies(d.strategies);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading data for school and year:', err);
    }
  };

  // Helper to persist data to server / MySQL
  const persistToServer = async (overrides: Record<string, any> = {}) => {
    try {
      const payload = {
        school,
        fiscalYears,
        activeFiscalYear,
        users,
        students,
        revenues,
        allocations,
        activities,
        projects,
        transactions,
        strategies,
        ...overrides,
      };

      const targetSchoolId = payload.school?.id || 1;
      const targetFiscalYearId = payload.activeFiscalYear?.id || 1;
      const res = await fetch(`/api/database?school_id=${targetSchoolId}&fiscal_year_id=${targetFiscalYearId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Server failed to persist to MySQL:', errorData.message || res.statusText);
      }
    } catch (err) {
      console.warn('Failed to save to database endpoint:', err);
    }
  };

  // Auth screen state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('school_logged_in') === 'true';
  });

  // Handle Auth Success from AuthView
  const handleAuthSuccess = (user: User, loggedSchool?: School, isSuperAdmin?: boolean) => {
    setCurrentUser(user);
    if (loggedSchool) {
      setSchool(loggedSchool);
    }
    setIsLoggedIn(true);
    localStorage.setItem('school_logged_in', 'true');
    localStorage.setItem('school_current_user', JSON.stringify(user));
    if (isSuperAdmin) {
      setActiveTab('super_admin');
    }
  };

  // Handle Logout
  const handleLogout = () => {
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

  // Sync revenue amounts when students change across stages
  const handleUpdateStudents = (updatedList: StudentLevel[]) => {
    setStudents(updatedList);
    const newTotal = updatedList.reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

    const kinderTotal = updatedList.filter((s) => s.stage === 'อนุบาล').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
    const primaryTotal = updatedList.filter((s) => s.stage === 'ประถม').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
    const secLowerTotal = updatedList.filter((s) => s.stage === 'มัธยมต้น').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
    const secUpperTotal = updatedList.filter((s) => s.stage === 'มัธยมปลาย').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);

    // Auto-sync eligible count on stage-dependent or head-count dependent revenue items
    const updatedRevenues = revenues.map((r) => {
      if (r.isCustomRate) return r;
      let targetCount = r.eligibleCount;
      if (r.itemName.includes('อนุบาล')) {
        targetCount = kinderTotal;
      } else if (r.itemName.includes('ประถม')) {
        targetCount = primaryTotal;
      } else if (r.itemName.includes('มัธยมต้น') || r.itemName.includes('มัธยมศึกษาตอนต้น')) {
        targetCount = secLowerTotal;
      } else if (r.itemName.includes('มัธยมปลาย') || r.itemName.includes('มัธยมศึกษาตอนปลาย')) {
        targetCount = secUpperTotal;
      } else if (r.itemName.includes('นักเรียน') || r.category === 'welfare') {
        targetCount = newTotal;
      }

      return {
        ...r,
        eligibleCount: targetCount,
        calculatedAmount: Math.round((Number(r.ratePerHead) || 0) * targetCount),
      };
    });

    setRevenues(updatedRevenues);
    persistToServer({ students: updatedList, revenues: updatedRevenues });
  };

  const handleUpdateSchool = (updated: School) => {
    setSchool(updated);
    persistToServer({ school: updated });
  };

  const handleUpdateProjects = (updated: Project[]) => {
    setProjects(updated);
    persistToServer({ projects: updated });
  };

  const handleUpdateAllocations = (updated: BudgetAllocation[]) => {
    setAllocations(updated);
    persistToServer({ allocations: updated });
  };

  const handleUpdateRevenues = (updated: RevenueItem[]) => {
    setRevenues(updated);
    persistToServer({ revenues: updated });
  };

  const handleUpdateActivities = (updated: LearnerActivity[]) => {
    setActivities(updated);
    persistToServer({ activities: updated });
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

  // Handle adding a new fiscal year
  const handleAddFiscalYear = (yearNum: number) => {
    const newId = fiscalYears.length + 1;
    const newFy: FiscalYear = {
      id: newId,
      schoolId: 1,
      year: yearNum,
      startDate: `${yearNum - 543 - 1}-10-01`,
      endDate: `${yearNum - 543}-09-30`,
      isActive: true,
      teacherCount: 15,
      isProposalOpen: true,
      proposalOpenDate: `${yearNum - 543 - 1}-10-01`,
      proposalCloseDate: `${yearNum - 543}-01-31`,
      proposalNotice: `เปิดรับการเสนอโครงการตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. ${yearNum}`,
    };
    setFiscalYears((prev) => [...prev.map((y) => ({ ...y, isActive: false })), newFy]);
    setActiveFiscalYear(newFy);
  };

  // Handle updating an existing fiscal year (e.g. proposal open/close settings)
  const handleUpdateFiscalYear = (updatedFy: FiscalYear) => {
    setFiscalYears((prev) => prev.map((fy) => (fy.id === updatedFy.id ? updatedFy : fy)));
    setActiveFiscalYear(updatedFy);
  };

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
            {/* MySQL Connection Status Banner for School Users */}
            {dbStatus && !dbStatus.connected && (
              <div className="mb-6 p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-950">
                      ระบบบันทึกข้อมูลด้วยระบบสำรอง (Local Storage)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      พร้อมใช้งาน
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    คุณครูสามารถบันทึกข้อมูลและใช้งานได้ตามปกติ (หากต้องการเชื่อมต่อฐานข้อมูล MySQL ส่วนกลาง โปรดติดต่อ Super Admin)
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
                activeFiscalYear={activeFiscalYear}
                school={school}
                onUpdateStudents={handleUpdateStudents}
                onUpdateFiscalYear={handleUpdateFiscalYear}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueView
                revenues={revenues}
                activeFiscalYear={activeFiscalYear}
                totalStudents={totalStudents}
                students={students}
                onUpdateRevenues={handleUpdateRevenues}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetAllocationView
                allocations={allocations}
                activeFiscalYear={activeFiscalYear}
                totalRevenue={totalRevenue}
                onUpdateAllocations={handleUpdateAllocations}
                onNavigateToBudgetCut={() => setActiveTab('budget_cut')}
              />
            )}

            {activeTab === 'learner_activities' && (
              <LearnerActivitiesView
                activities={activities}
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
                users={users}
                onSaveToProjects={(newProject) => {
                  handleUpdateProjects([newProject, ...projects]);
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
                onSelectFiscalYear={(fy) => setActiveFiscalYear(fy)}
                onAddFiscalYear={handleAddFiscalYear}
                onUpdateFiscalYear={handleUpdateFiscalYear}
                students={students}
                revenues={revenues}
                allocations={allocations}
                projects={projects}
                transactions={transactions}
                onRestoreData={handleRestoreData}
                onApplyPresetRates={handleApplyPresetRates}
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
