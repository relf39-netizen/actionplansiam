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
    totalStudents: 0,
    teacherCount: 0,
    subsidyRateKindergarten: 1800,
    subsidyRatePrimary: 2050,
    subsidyRateSecondaryLower: 3500,
    subsidyRateSecondaryUpper: 3800,
    isProposalOpen: true,
    proposalOpenDate: '2024-10-01',
    proposalCloseDate: '2025-09-30',
    proposalNotice: 'เปิดรับการเสนอโครงการตามแผนปฏิบัติการประจำปีงบประมาณ',
  },
];

export const cleanInitialUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    citizenId: '',
    fullName: 'ผู้ดูแลระบบงานแผนงาน (Admin)',
    email: 'admin@school.ac.th',
    role: 'admin',
    department: 'ฝ่ายบริหารงานงบประมาณ',
    position: 'หัวหน้างานแผนงานและงบประมาณ',
    phone: '',
    schoolId: 1,
    isActive: true,
  },
];

export const cleanInitialStudents: StudentLevel[] = [
  { id: 1, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 1', stage: 'อนุบาล', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 2, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 2', stage: 'อนุบาล', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 3, schoolId: 1, fiscalYearId: 1, gradeLevel: 'อนุบาล 3', stage: 'อนุบาล', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 4, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 1', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 5, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 2', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 6, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 3', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 7, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 4', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 8, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 5', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 9, schoolId: 1, fiscalYearId: 1, gradeLevel: 'ประถมศึกษาปีที่ 6', stage: 'ประถม', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 10, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 1', stage: 'มัธยมต้น', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 11, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 2', stage: 'มัธยมต้น', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 12, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 3', stage: 'มัธยมต้น', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 13, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 4', stage: 'มัธยมปลาย', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 14, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 5', stage: 'มัธยมปลาย', maleCount: 0, femaleCount: 0, totalCount: 0 },
  { id: 15, schoolId: 1, fiscalYearId: 1, gradeLevel: 'มัธยมศึกษาปีที่ 6', stage: 'มัธยมปลาย', maleCount: 0, femaleCount: 0, totalCount: 0 },
];

export const cleanInitialRevenues: RevenueItem[] = [
  {
    id: 1,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'subsidy',
    itemName: '1.1 เงินอุดหนุนรายหัว ระดับก่อนประถมศึกษา (อนุบาล)',
    ratePerHead: 1800,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 1,800 บาท/คน/ปี',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'subsidy',
    itemName: '1.2 เงินอุดหนุนรายหัว ระดับประถมศึกษา (ป.1 - ป.6)',
    ratePerHead: 2050,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 2,050 บาท/คน/ปี',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'subsidy',
    itemName: '1.3 เงินอุดหนุนรายหัว ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    ratePerHead: 3700,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 3,700 บาท/คน/ปี',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'subsidy',
    itemName: '1.4 เงินอุดหนุนรายหัว ระดับมัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    ratePerHead: 4100,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 4,100 บาท/คน/ปี',
  },
  {
    id: 5,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'activity',
    itemName: '2.1 เงินกิจกรรมพัฒนาผู้เรียน ระดับก่อนประถมศึกษา (อนุบาล)',
    ratePerHead: 464,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 464 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    id: 6,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'activity',
    itemName: '2.2 เงินกิจกรรมพัฒนาผู้เรียน ระดับประถมศึกษา (ป.1 - ป.6)',
    ratePerHead: 518,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 518 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    id: 7,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'activity',
    itemName: '2.3 เงินกิจกรรมพัฒนาผู้เรียน ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    ratePerHead: 966,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 966 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    id: 8,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'activity',
    itemName: '2.4 เงินกิจกรรมพัฒนาผู้เรียน ระดับมัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    ratePerHead: 1026,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เกณฑ์ สพฐ. 1,026 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    id: 9,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '3. ค่าหนังสือเรียน (โครงการเรียนฟรี 15 ปี)',
    ratePerHead: 650,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'จัดสรรตามเกณฑ์ระดับการศึกษา สพฐ.',
  },
  {
    id: 10,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '4. ค่าเครื่องแบบนักเรียน (2 ชุด/คน/ปี)',
    ratePerHead: 380,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'เงินอุดหนุนเครื่องแบบนักเรียน',
  },
  {
    id: 11,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'welfare',
    itemName: '5. ค่าอุปกรณ์การเรียน',
    ratePerHead: 400,
    eligibleCount: 0,
    calculatedAmount: 0,
    isCustomRate: false,
    note: 'สมุด ดินสอ ยางลบ สี ไม้บรรทัด',
  },
  {
    id: 12,
    schoolId: 1,
    fiscalYearId: 1,
    category: 'revenue',
    itemName: '6. เงินรายได้สถานศึกษา / เงินระดมทรัพยากร',
    ratePerHead: 0,
    eligibleCount: 0,
    calculatedAmount: 0,
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
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    colorHex: '#2563eb',
    description: 'พัฒนาหลักสูตร การจัดการเรียนการสอน สื่อ นวัตกรรม และประกันคุณภาพ',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานงบประมาณ',
    percentage: 10,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    colorHex: '#0284c7',
    description: 'การเงิน บัญชี พัสดุ สินทรัพย์ และแผนงานงบประมาณโรงเรียน',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานบุคคล',
    percentage: 10,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    colorHex: '#059669',
    description: 'พัฒนาครู วินัย สวัสดิการ ทัศนศึกษาดูงาน และสรรหาบุคลากร',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'ฝ่ายบริหารงานทั่วไป',
    percentage: 10,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    colorHex: '#d97706',
    description: 'อาคารสถานที่ สิ่งแวดล้อม ประชาสัมพันธ์ และชุมชนสัมพันธ์',
  },
  {
    id: 5,
    schoolId: 1,
    fiscalYearId: 1,
    departmentName: 'งบกลาง / สำรองจ่ายฉุกเฉิน',
    percentage: 15,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    colorHex: '#7c3aed',
    description: 'กันไว้สำหรับค่าสาธารณูปโภค (ไฟฟ้า/ประปา/โทรศัพท์) และสำรองจ่ายฉุกเฉิน',
    isContingency: true,
    contingencySubItems: [
      { id: 'c1', name: 'ค่ากระแสไฟฟ้า', allocatedAmount: 0, spentAmount: 0, description: 'ค่าไฟฟ้าสถานศึกษา' },
      { id: 'c2', name: 'ค่าน้ำประปาและสาธารณูปโภค', allocatedAmount: 0, spentAmount: 0, description: 'ค่าน้ำประปาและระบบสุขาภิบาล' },
      { id: 'c3', name: 'ค่าสัญญาณอินเทอร์เน็ต', allocatedAmount: 0, spentAmount: 0, description: 'ระบบเครือข่ายและสื่อสาร' },
      { id: 'c4', name: 'งบสำรองจ่ายฉุกเฉินและซ่อมแซม', allocatedAmount: 0, spentAmount: 0, description: 'ซ่อมบำรุงเร่งด่วน' },
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
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    note: 'เน้นทักษะการคิดและการสื่อสารตามเกณฑ์ สพฐ.',
  },
  {
    id: 2,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '2. กิจกรรมคุณธรรม จริยธรรม ลูกเสือ เนตรนารี และค่ายคุณธรรม',
    percentage: 25,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    note: 'ค่ายพุทธบุตร และการอยู่ค่ายพักแรมลูกเสือ',
  },
  {
    id: 3,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '3. กิจกรรมทัศนศึกษา แหล่งเรียนรู้นอกสถานที่',
    percentage: 20,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    note: 'ศึกษาแหล่งเรียนรู้นอกสถานที่',
  },
  {
    id: 4,
    schoolId: 1,
    fiscalYearId: 1,
    activityName: '4. การให้บริการเทคโนโลยีสารสนเทศและการสื่อสาร (ICT/Coding)',
    percentage: 20,
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
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
