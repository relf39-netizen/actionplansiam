import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  School,
  FiscalYear,
  StudentLevel,
  RevenueItem,
  BudgetAllocation,
  Project,
  BudgetTransaction,
} from '../types';
import {
  Users,
  GraduationCap,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderPlus,
  ArrowUpRight,
  Printer,
  Download,
  Scissors,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface DashboardViewProps {
  school: School;
  activeFiscalYear: FiscalYear;
  students: StudentLevel[];
  revenues: RevenueItem[];
  allocations: BudgetAllocation[];
  projects: Project[];
  transactions: BudgetTransaction[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  school,
  activeFiscalYear,
  students,
  revenues,
  allocations,
  projects,
  transactions,
  onNavigateTab,
}) => {
  // Calculations
  const totalStudents = students.reduce((sum, s) => sum + s.totalCount, 0);
  const totalRevenue = revenues.reduce((sum, r) => sum + r.calculatedAmount, 0);
  const totalAllocatedBudget = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  const totalSpentBudget = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remainingBudget = Math.max(0, totalAllocatedBudget - totalSpentBudget);

  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const inProgressProjects = projects.filter((p) => p.status === 'in_progress').length;
  const notStartedProjects = projects.filter((p) => p.status === 'not_started').length;
  const totalProjects = projects.length;

  // Chart 1: Revenue by Category
  const revenueLabels = revenues.map((r) => r.itemName.substring(0, 22) + (r.itemName.length > 22 ? '...' : ''));
  const revenueData = {
    labels: revenueLabels,
    datasets: [
      {
        label: 'จำนวนเงินประมาณการ (บาท)',
        data: revenues.map((r) => r.calculatedAmount),
        backgroundColor: [
          '#2563eb',
          '#3b82f6',
          '#60a5fa',
          '#93c5fd',
          '#0284c7',
          '#06b6d4',
          '#14b8a6',
          '#10b981',
          '#f59e0b',
          '#f97316',
          '#8b5cf6',
        ],
        borderRadius: 6,
      },
    ],
  };

  // Chart 2: Budget Allocation by Department
  const allocData = {
    labels: allocations.map((a) => `${a.departmentName} (${a.percentage}%)`),
    datasets: [
      {
        data: allocations.map((a) => a.allocatedAmount),
        backgroundColor: allocations.map((a) => a.colorHex),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Chart 3: Top Projects by Budget
  const sortedProjects = [...projects].sort((a, b) => b.allocatedBudget - a.allocatedBudget).slice(0, 6);
  const projectData = {
    labels: sortedProjects.map((p) => p.projectName.substring(0, 18) + '...'),
    datasets: [
      {
        label: 'งบประมาณที่จัดสรร (บาท)',
        data: sortedProjects.map((p) => p.allocatedBudget),
        backgroundColor: '#1e40af',
        borderRadius: 4,
      },
      {
        label: 'งบประมาณที่ใช้ไป (บาท)',
        data: sortedProjects.map((p) => p.spentBudget),
        backgroundColor: '#d97706',
        borderRadius: 4,
      },
    ],
  };

  // Chart 4: Used vs Remaining Budget
  const usedVsRemainingData = {
    labels: [
      `งบที่ใช้ไปแล้ว (${((totalSpentBudget / (totalAllocatedBudget || 1)) * 100).toFixed(1)}%)`,
      `งบคงเหลือ (${((remainingBudget / (totalAllocatedBudget || 1)) * 100).toFixed(1)}%)`,
    ],
    datasets: [
      {
        data: [totalSpentBudget, remainingBudget],
        backgroundColor: ['#ef4444', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-xs mb-2 border border-amber-400/30">
              🏫 สถานศึกษาขั้นพื้นฐาน • สำนักงานเขตพื้นที่การศึกษา
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {school.name}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-2xl">
              รายงานและติดตามแผนปฏิบัติการประจำปี ปีงบประมาณ พ.ศ. {activeFiscalYear.year} 
              | ผู้อำนวยการ: {school.directorName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              id="btn-dash-budget-cut"
              type="button"
              onClick={() => onNavigateTab('budget_cut')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Scissors className="h-4 w-4" />
              <span>ตัดแผนงบประมาณ</span>
            </button>
            <button
              id="btn-dash-new-project"
              type="button"
              onClick={() => onNavigateTab('projects')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-amber-400 transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              <span>จัดการโครงการ</span>
            </button>
            <button
              id="btn-dash-print-plan"
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 transition-colors border border-white/20"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์รายงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Students & Teachers */}
        <div 
          onClick={() => onNavigateTab('students')}
          className="cursor-pointer rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">จำนวนนักเรียนทั้งหมด</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalStudents.toLocaleString()}</span>
            <span className="text-xs text-slate-500">คน (อ.1 - ป.6)</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-600 border-t border-slate-100 pt-2">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400 mr-1" />
            <span>ครูและบุคลากร: <strong>{activeFiscalYear.teacherCount}</strong> คน</span>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div 
          onClick={() => onNavigateTab('revenue')}
          className="cursor-pointer rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ประมาณการรายรับทั้งหมด</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{totalRevenue.toLocaleString()}</span>
            <span className="text-xs text-slate-500">บาท</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-0.5 inline-block">
            11 รายการตามเกณฑ์ สพฐ.
          </div>
        </div>

        {/* Card 3: Allocated & Spent Budget */}
        <div 
          onClick={() => onNavigateTab('budget')}
          className="cursor-pointer rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">งบประมาณที่จัดสรรแล้ว</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{totalAllocatedBudget.toLocaleString()}</span>
            <span className="text-xs text-slate-500">บาท</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
            <span>ใช้ไปแล้ว:</span>
            <span className="font-semibold text-amber-600">{totalSpentBudget.toLocaleString()} บ.</span>
          </div>
        </div>

        {/* Card 4: Remaining Budget */}
        <div 
          onClick={() => onNavigateTab('disbursements')}
          className="cursor-pointer rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">งบประมาณคงเหลือ</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-600">{remainingBudget.toLocaleString()}</span>
            <span className="text-xs text-slate-500">บาท</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span>อัตราคงเหลือ: <strong>{((remainingBudget / (totalAllocatedBudget || 1)) * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      </div>

      {/* Projects Status Summary Bar */}
      <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              สถานะโครงการตามแผนปฏิบัติการ ({totalProjects} โครงการ)
            </h3>
            <p className="text-xs text-slate-500">
              ติดตามความก้าวหน้าโครงการประจำปีงบประมาณ พ.ศ. {activeFiscalYear.year}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('projects')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            <span>ดูโครงการทั้งหมด</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50/80 p-3 border border-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <div className="text-lg font-bold text-emerald-900">{completedProjects} โครงการ</div>
              <div className="text-xs text-emerald-700">ดำเนินการเสร็จสิ้นแล้ว</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-amber-50/80 p-3 border border-amber-100">
            <Clock className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <div className="text-lg font-bold text-amber-900">{inProgressProjects} โครงการ</div>
              <div className="text-xs text-amber-700">อยู่ระหว่างดำเนินการ</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 border border-slate-200">
            <AlertCircle className="h-8 w-8 text-slate-500 shrink-0" />
            <div>
              <div className="text-lg font-bold text-slate-800">{notStartedProjects} โครงการ</div>
              <div className="text-xs text-slate-600">ยังไม่ได้ดำเนินการ</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Required Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue Breakdown */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">1. กราฟประมาณการรายรับ</h3>
              <p className="text-xs text-slate-500">แจกแจงตามประเภทงบอุดหนุนและรายได้สถานศึกษา</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('revenue')}
              className="text-xs text-blue-600 hover:underline"
            >
              ดูรายละเอียด
            </button>
          </div>
          <div className="h-72">
            <Bar
              data={revenueData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `จำนวน: ${Number(ctx.raw).toLocaleString()} บาท`,
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (val) => `${Number(val) / 1000}k บ.`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 2: Department Allocation */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">2. กราฟการจัดสรรงบประมาณตามฝ่าย</h3>
              <p className="text-xs text-slate-500">สัดส่วนตามขอบข่ายภารกิจ (รวม 100%)</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('budget')}
              className="text-xs text-blue-600 hover:underline"
            >
              ปรับเปอร์เซ็นต์
            </button>
          </div>
          <div className="h-72 flex items-center justify-center">
            <Doughnut
              data={allocData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } },
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `งบประมาณ: ${Number(ctx.raw).toLocaleString()} บาท`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 3: Top Projects Budgets */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">3. กราฟงบประมาณโครงการสำคัญ</h3>
              <p className="text-xs text-slate-500">เปรียบเทียบงบที่จัดสรรและงบที่ใช้ไป</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('projects')}
              className="text-xs text-blue-600 hover:underline"
            >
              แผนโครงการ
            </button>
          </div>
          <div className="h-72">
            <Bar
              data={projectData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12 } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()} บาท`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 4: Used vs Remaining */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">4. กราฟงบประมาณใช้ไป / คงเหลือ</h3>
              <p className="text-xs text-slate-500">สัดส่วนการเบิกจ่ายจริงเทียบกับงบประมาณรวม</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('disbursements')}
              className="text-xs text-blue-600 hover:underline"
            >
              บันทึกเบิกจ่าย
            </button>
          </div>
          <div className="h-72 flex items-center justify-center">
            <Pie
              data={usedVsRemainingData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } },
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `ยอดเงิน: ${Number(ctx.raw).toLocaleString()} บาท`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Disbursements Table */}
      <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">รายการเบิกจ่ายล่าสุด</h3>
            <p className="text-xs text-slate-500">ประวัติการใช้จ่ายเงินงบประมาณ</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('disbursements')}
            className="text-xs text-blue-600 hover:underline"
          >
            ดูการเบิกจ่ายทั้งหมด ({transactions.length} รายการ)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">เลขที่เอกสาร</th>
                <th className="py-2.5 px-3 font-semibold">วันที่</th>
                <th className="py-2.5 px-3 font-semibold">รายการเบิกจ่าย</th>
                <th className="py-2.5 px-3 font-semibold">ผู้รับเงิน / ร้านค้า</th>
                <th className="py-2.5 px-3 font-semibold text-right">จำนวนเงิน (บาท)</th>
                <th className="py-2.5 px-3 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-blue-600">{t.docNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{t.transactionDate}</td>
                  <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate">{t.itemDescription}</td>
                  <td className="py-2.5 px-3 text-slate-600">{t.payee}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                    {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      อนุมัติแล้ว
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
