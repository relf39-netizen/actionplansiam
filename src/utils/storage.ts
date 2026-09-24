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
} from '../types';

export interface AppDatabaseState {
  school: School;
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

const STORAGE_KEY = 'school_action_plan_db_v4_clean_production';

// Clean initial data using generic example names (as requested by user)
export const cleanInitialSchool: School = {
  id: 1,
  schoolCode: '1000000001',
  name: 'โรงเรียนของคุณ (กรุณากรอกข้อมูลโรงเรียน)',
  address: '',
  subdistrict: '',
  district: '',
  province: '',
  zipcode: '',
  affiliation: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)',
  educationArea: '',
  fiscalYear: 2568,
  directorName: '',
  phone: '',
  email: '',
  logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
};

export const cleanInitialFiscalYears: FiscalYear[] = [
  {
    id: 1,
    schoolId: 1,
    year: 2568,
    isActive: true,
    startDate: '2024-10-01',
    endDate: '2025-09-30',
    totalStudents: 180,
    teacherCount: 15,
    subsidyRateKindergarten: 1800,
    subsidyRatePrimary: 2050,
    subsidyRateSecondaryLower: 3500,
    subsidyRateSecondaryUpper: 3800,
    isProposalOpen: true,
    proposalOpenDate: '2024-10-01',
    proposalCloseDate: '2025-01-31',
    proposalNotice: 'เปิดรับการเสนอโครงการตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. 2568 โดยคุณครูสามารถใช้เลขประจำตัวประชาชน 13 หลักในการเสนอของบประมาณ',
  },
];

export const cleanInitialUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    citizenId: '1100100123456',
    fullName: 'นายวางแผน รอบคอบ (หัวหน้างานแผนงานและงบประมาณ)',
    email: 'admin@school.ac.th',
    role: 'admin',
    department: 'ฝ่ายบริหารงานงบประมาณ',
    position: 'ครูชำนาญการพิเศษ / หัวหน้างานแผนงานและงบประมาณ',
    phone: '081-000-0001',
    schoolId: 1,
    isActive: true,
  },
  {
    id: 2,
    username: 'director',
    citizenId: '1200200234567',
    fullName: 'ดร.พัฒนา ก้าวหน้า (ผู้อำนวยการโรงเรียน)',
    email: 'director@school.ac.th',
    role: 'director',
    department: 'ฝ่ายบริหารทั่วไป',
    position: 'ผู้อำนวยการโรงเรียน',
    phone: '089-000-0002',
    schoolId: 1,
    isActive: true,
  },
  {
    id: 3,
    username: 'teacher1',
    citizenId: '3100600345678',
    fullName: 'ครูสอนดี เก่งมาก (ครูผู้รับผิดชอบโครงการ)',
    email: 'teacher1@school.ac.th',
    role: 'teacher',
    department: 'ฝ่ายบริหารงานวิชาการ',
    position: 'ครูชำนาญการ / ผู้รับผิดชอบโครงการ',
    phone: '086-000-0003',
    schoolId: 1,
    isActive: true,
  },
  {
    id: 4,
    username: 'teacher2',
    citizenId: '3100600987654',
    fullName: 'นางสาวใฝ่เรียน รักเด็ก (ครูผู้รับผิดชอบโครงการ)',
    email: 'teacher2@school.ac.th',
    role: 'teacher',
    department: 'ฝ่ายบริหารงานทั่วไป',
    position: 'ครู คศ.1 / ผู้รับผิดชอบกิจกรรมนักเรียน',
    phone: '086-000-0004',
    schoolId: 1,
    isActive: true,
  },
];

export const cleanInitialStudents: StudentLevel[] = [
  { id: 1, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 1', stage: 'อนุบาล', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 2, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 2', stage: 'อนุบาล', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 3, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 3', stage: 'อนุบาล', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 4, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 1', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 5, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 2', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 6, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 3', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 7, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 4', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 8, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 5', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
  { id: 9, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 6', stage: 'ประถม', maleCount: 10, femaleCount: 10, totalCount: 20 },
];

export const cleanInitialRevenues: RevenueItem[] = [
  {
    id: 1,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'subsidy',
    itemName: '1. เงินอุดหนุนรายหัว (การจัดการศึกษาขั้นพื้นฐาน)',
    ratePerHead: 1980,
    eligibleCount: 180,
    calculatedAmount: 356400,
    isCustomRate: false,
    note: 'เงินอุดหนุนรายหัวตามเกณฑ์ สพฐ. ประจำปีงบประมาณ พ.ศ. 2568',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'activity',
    itemName: '2. เงินกิจกรรมพัฒนาผู้เรียน (4 กิจกรรมหลัก สพฐ.)',
    ratePerHead: 460,
    eligibleCount: 180,
    calculatedAmount: 82800,
    isCustomRate: false,
    note: 'วิชาการ, คุณธรรม, ทัศนศึกษา, เทคโนโลยี ICT',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '3. ค่าหนังสือเรียน (โครงการเรียนฟรี 15 ปี)',
    ratePerHead: 650,
    eligibleCount: 180,
    calculatedAmount: 117000,
    isCustomRate: false,
    note: 'จัดสรรตามเกณฑ์ระดับการศึกษา สพฐ.',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '4. ค่าเครื่องแบบนักเรียน (2 ชุด/คน/ปี)',
    ratePerHead: 380,
    eligibleCount: 180,
    calculatedAmount: 68400,
    isCustomRate: false,
    note: 'เงินอุดหนุนเครื่องแบบนักเรียน',
  },
  {
    id: 5,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '5. ค่าอุปกรณ์การเรียน',
    ratePerHead: 400,
    eligibleCount: 180,
    calculatedAmount: 72000,
    isCustomRate: false,
    note: 'สมุด ดินสอ ยางลบ สี ไม้บรรทัด',
  },
  {
    id: 6,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'revenue',
    itemName: '6. เงินรายได้สถานศึกษา / เงินระดมทรัพยากร',
    ratePerHead: 0,
    eligibleCount: 1,
    calculatedAmount: 50000,
    isCustomRate: true,
    note: 'ดอกเบี้ยเงินฝากธนาคาร และเงินบำรุงสถานศึกษา',
  },
];

export const cleanInitialBudgetAllocations: BudgetAllocation[] = [
  {
    id: 1,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานวิชาการ',
    percentage: 55,
    allocatedAmount: 410630,
    spentAmount: 0,
    remainingAmount: 410630,
    colorHex: '#2563eb',
    description: 'พัฒนาหลักสูตร การจัดการเรียนการสอน สื่อ นวัตกรรม และประกันคุณภาพ',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานงบประมาณ',
    percentage: 10,
    allocatedAmount: 74660,
    spentAmount: 0,
    remainingAmount: 74660,
    colorHex: '#0284c7',
    description: 'การเงิน บัญชี พัสดุ สินทรัพย์ และแผนงานงบประมาณโรงเรียน',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานบุคคล',
    percentage: 10,
    allocatedAmount: 74660,
    spentAmount: 0,
    remainingAmount: 74660,
    colorHex: '#059669',
    description: 'พัฒนาครู วินัย สวัสดิการ ทัศนศึกษาดูงาน และสรรหาบุคลากร',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานทั่วไป',
    percentage: 10,
    allocatedAmount: 74660,
    spentAmount: 0,
    remainingAmount: 74660,
    colorHex: '#d97706',
    description: 'อาคารสถานที่ สิ่งแวดล้อม ประชาสัมพันธ์ และชุมชนสัมพันธ์',
  },
  {
    id: 5,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'งบกลาง / สำรองจ่ายฉุกเฉิน',
    percentage: 15,
    allocatedAmount: 111990,
    spentAmount: 0,
    remainingAmount: 111990,
    colorHex: '#7c3aed',
    description: 'กันไว้สำหรับค่าสาธารณูปโภค (ไฟฟ้า/ประปา/โทรศัพท์) และสำรองจ่ายฉุกเฉิน',
    isContingency: true,
    contingencySubItems: [
      { id: 'c1', name: 'ค่ากระแสไฟฟ้า', allocatedAmount: 45000, spentAmount: 0, description: 'ค่าไฟฟ้าสถานศึกษา' },
      { id: 'c2', name: 'ค่าน้ำประปาและสาธารณูปโภค', allocatedAmount: 15000, spentAmount: 0, description: 'ค่าน้ำประปาและระบบสุขาภิบาล' },
      { id: 'c3', name: 'ค่าสัญญาณอินเทอร์เน็ต', allocatedAmount: 12000, spentAmount: 0, description: 'ระบบเครือข่ายและสื่อสาร' },
      { id: 'c4', name: 'งบสำรองจ่ายฉุกเฉินและซ่อมแซม', allocatedAmount: 39990, spentAmount: 0, description: 'ซ่อมบำรุงเร่งด่วน' },
    ],
  },
];

export const cleanInitialLearnerActivities: LearnerActivity[] = [
  {
    id: 1,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '1. กิจกรรมวิชาการ (ค่ายภาษาไทย, คณิตศาสตร์, วิทยาศาสตร์, ภาษาอังกฤษ)',
    percentage: 35,
    allocatedAmount: 28980,
    spentAmount: 0,
    remainingAmount: 28980,
    note: 'เน้นทักษะการคิดและการสื่อสารตามเกณฑ์ สพฐ.',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '2. กิจกรรมคุณธรรม จริยธรรม ลูกเสือ เนตรนารี และค่ายคุณธรรม',
    percentage: 25,
    allocatedAmount: 20700,
    spentAmount: 0,
    remainingAmount: 20700,
    note: 'ค่ายพุทธบุตร และการอยู่ค่ายพักแรมลูกเสือ',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '3. กิจกรรมทัศนศึกษา แหล่งเรียนรู้นอกสถานที่',
    percentage: 20,
    allocatedAmount: 16560,
    spentAmount: 0,
    remainingAmount: 16560,
    note: 'ศึกษาแหล่งเรียนรู้นอกสถานที่',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '4. การให้บริการเทคโนโลยีสารสนเทศและการสื่อสาร (ICT/Coding)',
    percentage: 20,
    allocatedAmount: 16560,
    spentAmount: 0,
    remainingAmount: 16560,
    note: 'คอมพิวเตอร์และเทคโนโลยีดิจิทัล',
  },
];

export const cleanInitialStrategies: Strategy[] = [
  {
    id: 1,
    schoolId: 1,
    fiscalYearId: 1,
    code: 'ยุทธศาสตร์ที่ 1',
    name: 'พัฒนาคุณภาพผู้เรียนตามมาตรฐานการศึกษาขั้นพื้นฐานและศตวรรษที่ 21',
    description: 'ยกระดับผลสัมฤทธิ์ทางการเรียน RT, NT, O-NET และสมรรถนะผู้เรียน',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    code: 'ยุทธศาสตร์ที่ 2',
    name: 'ส่งเสริมคุณธรรม จริยธรรม วิถีประชาธิปไตย และค่านิยมไทย',
    description: 'สร้างจิตสำนึกความเป็นไทย ความรับผิดชอบต่อส่วนรวม และรักษ์สิ่งแวดล้อม',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    code: 'ยุทธศาสตร์ที่ 3',
    name: 'พัฒนาครูและบุคลากรทางการศึกษาสู่ความเป็นครูมืออาชีพ',
    description: 'ส่งเสริมการจัดการเรียนรู้ Active Learning และนวัตกรรมดิจิทัล',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    code: 'ยุทธศาสตร์ที่ 4',
    name: 'พัฒนาระบบบริหารจัดการด้วยเทคโนโลยีและการมีส่วนร่วมของทุกภาคส่วน',
    description: 'พัฒนาสภาพแวดล้อม อาคารสถานที่ สื่อเทคโนโลยี และประสานชุมชน',
  },
];

// Clean empty projects array
export const cleanInitialProjects: Project[] = [];

export const cleanInitialTransactions: BudgetTransaction[] = [];

// Get complete clean initial state
export function getCleanDatabaseState(): AppDatabaseState {
  return {
    school: { ...cleanInitialSchool },
    fiscalYears: [...cleanInitialFiscalYears],
    users: [...cleanInitialUsers],
    students: [...cleanInitialStudents],
    revenues: [...cleanInitialRevenues],
    allocations: [...cleanInitialBudgetAllocations],
    activities: [...cleanInitialLearnerActivities],
    projects: [...cleanInitialProjects],
    transactions: [...cleanInitialTransactions],
    strategies: [...cleanInitialStrategies],
  };
}

// Load database from localStorage or return clean initial state
export function loadDatabaseFromStorage(): AppDatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate that essential keys exist
      if (parsed.school && parsed.fiscalYears && parsed.users) {
        // Upgrade legacy names to user's preferred teacher/director example names
        if (parsed.school.directorName?.includes('นายตัวอย่าง')) {
          parsed.school.directorName = 'ดร.พัฒนา ก้าวหน้า (ผู้อำนวยการโรงเรียน)';
        }
        if (Array.isArray(parsed.users)) {
          parsed.users = parsed.users.map((u: User) => {
            if (u.username === 'admin' && u.fullName.includes('ผู้ดูแล แผนงานพัสดุ')) {
              return { ...u, fullName: 'นายวางแผน รอบคอบ (หัวหน้างานแผนงานและงบประมาณ)' };
            }
            if (u.username === 'director' && u.fullName.includes('นายตัวอย่าง')) {
              return { ...u, fullName: 'ดร.พัฒนา ก้าวหน้า (ผู้อำนวยการโรงเรียน)' };
            }
            if (u.username === 'teacher1' && u.fullName.includes('ครูดี มีวิชา')) {
              return { ...u, fullName: 'ครูสอนดี เก่งมาก (ครูผู้รับผิดชอบโครงการ)', position: 'ครูชำนาญการ / ผู้รับผิดชอบโครงการ' };
            }
            return u;
          });
        }
        if (Array.isArray(parsed.projects)) {
          parsed.projects = parsed.projects.map((p: Project) => ({
            ...p,
            originalProposedBudget: p.originalProposedBudget ?? p.allocatedBudget,
          }));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load database from localStorage:', e);
  }
  const cleanState = getCleanDatabaseState();
  saveDatabaseToStorage(cleanState);
  return cleanState;
}

// Save complete database state to localStorage and optionally sync to server
export function saveDatabaseToStorage(state: AppDatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Asynchronously sync to backend storage file for persistence verification
    fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {
      // Ignore background fetch error in offline or mock mode
    });
  } catch (e) {
    console.error('Failed to save database to localStorage:', e);
  }
}

// Reset database to clean starting state
export function resetDatabaseStorage(): AppDatabaseState {
  const cleanState = getCleanDatabaseState();
  saveDatabaseToStorage(cleanState);
  return cleanState;
}
