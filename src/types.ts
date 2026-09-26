export type UserRole = 'superadmin' | 'admin' | 'director' | 'teacher';

export const TEACHER_POSITIONS = [
  'ครูอัตราจ้าง',
  'พนักงานราชการ',
  'เจ้าหน้าที่ธุรการ',
  'ครู',
  'ครูชำนาญการ',
  'ครูชำนาญการพิเศษ',
  'ครูเชี่ยวชาญ',
  'ครูเชี่ยวชาญพิเศษ',
] as const;

export type TeacherPosition = (typeof TEACHER_POSITIONS)[number];

export interface User {
  id: number;
  username: string;
  citizenId?: string; // เลขประจำตัวประชาชน 13 หลัก
  fullName: string;
  email?: string;
  role: UserRole;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  schoolId: number;
  schoolSmis?: string;
  isActive?: boolean;
  password?: string;
  isPasswordChanged?: boolean; // เปลี่ยนรหัสผ่านจากการใช้งานครั้งแรกแล้วหรือไม่
  status?: 'pending' | 'approved' | 'rejected'; // แอดมินโรงเรียนอนุมัติหรือไม่
  registeredAt?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface School {
  id: number;
  schoolCode: string;
  smisCode?: string; // รหัสสมัคร SMIS 8 หลักสำหรับเปิดใช้งาน
  isActive?: boolean; // สถานะเปิด/ปิดการใช้งาน
  schoolKey?: string; // ID ประจำโรงเรียนป้องกันข้อมูลชนกัน (Tenant Key)
  adminUsername?: string; // ID บัญชีผู้ดูแลโรงเรียน
  adminPasswordPlain?: string; // รหัสผ่านของโรงเรียน
  adminTeacherId?: number; // ครูที่ Super Admin แต่งตั้งเป็นแอดมินของโรงเรียน
  adminTeacherName?: string;
  name: string;
  address?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  zipcode?: string;
  affiliation?: string; // e.g. สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)
  educationArea?: string; // e.g. สำนักงานเขตพื้นที่การศึกษาประถมศึกษาขอนแก่น เขต 1
  fiscalYear?: number; // e.g. 2568
  directorName?: string;
  isRealSchool?: boolean;
  phone?: string;
  email?: string;
  logoUrl?: string;
  notes?: string;
  studentCount?: number;
  projectCount?: number;
  totalBudget?: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  dbname: string;
  user: string;
  pass: string;
}

export interface DatabaseStatus {
  connected: boolean;
  error?: string | null;
  host: string;
  port: number;
  dbname: string;
  user: string;
  server_version?: string;
  table_count?: number;
  tables?: Array<{ name: string; records: number }>;
}

export interface FiscalYear {
  id: number;
  schoolId: number;
  year: number; // e.g. 2568
  isActive: boolean;
  startDate: string;
  endDate: string;
  totalStudents?: number;
  teacherCount: number;
  subsidyRateKindergarten?: number; // อัตราเงินอุดหนุนรายหัวอนุบาล (บาท/คน)
  subsidyRatePrimary?: number; // อัตราเงินอุดหนุนรายหัวประถม (บาท/คน)
  subsidyRateSecondaryLower?: number; // อัตราเงินอุดหนุนรายหัวมัธยมต้น (บาท/คน)
  subsidyRateSecondaryUpper?: number; // อัตราเงินอุดหนุนรายหัวมัธยมปลาย (บาท/คน)
  isProposalOpen?: boolean; // สถานะเปิด/ปิดรับการเสนอโครงการจากคุณครู
  proposalOpenDate?: string; // วันที่เริ่มเปิดรับข้อเสนอ
  proposalCloseDate?: string; // วันที่ปิดรับข้อเสนอ
  proposalNotice?: string; // ข้อความประกาศ/คำชี้แจงสำหรับคุณครูในการเสนอโครงการ
}

export interface StudentLevel {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  gradeLevel: string; // อ.1, อ.2, อ.3, ป.1, ป.2, ป.3, ป.4, ป.5, ป.6, ม.1, ม.2, ม.3
  stage: 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย';
  maleCount: number;
  femaleCount: number;
  totalCount: number;
}

export interface RevenueItem {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  category: 'subsidy' | 'activity' | 'small_school' | 'welfare' | 'lunch' | 'fundraising' | 'revenue' | 'other';
  itemName: string;
  ratePerHead: number;
  eligibleCount: number;
  calculatedAmount: number;
  isCustomRate: boolean;
  note: string;
}

export interface BudgetAllocation {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  departmentName: string;
  percentage: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  colorHex: string;
  description: string;
  reserveType?: 'utility' | 'other';
  isContingency?: boolean; // ระบุว่าเป็นงบกลาง / สำรองจ่ายฉุกเฉิน
  contingencySubItems?: Array<{
    id: string;
    name: string; // เช่น ค่าไฟฟ้า, ค่าน้ำประปา, ค่าอินเทอร์เน็ต, สำรองฉุกเฉิน/ซ่อมแซม
    allocatedAmount: number;
    spentAmount: number;
    description?: string;
  }>;
  isCutConfirmed?: boolean; // ยืนยันการตัดแผนงบประมาณของกลุ่มงาน
  cutConfirmedDate?: string; // วันที่ยืนยันการตัดแผน
  cutConfirmedBy?: string; // ผู้กดยืนยันการตัดแผน
}

export interface BudgetSettings {
  carryover: number;
  manualTotal: number | null;
}

export interface LearnerActivity {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  activityName: string;
  percentage: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  note: string;
  description?: string;
}

export interface Strategy {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  code: string;
  name: string;
  description: string;
}

export interface Goal {
  id: number;
  strategyId: number;
  code: string;
  name: string;
}

export interface Indicator {
  id: number;
  goalId: number;
  code: string;
  name: string;
  targetValue: string;
  unit: string;
}

export interface ProjectExpenseItem {
  id: number;
  projectId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  category: 'ค่าตอบแทน' | 'ค่าใช้สอย' | 'ค่าวัสดุ' | 'ค่าครุภัณฑ์' | 'อื่น ๆ' | string;
}

export type ProjectExpense = ProjectExpenseItem;

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ProjectReportPhoto {
  id: string;
  dataUrl?: string; // ภาพเดิมก่อนเชื่อม Drive
  fileId?: string; // ภาพใหม่เก็บใน Google Drive
  caption: string;
}

export interface ProjectReport {
  activityDetails: string;
  results: string;
  problems: string;
  recommendations: string;
  aiDraft?: string;
  photos: ProjectReportPhoto[];
  updatedAt?: string;
}

export interface Project {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  projectCode: string;
  projectName: string;
  rationale: string;
  objectives: string;
  quantitativeGoals: string;
  qualitativeGoals: string;
  kpis: string;
  procedures: string;
  durationStart: string;
  durationEnd: string;
  location: string;
  targetGroup: string;
  responsiblePerson: string;
  responsibleId?: number;
  department: string;
  budgetSource: string;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  status: ProjectStatus;
  approvalStatus: ApprovalStatus;
  strategyId: number;
  goalId?: number;
  indicatorId?: number;
  sortOrder: number;
  expenseItems: ProjectExpenseItem[];
  // Convenience aliases & additional fields
  expenses?: ProjectExpenseItem[];
  duration?: string;
  kpi?: string;
  rationales?: string;
  quantitativeTarget?: string;
  qualitativeTarget?: string;
  approvedBy?: string;
  approvedDate?: string;
  proposerCitizenId?: string; // หมายเลขประจำตัวประชาชน 13 หลักของคุณครูผู้เสนอโครงการ
  proposerName?: string; // ชื่อ-นามสกุลของคุณครูผู้เสนอโครงการ
  attachmentName?: string; // ชื่อเอกสารหรือไฟล์แนบรายละเอียดโครงการ
  attachmentUrl?: string; // ลิงก์หรือไฟล์แนบรายละเอียดโครงการ
  fullProposalDetails?: any; // รายละเอียดโครงการที่เสนอฉบับสมบูรณ์ (รวม AI Proposal)
  closedBy?: string; // ผู้กดปิดโครงการ (เจ้าหน้าที่แผนงาน/Admin)
  closedDate?: string; // วันที่ปิดโครงการเสร็จสิ้น
  originalProposedBudget?: number; // วงเงินงบประมาณที่เสนอขอเบื้องต้น
  budgetAdjustedBy?: string; // ผู้ปรับเปลี่ยนงบประมาณ (จนท.แผน/ผอ.)
  budgetAdjustedDate?: string; // วันที่ปรับเปลี่ยนงบประมาณ
  budgetAdjustmentNote?: string; // บันทึกเหตุผลการปรับเปลี่ยนงบประมาณ
  isBudgetCutConfirmed?: boolean; // สถานะการตัดแผนงบประมาณโครงการได้รับการยืนยันแล้ว
  report?: ProjectReport;
}

export interface BudgetTransaction {
  id: number;
  schoolId: number;
  fiscalYearId: number;
  projectId: number;
  docNumber: string;
  transactionDate: string;
  itemDescription: string;
  amount: number;
  payee: string;
  receiptNumber?: string;
  approvedBy?: string;
  status?: 'approved' | 'pending';
  note?: string;
  recordedBy?: string;
}

export interface ProjectProposalActivity {
  phase: string;
  description: string;
  duration: string;
  responsible: string;
}

export interface ProjectProposal {
  projectCode: string;
  projectName: string;
  projectType: 'ใหม่' | 'ต่อเนื่อง' | string;
  department: string;
  strategyAlignment: string;
  responsiblePerson: string;
  position?: string;
  proposerName?: string;
  proposerPosition?: string;
  endorserName?: string;
  endorserPosition?: string;
  approverName?: string;
  approverPosition?: string;
  rationale: string;
  objectives: string[];
  quantitativeTarget: string;
  qualitativeTarget: string;
  timeline: string;
  location: string;
  activities: ProjectProposalActivity[];
  expenseItems: ProjectExpenseItem[];
  totalBudget: number;
  budgetSource: string;
  kpis: string;
  evaluationMethods: string;
  expectedBenefits: string[];
  proposedBy?: string;
  approvedBy?: string;
  acknowledgedBy?: string;
}
