import React, { useState, useEffect } from 'react';
import { 
  ProjectProposal, 
  ProjectProposalActivity, 
  ProjectExpenseItem, 
  School, 
  FiscalYear, 
  Strategy, 
  Project,
  User
} from '../types';
import { exportProjectProposalToWordDoc } from '../utils/exportUtils';
import { 
  Sparkles, 
  Bot, 
  FileText, 
  Download, 
  Printer, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Key, 
  RefreshCw, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Edit3, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  Lock,
  Unlock,
  BellRing,
  UserCheck
} from 'lucide-react';

function formatCitizenId(id?: string) {
  if (!id) return '';
  const clean = id.replace(/\D/g, '');
  if (clean.length !== 13) return id;
  return `${clean[0]}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean[12]}`;
}

interface AiProjectWriterViewProps {
  school: School;
  fiscalYear: FiscalYear;
  strategies?: Strategy[];
  users?: User[];
  onSaveToProjects: (newProject: Project) => void;
  onNavigateToProjects: () => void;
}

const PRESET_TOPICS = [
  {
    title: 'โครงการยกระดับผลสัมฤทธิ์ทางการเรียนและการทดสอบระดับชาติ (O-NET / NT)',
    dept: 'ฝ่ายวิชาการ',
    budget: 35000,
    target: 'นักเรียนระดับชั้น ป.3 และ ป.6 ทุกคน',
    focus: 'เน้นการจัดค่ายวิชาการ เทคนิคการคิดวิเคราะห์ และการฝึกทำข้อสอบเชิงลึก',
  },
  {
    title: 'โครงการพัฒนาทักษะดิจิทัลและการรู้เท่าทันปัญญาประดิษฐ์ (AI Literacy) เพื่อการเรียนรู้ในศตวรรษที่ 21',
    dept: 'ฝ่ายวิชาการ',
    budget: 40000,
    target: 'นักเรียนชั้น ป.4 - ป.6 และครูผู้สอน',
    focus: 'ส่งเสริมการใช้เครื่องมือ AI ในการสืบค้นข้อมูล การเขียนโปรแกรมเบื้องต้น และความปลอดภัยไซเบอร์',
  },
  {
    title: 'โครงการส่งเสริมคุณธรรม จริยธรรม และวิถีประชาธิปไตยในสถานศึกษา (โรงเรียนสุจริต)',
    dept: 'ฝ่ายบุคคล',
    budget: 25000,
    target: 'นักเรียนและบุคลากรในโรงเรียนทุกคน',
    focus: 'กิจกรรมสภานักเรียน โครงงานคุณธรรมประจำห้องเรียน และการสร้างความซื่อสัตย์สุจริต',
  },
  {
    title: 'โครงการส่งเสริมสุขภาพ กีฬา และสุขภาวะโภชนาการในโรงเรียน (โรงเรียนส่งเสริมสุขภาพ)',
    dept: 'ฝ่ายบริหารทั่วไป',
    budget: 30000,
    target: 'นักเรียนระดับชั้นอนุบาล 1 ถึงประถมศึกษาปีที่ 6',
    focus: 'กิจกรรมกีฬาภายใน การตรวจสุขภาพประจำปี และการให้ความรู้ด้านโภชนาการลดหวานมันเค็ม',
  },
  {
    title: 'โครงการเกษตรเพื่ออาหารกลางวันและศูนย์เรียนรู้ตามหลักปรัชญาของเศรษฐกิจพอเพียง',
    dept: 'ฝ่ายบริหารทั่วไป',
    budget: 28000,
    target: 'นักเรียนและชุมชนรอบโรงเรียน',
    focus: 'แปลงผักอินทรีย์ การเลี้ยงปลาดุก บัญชีครัวเรือน และการบูรณาการสู่อาหารกลางวันนักเรียน',
  },
  {
    title: 'โครงการปรับปรุงซ่อมแซมอาคารสถานที่และพัฒนาสิ่งแวดล้อมเพื่อความปลอดภัย (Safety School)',
    dept: 'ฝ่ายบริหารทั่วไป',
    budget: 45000,
    target: 'อาคารเรียน ห้องน้ำ ลานกิจกรรม และระบบความปลอดภัย',
    focus: 'ซ่อมแซมจุดเสี่ยง ทาสีอาคาร ปรับปรุงระบบไฟฟ้า และติดตั้งไฟส่องสว่างเพื่อความปลอดภัย',
  },
];

export const AiProjectWriterView: React.FC<AiProjectWriterViewProps> = ({
  school,
  fiscalYear,
  strategies = [],
  users = [],
  onSaveToProjects,
  onNavigateToProjects,
}) => {
  // Form input states
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<'ใหม่' | 'ต่อเนื่อง'>('ใหม่');
  const [department, setDepartment] = useState('ฝ่ายวิชาการ');
  const [strategyName, setStrategyName] = useState('');
  const [targetGroup, setTargetGroup] = useState('นักเรียนและครูผู้สอน');
  const [estimatedBudget, setEstimatedBudget] = useState<number>(30000);
  const [duration, setDuration] = useState(`ตลอดปีการศึกษา ${fiscalYear.year}`);
  const [specialFocus, setSpecialFocus] = useState('');
  const [promptNotes, setPromptNotes] = useState('');

  // Signatories states (Proposer, Endorser, Approver)
  const [proposerName, setProposerName] = useState('');
  const [proposerPosition, setProposerPosition] = useState('ครูผู้รับผิดชอบโครงการ');
  const [proposerCitizenId, setProposerCitizenId] = useState('');
  const [selectedProposerId, setSelectedProposerId] = useState<string>('custom');

  const [endorserName, setEndorserName] = useState('นายพิเชษฐ์ ปัญญาวงศ์');
  const [endorserPosition, setEndorserPosition] = useState('หัวหน้ากลุ่มงานวิชาการ');
  const [selectedEndorserId, setSelectedEndorserId] = useState<string>('custom');

  const [approverName, setApproverName] = useState(school.directorName || 'ดร.สมศักดิ์ พัฒนศึกษา');
  const [approverPosition, setApproverPosition] = useState(`ผู้อำนวยการโรงเรียน${school.name}`);
  const [selectedApproverId, setSelectedApproverId] = useState<string>('custom');

  const [attachmentName, setAttachmentName] = useState('');

  // API Key states
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasSystemKey, setHasSystemKey] = useState<boolean | null>(null);

  // Generation & Results states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProjectProposal | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'edit'>('form');

  // Load custom API key from localStorage & check system key
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_custom_api_key') || '';
    setCustomApiKey(storedKey);

    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        setHasSystemKey(data.hasSystemKey);
      })
      .catch(() => {
        setHasSystemKey(false);
      });
  }, []);

  // Initialize signatories from users if available
  useEffect(() => {
    if (users && users.length > 0) {
      if (!proposerName) {
        const teacher = users.find((u) => u.role === 'teacher') || users[0];
        if (teacher) {
          setProposerName(teacher.fullName);
          setProposerPosition(teacher.position || 'ครูผู้รับผิดชอบโครงการ');
          if (teacher.citizenId) setProposerCitizenId(teacher.citizenId);
          setSelectedProposerId(String(teacher.id));
        }
      }

      if (endorserName === 'นายพิเชษฐ์ ปัญญาวงศ์') {
        const endorserUser = users.find((u) => u.role === 'admin' || (u.department && u.department.includes('วิชาการ'))) || (users.length > 1 ? users[1] : users[0]);
        if (endorserUser) {
          setEndorserName(endorserUser.fullName);
          setEndorserPosition(endorserUser.position || `หัวหน้ากลุ่มงาน${endorserUser.department || 'วิชาการ'}`);
          setSelectedEndorserId(String(endorserUser.id));
        }
      }

      const director = users.find((u) => u.role === 'director');
      if (director) {
        setApproverName(director.fullName);
        setApproverPosition(director.position || `ผู้อำนวยการโรงเรียน${school.name}`);
        setSelectedApproverId(String(director.id));
      } else if (school.directorName) {
        setApproverName(school.directorName);
        setApproverPosition(`ผู้อำนวยการโรงเรียน${school.name}`);
      }
    }
  }, [users, school]);

  const handleSelectProposer = (userIdStr: string) => {
    setSelectedProposerId(userIdStr);
    if (userIdStr === 'custom') return;
    const u = users.find((usr) => String(usr.id) === userIdStr);
    if (u) {
      setProposerName(u.fullName);
      setProposerPosition(u.position || (u.role === 'teacher' ? 'ครูผู้รับผิดชอบโครงการ' : 'เจ้าหน้าที่โครงการ'));
      if (u.citizenId) setProposerCitizenId(u.citizenId);
      if (proposal) {
        setProposal({
          ...proposal,
          proposerName: u.fullName,
          proposerPosition: u.position || 'ครูผู้รับผิดชอบโครงการ',
          responsiblePerson: u.fullName,
          position: u.position || 'ครูผู้รับผิดชอบโครงการ',
        });
      }
    }
  };

  const handleSelectEndorser = (userIdStr: string) => {
    setSelectedEndorserId(userIdStr);
    if (userIdStr === 'custom') return;
    const u = users.find((usr) => String(usr.id) === userIdStr);
    if (u) {
      const pos = u.position || (u.department ? `หัวหน้ากลุ่มงาน${u.department}` : `หัวหน้ากลุ่มงาน${department}`);
      setEndorserName(u.fullName);
      setEndorserPosition(pos);
      if (proposal) {
        setProposal({
          ...proposal,
          endorserName: u.fullName,
          endorserPosition: pos,
        });
      }
    }
  };

  const handleSelectApprover = (userIdStr: string) => {
    setSelectedApproverId(userIdStr);
    if (userIdStr === 'custom') return;
    const u = users.find((usr) => String(usr.id) === userIdStr);
    if (u) {
      const pos = u.position || `ผู้อำนวยการโรงเรียน${school.name}`;
      setApproverName(u.fullName);
      setApproverPosition(pos);
      if (proposal) {
        setProposal({
          ...proposal,
          approverName: u.fullName,
          approverPosition: pos,
        });
      }
    }
  };

  // Save custom API key
  const handleSaveApiKey = (keyVal: string) => {
    const cleanKey = keyVal.trim();
    setCustomApiKey(cleanKey);
    localStorage.setItem('gemini_custom_api_key', cleanKey);
    setShowApiKeyModal(false);
  };

  // Apply quick preset
  const handleSelectPreset = (preset: typeof PRESET_TOPICS[0]) => {
    setProjectName(preset.title);
    setDepartment(preset.dept);
    setEstimatedBudget(preset.budget);
    setTargetGroup(preset.target);
    setSpecialFocus(preset.focus);
    if (strategies.length > 0) {
      setStrategyName(`${strategies[0].code} ${strategies[0].name}`);
    }
  };

  // Generate proposal
  const handleGenerate = async () => {
    if (fiscalYear.isProposalOpen === false) {
      alert(`ขณะนี้ระบบปิดรับการเสนอโครงการประจำปีงบประมาณ พ.ศ. ${fiscalYear.year}\n${fiscalYear.proposalNotice || 'กรุณาติดต่อฝ่ายแผนงานหรือผู้บริหารสถานศึกษา'}`);
      return;
    }

    if (!projectName.trim()) {
      alert('กรุณาระบุชื่อโครงการหรือเลือกจากตัวอย่างหัวข้อโครงการ');
      return;
    }

    setIsGenerating(true);
    setGenerationMessage(null);
    setSavedSuccess(false);

    const generateClientFallbackProposal = (): ProjectProposal => {
      const pName = projectName.trim() || 'โครงการพัฒนาคุณภาพการศึกษาและศักยภาพผู้เรียน';
      const pType = projectType || 'ใหม่';
      const dept = department || 'ฝ่ายวิชาการ';
      const strat = strategyName || `ยุทธศาสตร์พัฒนาคุณภาพการศึกษา สพฐ. ปี ${fiscalYear.year}`;
      const target = targetGroup || 'นักเรียนและคณะครูทุกคน';
      const budget = estimatedBudget > 0 ? estimatedBudget : 30000;
      const dur = duration || 'ตลอดปีการศึกษา 2568';
      const focus = specialFocus ? `โดยเน้นย้ำประเด็น ${specialFocus} ` : '';

      const pProposer = proposerName.trim() || 'ครูผู้รับผิดชอบโครงการ';
      const pProposerPos = proposerPosition.trim() || 'ครูผู้รับผิดชอบโครงการ';
      const pEndorser = endorserName.trim() || 'ผู้เห็นชอบโครงการ';
      const pEndorserPos = endorserPosition.trim() || `หัวหน้ากลุ่มงาน${dept}`;
      const pApprover = approverName.trim() || school.directorName || 'ผู้อำนวยการโรงเรียน';
      const pApproverPos = approverPosition.trim() || `ผู้อำนวยการโรงเรียน${school.name}`;

      const bMat = Math.round(budget * 0.45);
      const bAct = Math.round(budget * 0.35);
      const bRem = budget - bMat - bAct;

      return {
        projectCode: `วช.${Math.floor(10 + Math.random() * 89)}/${fiscalYear.year}`,
        projectName: pName,
        projectType: pType as 'ใหม่' | 'ต่อเนื่อง',
        department: dept,
        strategyAlignment: strat,
        responsiblePerson: pProposer,
        position: pProposerPos,
        proposerName: pProposer,
        proposerPosition: pProposerPos,
        endorserName: pEndorser,
        endorserPosition: pEndorserPos,
        approverName: pApprover,
        approverPosition: pApproverPos,
        rationale: `สืบเนื่องจากนโยบายสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) และกระทรวงศึกษาธิการ ที่มุ่งเน้นการยกระดับคุณภาพการศึกษาและพัฒนาสมรรถนะผู้เรียนในศตวรรษที่ 21 การดำเนิน ${pName} จึงมีความสำคัญอย่างยิ่งต่อการพัฒนาคุณภาพการเรียนการสอนและการบริหารจัดการสถานศึกษา\n\nการดำเนินงานมุ่งเน้นการมีส่วนร่วมของบุคลากรทางการศึกษา ผู้เรียน และชุมชน ${focus}เพื่อให้บรรลุผลสัมฤทธิ์ตามเป้าหมายของแผนปฏิบัติการประจำปีอย่างมีประสิทธิภาพและคุ้มค่าสูงสุด`,
        objectives: [
          `เพื่อส่งเสริมและพัฒนาการดำเนินงาน ${pName} ให้บรรลุตามเป้าหมายมาตรฐานการศึกษา`,
          `เพื่อเปิดโอกาสให้กลุ่มเป้าหมาย (${target}) ได้รับการพัฒนาทักษะและความรู้อย่างเต็มศักยภาพ`,
          `เพื่อสร้างเครือข่ายความร่วมมือและการจัดการเรียนรู้เชิงรุก (Active Learning) ในสถานศึกษา`,
        ],
        quantitativeTarget: `กลุ่มเป้าหมาย (${target}) ได้รับการพัฒนาและเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ 85 ของจำนวนทั้งหมด`,
        qualitativeTarget: `ผู้เข้าร่วมกิจกรรมมีความรู้ ทักษะ และสามารถนำความรู้ไปประยุกต์ใช้ในการเรียนและการปฏิบัติงานได้ในระดับดีขึ้นไป`,
        timeline: dur,
        location: 'สถานศึกษาและแหล่งเรียนรู้ที่เกี่ยวข้อง',
        activities: [
          { phase: 'ขั้นวางแผน (Plan)', description: 'แต่งตั้งคณะทำงาน ประชุมวางแผนกำหนดกรอบงาน และจัดทำเครื่องมือวัดผล', duration: 'เดือนที่ 1', responsible: pProposer },
          { phase: 'ขั้นปฏิบัติการ (Do)', description: 'ดำเนินกิจกรรมตามโครงการ อบรมเชิงปฏิบัติการ และส่งเสริมการเรียนรู้', duration: 'เดือนที่ 2-6', responsible: 'คณะทำงานโครงการ' },
          { phase: 'ขั้นตรวจสอบ (Check)', description: 'นิเทศ ติดตามผล ประเมินความพึงพอใจ และทดสอบสมรรถนะตามตัวชี้วัด', duration: 'เดือนที่ 7-8', responsible: pEndorser },
          { phase: 'ขั้นปรับปรุงและรายงาน (Action)', description: 'สรุปผลการดำเนินงาน จัดทำรูปเล่มรายงาน และนำข้อเสนอแนะไปพัฒนาในรอบปีถัดไป', duration: 'เดือนที่ 9-10', responsible: pProposer },
        ],
        expenseItems: [
          { id: 1, projectId: 0, itemName: 'ค่าวัสดุ อุปกรณ์ และสื่อการดำเนินกิจกรรมโครงการ', category: 'ค่าวัสดุ', quantity: 1, unit: 'ชุด', unitPrice: bMat, totalAmount: bMat },
          { id: 2, projectId: 0, itemName: 'ค่าตอบแทนวิทยากร / คณะทำงานโครงการ', category: 'ค่าตอบแทน', quantity: 1, unit: 'งาน', unitPrice: bAct, totalAmount: bAct },
          { id: 3, projectId: 0, itemName: 'ค่าใช้สอย ค่าอาหารว่างและเครื่องดื่ม และเอกสารสรุปผล', category: 'ค่าใช้สอย', quantity: 1, unit: 'ชุด', unitPrice: bRem, totalAmount: bRem },
        ],
        totalBudget: budget,
        budgetSource: `เงินอุดหนุนรายหัว สพฐ. ประจำปีงบประมาณ ${fiscalYear.year}`,
        kpis: 'ร้อยละ 85 ของผู้เข้าร่วมโครงการมีความพึงพอใจและมีผลสัมฤทธิ์ผ่านเกณฑ์มาตรฐาน',
        evaluationMethods: 'แบบประเมินความพึงพอใจ, แบบทดสอบก่อน-หลังการจัดกิจกรรม, และการนิเทศติดตามผล',
        expectedBenefits: [
          'กลุ่มเป้าหมายได้รับการยกระดับคุณภาพและมีทักษะสอดคล้องกับมาตรฐานการศึกษา',
          'สถานศึกษามีผลสัมฤทธิ์และการดำเนินงานตามแผนปฏิบัติการประจำปีที่เป็นระบบและตรวจสอบได้',
          'เกิดแนวปฏิบัติที่ดี (Best Practice) ในการบริหารจัดการศึกษาของสถานศึกษา',
        ],
        proposedBy: `(ลงชื่อ).......................................................... ผู้เสนอโครงการ\n(${pProposer})\nตำแหน่ง ${pProposerPos}`,
        acknowledgedBy: `(ลงชื่อ).......................................................... ผู้เห็นชอบโครงการ\n(${pEndorser})\nตำแหน่ง ${pEndorserPos}`,
      };
    };

    try {
      let genData: ProjectProposal | null = null;
      let sourceName: 'gemini_ai' | 'template_fallback' | 'fallback_error' = 'template_fallback';
      let sourceMessage = '';

      // 1. ลองส่งคำขอผ่าน Backend Server / PHP Bridge
      try {
        const response = await fetch('/api/ai/generate-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectName,
            projectType,
            department,
            strategyName: strategyName || `ยุทธศาสตร์พัฒนาคุณภาพการศึกษา สพฐ. ปี ${fiscalYear.year}`,
            targetGroup,
            estimatedBudget,
            duration,
            specialFocus,
            prompt: promptNotes,
            customApiKey: customApiKey || undefined,
            proposerName: proposerName.trim() || undefined,
            proposerPosition: proposerPosition.trim() || undefined,
            endorserName: endorserName.trim() || undefined,
            endorserPosition: endorserPosition.trim() || undefined,
            approverName: approverName.trim() || undefined,
            approverPosition: approverPosition.trim() || undefined,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            genData = resData.data;
            sourceName = resData.source || 'gemini_ai';
            sourceMessage = resData.message || '';
          }
        }
      } catch (backendErr) {
        console.warn('Backend AI route failed or offline, checking direct browser fallback...', backendErr);
      }

      // 2. ถ้าเซิร์ฟเวอร์ยังไม่ตอบรับและมี Custom API Key ให้ลองเรียก Google Generative AI REST โดยตรงจากเบราว์เซอร์
      if (!genData && customApiKey && customApiKey.trim().length > 10) {
        try {
          const cleanKey = customApiKey.trim();
          const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;
          const sysPrompt = 'คุณคือผู้เชี่ยวชาญด้านการวางแผนการศึกษาและผู้ช่วยเขียนโครงการตามระเบียบของสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) ร่างข้อเสนอโครงการทางการศึกษาฉบับสมบูรณ์ ส่งออกเป็น JSON Object เท่านั้น โดยต้องมีฟิลด์: projectCode, projectName, projectType, department, strategyAlignment, responsiblePerson, position, proposerName, proposerPosition, endorserName, endorserPosition, approverName, approverPosition, rationale, objectives (array), quantitativeTarget, qualitativeTarget, timeline, location, activities (array of {phase, description, duration, responsible}), expenseItems (array of {id, itemName, category, quantity, unit, unitPrice, totalAmount}), totalBudget (number), budgetSource, kpis, evaluationMethods, expectedBenefits (array), proposedBy, acknowledgedBy';
          
          const userText = `กรุณาร่างโครงการ: ${projectName}, ฝ่าย: ${department}, งบประมาณ: ${estimatedBudget} บาท, กลุ่มเป้าหมาย: ${targetGroup}, ระยะเวลา: ${duration}, ประเด็นเน้นย้ำ: ${specialFocus}`;
          
          const restRes = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: userText }] }],
              systemInstruction: { parts: [{ text: sysPrompt }] },
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
            })
          });

          if (restRes.ok) {
            const rawJson = await restRes.json();
            const textPart = rawJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              const cleanPart = textPart.replace(/```(?:json)?/gi, '').trim();
              const parsed = JSON.parse(cleanPart);
              if (parsed && parsed.projectName) {
                genData = parsed;
                sourceName = 'gemini_ai';
                sourceMessage = 'สร้างข้อเสนอโครงการด้วย Gemini 2.5 Flash สำเร็จ';
              }
            }
          }
        } catch (clientGeminiErr) {
          console.warn('Direct client-side Gemini call encountered an issue:', clientGeminiErr);
        }
      }

      // 3. หากระบบภายนอกทั้งหมดไม่ตอบสนอง ให้สร้างร่างโครงการฉบับสมบูรณ์ด้วยแบบฟอร์มมาตรฐาน สพฐ. ทันที
      if (!genData) {
        genData = generateClientFallbackProposal();
        sourceName = 'template_fallback';
        sourceMessage = 'สร้างโครงร่างโครงการตามมาตรฐานแบบฟอร์ม สพฐ. เรียบร้อย';
      }

      // Synchronize selected/entered signatories into proposal
      const pName = proposerName.trim() || genData.proposerName || genData.responsiblePerson || 'ครูผู้เสนอโครงการ';
      const pPos = proposerPosition.trim() || genData.proposerPosition || genData.position || 'ครูผู้รับผิดชอบโครงการ';
      const eName = endorserName.trim() || genData.endorserName || 'ผู้เห็นชอบโครงการ';
      const ePos = endorserPosition.trim() || genData.endorserPosition || `หัวหน้ากลุ่มงาน${department}`;
      const aName = approverName.trim() || genData.approverName || school.directorName || 'ผู้อำนวยการโรงเรียน';
      const aPos = approverPosition.trim() || genData.approverPosition || `ผู้อำนวยการโรงเรียน${school.name}`;

      genData.proposerName = pName;
      genData.proposerPosition = pPos;
      genData.responsiblePerson = pName;
      genData.position = pPos;
      genData.endorserName = eName;
      genData.endorserPosition = ePos;
      genData.approverName = aName;
      genData.approverPosition = aPos;

      setProposal(genData);
      setGenerationSource(sourceName);
      if (sourceMessage) {
        setGenerationMessage(sourceMessage);
      }
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Error generating project proposal:', err);
      // Fallback proposal guaranteed
      const fallbackData = generateClientFallbackProposal();
      setProposal(fallbackData);
      setGenerationSource('template_fallback');
      setGenerationMessage('สร้างโครงร่างโครงการตามระเบียบ สพฐ. เรียบร้อยแล้ว');
      setActiveTab('preview');
    } finally {
      setIsGenerating(false);
    }
  };

  // In-place edits on proposal
  const handleUpdateField = (field: keyof ProjectProposal, value: any) => {
    if (!proposal) return;
    setProposal({ ...proposal, [field]: value });
  };

  // Objective item edit/add/delete
  const handleObjectiveChange = (index: number, val: string) => {
    if (!proposal) return;
    const updated = [...proposal.objectives];
    updated[index] = val;
    setProposal({ ...proposal, objectives: updated });
  };

  const handleAddObjective = () => {
    if (!proposal) return;
    setProposal({
      ...proposal,
      objectives: [...proposal.objectives, 'เพื่อ...'],
    });
  };

  const handleRemoveObjective = (index: number) => {
    if (!proposal) return;
    const updated = proposal.objectives.filter((_, i) => i !== index);
    setProposal({ ...proposal, objectives: updated });
  };

  // Expense item edits with real-time recalculation
  const handleExpenseChange = (id: number, field: keyof ProjectExpenseItem, val: any) => {
    if (!proposal) return;
    const updatedExpenses = proposal.expenseItems.map((item) => {
      if (item.id === id) {
        const next = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          const q = field === 'quantity' ? Number(val) || 0 : item.quantity;
          const p = field === 'unitPrice' ? Number(val) || 0 : item.unitPrice;
          next.totalAmount = Math.round(q * p * 100) / 100;
        }
        return next;
      }
      return item;
    });

    const newTotal = updatedExpenses.reduce((sum, item) => sum + item.totalAmount, 0);
    setProposal({
      ...proposal,
      expenseItems: updatedExpenses,
      totalBudget: newTotal,
    });
  };

  const handleAddExpense = () => {
    if (!proposal) return;
    const newId = proposal.expenseItems.length > 0 ? Math.max(...proposal.expenseItems.map((e) => e.id)) + 1 : 1;
    const newItem: ProjectExpenseItem = {
      id: newId,
      projectId: 0,
      itemName: 'รายการค่าใช้จ่ายใหม่',
      category: 'ค่าวัสดุ',
      quantity: 1,
      unit: 'ชุด',
      unitPrice: 1000,
      totalAmount: 1000,
    };
    const updated = [...proposal.expenseItems, newItem];
    const newTotal = updated.reduce((sum, item) => sum + item.totalAmount, 0);
    setProposal({
      ...proposal,
      expenseItems: updated,
      totalBudget: newTotal,
    });
  };

  const handleRemoveExpense = (id: number) => {
    if (!proposal) return;
    const updated = proposal.expenseItems.filter((e) => e.id !== id);
    const newTotal = updated.reduce((sum, item) => sum + item.totalAmount, 0);
    setProposal({
      ...proposal,
      expenseItems: updated,
      totalBudget: newTotal,
    });
  };

  // Activity item edits
  const handleActivityChange = (index: number, field: keyof ProjectProposalActivity, val: string) => {
    if (!proposal) return;
    const updated = [...proposal.activities];
    updated[index] = { ...updated[index], [field]: val };
    setProposal({ ...proposal, activities: updated });
  };

  // Benefit item edit/add/delete
  const handleBenefitChange = (index: number, val: string) => {
    if (!proposal) return;
    const updated = [...proposal.expectedBenefits];
    updated[index] = val;
    setProposal({ ...proposal, expectedBenefits: updated });
  };

  const handleAddBenefit = () => {
    if (!proposal) return;
    setProposal({
      ...proposal,
      expectedBenefits: [...proposal.expectedBenefits, 'เกิดประโยชน์แก่...'],
    });
  };

  const handleRemoveBenefit = (index: number) => {
    if (!proposal) return;
    const updated = proposal.expectedBenefits.filter((_, i) => i !== index);
    setProposal({ ...proposal, expectedBenefits: updated });
  };

  // Download Word doc (.doc / .docx compatible)
  const handleDownloadWord = () => {
    if (!proposal) return;
    exportProjectProposalToWordDoc(proposal, school, fiscalYear);
  };

  // Print / PDF preview
  const handlePrintPdf = () => {
    setActiveTab('preview');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Save to active projects list in the app
  const handleSaveToSchoolActionPlan = () => {
    if (!proposal) return;
    if (fiscalYear.isProposalOpen === false) {
      alert(`ไม่สามารถบันทึกโครงการเข้าแผนงานได้ เนื่องจากระบบปิดรับการเสนอโครงการประจำปีงบประมาณ พ.ศ. ${fiscalYear.year}`);
      return;
    }

    const cleanCitizenId = proposerCitizenId.replace(/\D/g, '');
    if (cleanCitizenId && cleanCitizenId.length !== 13) {
      alert('เลขประจำตัวประชาชนของครูผู้เสนอโครงการต้องมีครบ 13 หลัก');
      return;
    }

    const finalTeacherName = proposerName.trim() || proposal.responsiblePerson || 'ครูผู้รับผิดชอบโครงการ';

    const newProject: Project = {
      id: Date.now(),
      schoolId: school.id,
      fiscalYearId: fiscalYear.id,
      projectCode: proposal.projectCode || `กค.${Math.floor(Math.random() * 90 + 10)}/${fiscalYear.year}`,
      projectName: proposal.projectName,
      rationale: proposal.rationale,
      objectives: proposal.objectives.join('\n'),
      quantitativeGoals: proposal.quantitativeTarget,
      qualitativeGoals: proposal.qualitativeTarget,
      kpis: proposal.kpis,
      procedures: proposal.activities.map((a) => `${a.phase}: ${a.description} (${a.duration})`).join('\n'),
      durationStart: proposal.timeline.split('-')[0]?.trim() || `16 พ.ค. ${fiscalYear.year}`,
      durationEnd: proposal.timeline.split('-')[1]?.trim() || `31 มี.ค. ${fiscalYear.year + 1}`,
      location: proposal.location || school.name || 'โรงเรียนเด็กเรียนดี',
      targetGroup: proposal.quantitativeTarget,
      responsiblePerson: finalTeacherName,
      proposerName: finalTeacherName,
      proposerCitizenId: cleanCitizenId || undefined,
      attachmentName: attachmentName.trim() || undefined,
      fullProposalDetails: {
        ...proposal,
        proposerName: finalTeacherName,
        proposerPosition: proposerPosition || proposal.proposerPosition || proposal.position || 'ครูผู้รับผิดชอบโครงการ',
        endorserName: endorserName || proposal.endorserName || 'ผู้เห็นชอบโครงการ',
        endorserPosition: endorserPosition || proposal.endorserPosition || `หัวหน้ากลุ่มงาน${proposal.department}`,
        approverName: approverName || proposal.approverName || school.directorName || 'ผู้อำนวยการโรงเรียน',
        approverPosition: approverPosition || proposal.approverPosition || `ผู้อำนวยการโรงเรียน${school.name}`,
      },
      department: proposal.department || 'ฝ่ายวิชาการ',
      budgetSource: proposal.budgetSource || 'เงินอุดหนุนรายหัว สพฐ.',
      allocatedBudget: proposal.totalBudget,
      spentBudget: 0,
      remainingBudget: proposal.totalBudget,
      status: 'not_started',
      approvalStatus: 'pending',
      strategyId: strategies[0]?.id || 1,
      sortOrder: 99,
      expenseItems: proposal.expenseItems,
      expenses: proposal.expenseItems,
      duration: proposal.timeline,
      kpi: proposal.kpis,
      approvedBy: undefined,
      approvedDate: undefined,
    };

    onSaveToProjects(newProject);
    setSavedSuccess(true);
  };

  const isConnected = Boolean(customApiKey || hasSystemKey);

  return (
    <div className="space-y-6">
      {/* Header & API Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-700 to-blue-600 text-white shadow-md">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>ระบบผู้ช่วยเขียนโครงการด้วย AI (AI Project Proposal Generator)</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                  <Sparkles className="h-3 w-3" />
                  <span>Gemini 3.8 Flash</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ช่วยร่างและจัดทำแบบเสนอโครงการฉบับสมบูรณ์ตามระเบียบ สพฐ. แจกแจง 4 หมวดงบประมาณ พร้อมดาวน์โหลดเป็นเอกสาร Word (.doc) และ PDF
              </p>
            </div>
          </div>
        </div>

        {/* API Key Connection Control */}
        <div className="flex items-center gap-2">
          <button
            id="btn-api-key-status"
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border transition-all ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="คลิกเพื่อตรวจสอบหรือตั้งค่า Gemini API Key"
          >
            <Key className="h-3.5 w-3.5" />
            <span>
              {customApiKey
                ? 'ใช้ Custom API Key'
                : hasSystemKey
                ? 'เชื่อมต่อ System API Key'
                : 'ระบุ Gemini API Key'}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Proposal Window Banner */}
      {fiscalYear.isProposalOpen === false ? (
        <div className="no-print rounded-xl p-4 bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
          <Lock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <span>สถานะ: ปิดรับการเสนอโครงการประจำปีงบประมาณ พ.ศ. {fiscalYear.year}</span>
              <span className="text-[11px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-medium">
                ปิดระบบชั่วคราว
              </span>
            </div>
            <p className="text-xs text-rose-800">
              {fiscalYear.proposalNotice || 'ขณะนี้อยู่นอกช่วงเวลาการเสนอโครงการ หรือฝ่ายบริหารสถานศึกษาได้ทำการปิดรับข้อเสนอโครงการแล้ว'}
            </p>
            {fiscalYear.proposalCloseDate && (
              <p className="text-[11px] text-rose-700">
                (กำหนดปิดรับข้อเสนอเมื่อ: {fiscalYear.proposalCloseDate})
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="no-print rounded-xl p-3 bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Unlock className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">เปิดรับการเสนอโครงการ:</span>{' '}
              <span>คุณครูสามารถร่างและเสนอโครงการตามกลุ่มงานประจำปีงบประมาณ พ.ศ. {fiscalYear.year} ได้</span>
              {fiscalYear.proposalCloseDate && (
                <span className="ml-1 text-emerald-700 font-semibold">(สิ้นสุดวันที่ {fiscalYear.proposalCloseDate})</span>
              )}
            </div>
          </div>
          <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold shrink-0">
            ระบบเปิดรับข้อเสนอ
          </span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>1. กำหนดข้อมูลโครงการ & AI Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!proposal) {
                alert('กรุณากดปุ่ม "สร้างโครงการด้วย AI" ก่อนเพื่อดูตัวอย่างแบบเสนอโครงการ');
                return;
              }
              setActiveTab('preview');
            }}
            disabled={!proposal}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                : proposal
                ? 'border-transparent text-slate-600 hover:text-slate-900'
                : 'border-transparent text-slate-300 cursor-not-allowed'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>2. ตัวอย่างแบบเสนอโครงการ (Official Preview)</span>
            {proposal && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!proposal) {
                alert('กรุณากดปุ่ม "สร้างโครงการด้วย AI" ก่อนเพื่อแก้ไขเนื้อหา');
                return;
              }
              setActiveTab('edit');
            }}
            disabled={!proposal}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                : proposal
                ? 'border-transparent text-slate-600 hover:text-slate-900'
                : 'border-transparent text-slate-300 cursor-not-allowed'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>3. แก้ไขเนื้อหา & งบประมาณ (Interactive Editor)</span>
          </button>
        </div>

        {/* Action buttons when proposal is available */}
        {proposal && (
          <div className="flex items-center gap-2 pb-2">
            {savedSuccess ? (
              <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Check className="h-3.5 w-3.5" />
                <span>บันทึกเข้าแผนงานแล้ว</span>
              </span>
            ) : (
              <button
                id="btn-save-to-school-plan"
                type="button"
                onClick={handleSaveToSchoolActionPlan}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                title="นำโครงการนี้ไปบันทึกเป็นโครงการจริงในแผนปฏิบัติการของโรงเรียน"
              >
                <Save className="h-3.5 w-3.5" />
                <span>บันทึกเข้าแผนงานโรงเรียน</span>
              </button>
            )}

            <button
              id="btn-download-word-proposal"
              type="button"
              onClick={handleDownloadWord}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
              title="ดาวน์โหลดเป็นไฟล์เอกสาร Microsoft Word (.doc) ที่สามารถแก้ไขต่อได้"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ดาวน์โหลด Word (.doc)</span>
            </button>

            <button
              id="btn-print-pdf-proposal"
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
              title="พิมพ์แบบฟอร์มเสนอโครงการหรือบันทึกเป็น PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: FORM & AI PROMPT CONFIGURATION */}
      {activeTab === 'form' && (
        <div className="space-y-6 no-print">
          {/* Preset Topics Carousel / Badges */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                ตัวอย่างโครงการยอดนิยมของโรงเรียน สพฐ. (คลิกเพื่อเลือกใช้งานได้ทันที)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PRESET_TOPICS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left bg-white hover:bg-blue-100/50 border border-slate-200 hover:border-blue-300 p-3 rounded-lg transition-all shadow-2xs group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 line-clamp-2">
                    {preset.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                      {preset.dept}
                    </span>
                    <span className="font-mono font-bold text-blue-800">
                      {preset.budget.toLocaleString()} บาท
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Proposal Generation Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>ข้อมูลเบื้องต้นสำหรับให้ AI ร่างข้อเสนอโครงการ</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโครงการที่ต้องการสร้าง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="เช่น โครงการส่งเสริมทักษะการเรียนรู้เชิงรุก (Active Learning) และการใช้ AI ทางการศึกษา"
                  className="w-full text-xs font-medium rounded-lg border border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ฝ่ายบริหารที่รับผิดชอบ
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ฝ่ายวิชาการ">ฝ่ายวิชาการ (กลุ่มบริหารงานวิชาการ)</option>
                  <option value="ฝ่ายงบประมาณ">ฝ่ายงบประมาณ (กลุ่มบริหารงานงบประมาณ)</option>
                  <option value="ฝ่ายบุคคล">ฝ่ายบุคคล (กลุ่มบริหารงานบุคคล)</option>
                  <option value="ฝ่ายบริหารทั่วไป">ฝ่ายบริหารทั่วไป (กลุ่มบริหารงานทั่วไป)</option>
                </select>
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ลักษณะโครงการ
                </label>
                <div className="flex items-center gap-4 mt-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="projectType"
                      checked={projectType === 'ใหม่'}
                      onChange={() => setProjectType('ใหม่')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>โครงการใหม่</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="projectType"
                      checked={projectType === 'ต่อเนื่อง'}
                      onChange={() => setProjectType('ต่อเนื่อง')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>โครงการต่อเนื่อง</span>
                  </label>
                </div>
              </div>

              {/* Strategy Alignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สอดคล้องกับยุทธศาสตร์สถานศึกษา
                </label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="เช่น ยุทธศาสตร์ที่ 1 พัฒนาคุณภาพและมาตรฐานการศึกษาขั้นพื้นฐาน"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Estimated Budget */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วงเงินงบประมาณประมาณการ (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-900"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">บาท</span>
                </div>
              </div>

              {/* Target Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กลุ่มเป้าหมายผู้เข้าร่วม
                </label>
                <input
                  type="text"
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  placeholder="เช่น นักเรียนชั้น ป.1-ป.6 จำนวน 320 คน และครูผู้สอน 18 คน"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Timeline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ระยะเวลาดำเนินการ
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={`เช่น 16 พฤษภาคม ${fiscalYear.year} - 31 มีนาคม ${fiscalYear.year + 1}`}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Special Focus / Key Requirements */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จุดเน้นพิเศษ กิจกรรมหลัก หรือข้อกำหนดเฉพาะที่ต้องการให้ AI ระบุ
                </label>
                <textarea
                  rows={2}
                  value={specialFocus}
                  onChange={(e) => setSpecialFocus(e.target.value)}
                  placeholder="เช่น เน้นการจัดอบรมเชิงปฏิบัติการ 2 วัน มีการแจกเอกสารคู่มือ การจัดกิจกรรมประกวดโครงงาน และการสรุปรายงานผล"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 3-Part Signatories Configuration Card */}
              <div className="md:col-span-2 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-700" />
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">
                        กำหนดผู้ลงนามโครงการ 3 ส่วน (Signatory Management)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        เลือกรายชื่อจากระบบของโรงเรียน หรือพิมพ์กำหนดเองตามโครงสร้างคณะกรรมการ
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-800 bg-white px-3 py-1 rounded-full border border-blue-200 font-semibold self-start sm:self-auto">
                    ผู้เสนอ (ซ้าย) • ผู้เห็นชอบ (ขวา) • ผู้อนุมัติ (ล่าง)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Signatory 1: Proposer */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-[10px] font-bold">1</span>
                        ผู้เสนอโครงการ
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">คอลัมน์ซ้าย</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        เลือกจากบุคลากรในระบบ:
                      </label>
                      <select
                        value={selectedProposerId}
                        onChange={(e) => handleSelectProposer(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 bg-slate-50 py-1.5 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="custom">— พิมพ์ระบุเอง —</option>
                        {users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.fullName} ({u.position || u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ชื่อ-สกุล ผู้เสนอ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={proposerName}
                        onChange={(e) => {
                          setProposerName(e.target.value);
                          if (selectedProposerId !== 'custom') setSelectedProposerId('custom');
                        }}
                        placeholder="เช่น นางสาวกนกพร ใจมั่น"
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ตำแหน่งผู้เสนอ
                      </label>
                      <input
                        type="text"
                        value={proposerPosition}
                        onChange={(e) => setProposerPosition(e.target.value)}
                        placeholder="เช่น ครูผู้รับผิดชอบโครงการ"
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        เลขบัตรประชาชน 13 หลัก (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        value={proposerCitizenId}
                        onChange={(e) => setProposerCitizenId(e.target.value.replace(/\D/g, ''))}
                        placeholder="เลข 13 หลัก"
                        className="w-full text-xs font-mono font-bold rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Signatory 2: Endorser */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-[10px] font-bold">2</span>
                        ผู้เห็นชอบโครงการ
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">คอลัมน์ขวา</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        เลือกจากบุคลากรในระบบ:
                      </label>
                      <select
                        value={selectedEndorserId}
                        onChange={(e) => handleSelectEndorser(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 bg-slate-50 py-1.5 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="custom">— พิมพ์ระบุเอง —</option>
                        {users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.fullName} ({u.position || u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ชื่อ-สกุล ผู้เห็นชอบ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={endorserName}
                        onChange={(e) => {
                          setEndorserName(e.target.value);
                          if (selectedEndorserId !== 'custom') setSelectedEndorserId('custom');
                        }}
                        placeholder="เช่น นายพิเชษฐ์ ปัญญาวงศ์"
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ตำแหน่งผู้เห็นชอบ
                      </label>
                      <input
                        type="text"
                        value={endorserPosition}
                        onChange={(e) => setEndorserPosition(e.target.value)}
                        placeholder="เช่น หัวหน้ากลุ่มงานวิชาการ"
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Signatory 3: Approver */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 inline-flex items-center justify-center text-[10px] font-bold">3</span>
                        ผู้อนุมัติโครงการ
                      </span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">แถวล่างสุด</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        เลือกจากบุคลากรในระบบ:
                      </label>
                      <select
                        value={selectedApproverId}
                        onChange={(e) => handleSelectApprover(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 bg-slate-50 py-1.5 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="custom">— พิมพ์ระบุเอง —</option>
                        {users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.fullName} ({u.position || u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ชื่อ-สกุล ผู้อนุมัติ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => {
                          setApproverName(e.target.value);
                          if (selectedApproverId !== 'custom') setSelectedApproverId('custom');
                        }}
                        placeholder="เช่น ดร.สมศักดิ์ พัฒนศึกษา"
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        ตำแหน่งผู้อนุมัติ
                      </label>
                      <input
                        type="text"
                        value={approverPosition}
                        onChange={(e) => setApproverPosition(e.target.value)}
                        placeholder={`เช่น ผู้อำนวยการโรงเรียน${school.name}`}
                        className="w-full text-xs rounded border border-slate-300 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เอกสารแนบโครงการ / ลิงก์ไฟล์ประกอบ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="เช่น โครงการพัฒนาการศึกษา2568.pdf หรือ ลิงก์ Google Drive เอกสารแนบ"
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-purple-600" />
                <span>AI จะร่างโครงการทั้ง 13 หัวข้อตามแบบฟอร์ม สพฐ. พร้อมแจกแจง 4 หมวดงบประมาณอัตโนมัติ</span>
              </div>

              <button
                id="btn-trigger-ai-generation"
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังสร้างข้อเสนอโครงการด้วย AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>สร้างและร่างโครงการด้วย AI (Generate Proposal)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICIAL PROPOSAL PREVIEW (PRINT / PDF READY) */}
      {activeTab === 'preview' && proposal && (
        <div className="space-y-4">
          {/* Source Indicator Banner */}
          {generationSource && (
            <div className="no-print flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {generationSource === 'gemini_ai'
                    ? 'สร้างโดย Gemini 3.8 Flash AI สำเร็จ สมบูรณ์ตามรูปแบบระเบียบราชการ สพฐ.'
                    : 'สร้างตามโครงสร้างมาตรฐานแบบฟอร์ม สพฐ. (Template Base)'}
                </span>
                {generationMessage && (
                  <span className="text-slate-500">({generationMessage})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>แก้ไขข้อความหรือปรับงบประมาณ</span>
                </button>
              </div>
            </div>
          )}

          {/* Official Document Sheet (A4 Styled) */}
          <div
            id="official-project-proposal-sheet"
            className="bg-white rounded-xl border border-slate-300 shadow-md p-8 md:p-12 text-slate-900 max-w-4xl mx-auto printable-proposal font-sans leading-relaxed"
          >
            {/* Header / Official Project Title */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <div className="text-lg md:text-xl font-bold text-slate-950">
                โครงการ{proposal.projectName}
              </div>
              <div className="text-sm md:text-base font-semibold text-slate-800 mt-1">
                ตามแผนปฏิบัติการประจำปีงบประมาณ พ.ศ. {fiscalYear.year}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {school.name}
              </div>
              <div className="text-xs text-slate-600">
                สำนักงานเขตพื้นที่การศึกษา{school.educationArea || school.affiliation}
              </div>
            </div>

            {/* Proposal Content */}
            <div className="space-y-4 text-xs md:text-sm">
              {/* 1. Project Name */}
              <div>
                <span className="font-bold text-slate-950">1. ชื่อโครงการ: </span>
                <span className="font-semibold text-blue-950">{proposal.projectName}</span>
              </div>

              {/* 2. Code & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-950">2. รหัสโครงการ: </span>
                  <span className="font-mono font-semibold">{proposal.projectCode}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-950">3. ลักษณะโครงการ: </span>
                  <span>โครงการ{proposal.projectType}</span>
                </div>
              </div>

              {/* 4. Strategy */}
              <div>
                <span className="font-bold text-slate-950">4. ความสอดคล้องกับยุทธศาสตร์ / นโยบาย:</span>
                <p className="mt-1 ml-4 text-slate-700">{proposal.strategyAlignment}</p>
              </div>

              {/* 5. Department & Responsible Person */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-950">กลุ่มงาน/ฝ่าย: </span>
                  <span className="text-blue-900 font-semibold">{proposal.department}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-950">ผู้เสนอโครงการ: </span>
                  <span className="font-semibold text-blue-900">{proposerName || proposal.responsiblePerson}</span>
                  {proposerCitizenId && (
                    <span className="ml-2 text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      เลขบัตร: {formatCitizenId(proposerCitizenId)}
                    </span>
                  )}
                  {proposal.position && <span className="text-slate-500"> ({proposal.position})</span>}
                </div>
              </div>

              {/* 6. Rationale */}
              <div>
                <div className="font-bold text-slate-950 mb-1">5. หลักการและเหตุผล:</div>
                <p className="text-justify leading-relaxed indent-8 text-slate-800 bg-slate-50/50 p-3 rounded border border-slate-100">
                  {proposal.rationale}
                </p>
              </div>

              {/* 7. Objectives */}
              <div>
                <div className="font-bold text-slate-950 mb-1">6. วัตถุประสงค์:</div>
                <ul className="space-y-1 ml-6 list-decimal text-slate-800">
                  {proposal.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* 8. Targets */}
              <div>
                <div className="font-bold text-slate-950 mb-1">7. เป้าหมาย:</div>
                <div className="ml-4 space-y-1 text-slate-800">
                  <div>
                    <span className="font-semibold">7.1 เป้าหมายเชิงปริมาณ: </span>
                    {proposal.quantitativeTarget}
                  </div>
                  <div>
                    <span className="font-semibold">7.2 เป้าหมายเชิงคุณภาพ: </span>
                    {proposal.qualitativeTarget}
                  </div>
                </div>
              </div>

              {/* 9. Location & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-slate-950">8. สถานที่ดำเนินการ: </span>
                  <span>{proposal.location}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-950">ระยะเวลาดำเนินการ: </span>
                  <span>{proposal.timeline}</span>
                </div>
              </div>

              {/* 10. PDCA Activities Table */}
              <div>
                <div className="font-bold text-slate-950 mb-2">9. ขั้นตอนและปฏิทินการดำเนินงาน (PDCA):</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 py-2 px-2.5 w-1/4 text-left">ขั้นตอนการดำเนินงาน</th>
                        <th className="border border-slate-300 py-2 px-2.5 w-1/2 text-left">รายละเอียดกิจกรรม</th>
                        <th className="border border-slate-300 py-2 px-2 text-center w-1/8">ระยะเวลา</th>
                        <th className="border border-slate-300 py-2 px-2 text-center w-1/8">ผู้รับผิดชอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.activities.map((act, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-300 py-2 px-2.5 font-semibold text-slate-900">
                            {act.phase}
                          </td>
                          <td className="border border-slate-300 py-2 px-2.5 text-slate-700">
                            {act.description}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center text-slate-600">
                            {act.duration}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center text-slate-600">
                            {act.responsible}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 11. Budget & Itemized Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-950">10. งบประมาณและรายละเอียดค่าใช้จ่าย:</div>
                  <div className="text-xs text-slate-600">
                    แหล่งงบประมาณ: <span className="font-semibold text-blue-900">{proposal.budgetSource}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 py-2 px-1.5 w-10 text-center">ที่</th>
                        <th className="border border-slate-300 py-2 px-2.5 text-left">รายการค่าใช้จ่าย</th>
                        <th className="border border-slate-300 py-2 px-2 text-center w-24">หมวดรายจ่าย</th>
                        <th className="border border-slate-300 py-2 px-2 text-center w-16">จำนวน</th>
                        <th className="border border-slate-300 py-2 px-2 text-center w-16">หน่วย</th>
                        <th className="border border-slate-300 py-2 px-2.5 text-right w-24">ราคา/หน่วย</th>
                        <th className="border border-slate-300 py-2 px-2.5 text-right w-28">รวมเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.expenseItems.map((exp, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-300 py-1.5 px-1 text-center text-slate-500 font-mono">
                            {i + 1}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 text-slate-800 font-medium">
                            {exp.itemName}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600">
                            {exp.category}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">
                            {exp.quantity}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600">
                            {exp.unit}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono text-slate-700">
                            {Number(exp.unitPrice).toLocaleString()}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono font-semibold text-slate-900">
                            {Number(exp.totalAmount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold text-slate-950">
                        <td colSpan={6} className="border border-slate-300 py-2.5 px-3 text-right">
                          งบประมาณรวมทั้งสิ้น:
                        </td>
                        <td className="border border-slate-300 py-2.5 px-2.5 text-right font-mono text-blue-900 text-sm">
                          {Number(proposal.totalBudget).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 12. KPIs & Evaluation */}
              <div>
                <div className="font-bold text-slate-950 mb-1">11. การประเมินผลและตัวชี้วัดความสำเร็จ:</div>
                <div className="ml-4 space-y-1 text-slate-800">
                  <div>
                    <span className="font-semibold">ตัวชี้วัด (KPI): </span>
                    {proposal.kpis}
                  </div>
                  <div>
                    <span className="font-semibold">วิธีการและเครื่องมือประเมิน: </span>
                    {proposal.evaluationMethods}
                  </div>
                </div>
              </div>

              {/* 13. Expected Benefits */}
              <div>
                <div className="font-bold text-slate-950 mb-1">12. ประโยชน์ที่คาดว่าจะได้รับ:</div>
                <ul className="space-y-1 ml-6 list-decimal text-slate-800">
                  {proposal.expectedBenefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* Signature Blocks (3 parts: 2 columns top, 1 row bottom) */}
              <div className="pt-8 border-t-2 border-slate-400 mt-8 font-sarabun text-sm md:text-base">
                <div className="grid grid-cols-2 gap-8 text-center">
                  {/* Left Column: Proposer */}
                  <div className="space-y-1.5">
                    <p className="font-medium">ลงชื่อ.......................................................... ผู้เสนอโครงการ</p>
                    <p className="font-bold text-slate-950">
                      ({proposal.proposerName || proposerName || proposal.responsiblePerson || 'ครูผู้เสนอโครงการ'})
                    </p>
                    {proposerCitizenId ? (
                      <p className="text-slate-600 font-mono text-xs">เลขประจำตัวประชาชน: {formatCitizenId(proposerCitizenId)}</p>
                    ) : (
                      <p className="text-slate-500 text-xs">เลขประจำตัวประชาชน: ........................................</p>
                    )}
                    <p className="text-slate-700">ตำแหน่ง {proposal.proposerPosition || proposerPosition || proposal.position || 'ครูผู้รับผิดชอบโครงการ'}</p>
                    <p className="text-slate-500 text-xs">วันที่ ..... เดือน .................... พ.ศ. .........</p>
                  </div>

                  {/* Right Column: Endorser */}
                  <div className="space-y-1.5">
                    <p className="font-medium">ลงชื่อ.......................................................... ผู้เห็นชอบโครงการ</p>
                    <p className="font-bold text-slate-950">
                      ({proposal.endorserName || endorserName || 'ผู้เห็นชอบโครงการ'})
                    </p>
                    <p className="text-slate-700">ตำแหน่ง {proposal.endorserPosition || endorserPosition || `หัวหน้ากลุ่มงาน${proposal.department || 'วิชาการ'}`}</p>
                    <p className="text-slate-500 text-xs">วันที่ ..... เดือน .................... พ.ศ. .........</p>
                  </div>
                </div>

                {/* Bottom Row: Approver (School Director) */}
                <div className="mt-8 text-center border-t border-dashed border-slate-300 pt-6">
                  <p className="font-bold text-slate-900 mb-2">คำอนุมัติของผู้อำนวยการสถานศึกษา</p>
                  <p className="space-x-8 text-slate-700 text-xs my-2">
                    <span>[ &nbsp; ] อนุมัติ</span>
                    <span>[ &nbsp; ] ไม่อนุมัติ เนื่องจาก ..............................................................</span>
                  </p>
                  <div className="mt-4 space-y-1.5">
                    <p className="font-medium">ลงชื่อ.......................................................... ผู้อนุมัติโครงการ</p>
                    <p className="font-bold text-slate-950">
                      ({proposal.approverName || approverName || school.directorName || 'ผู้อำนวยการโรงเรียน'})
                    </p>
                    <p className="text-slate-700">
                      ตำแหน่ง {proposal.approverPosition || approverPosition || `ผู้อำนวยการโรงเรียน${school.name}`}
                    </p>
                    <p className="text-slate-500 text-xs">วันที่ ..... เดือน .................... พ.ศ. .........</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE EDITOR */}
      {activeTab === 'edit' && proposal && (
        <div className="space-y-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6 no-print">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-blue-600" />
              <span>แก้ไขรายละเอียดและงบประมาณของแบบเสนอโครงการ</span>
            </h3>
            <span className="text-xs text-slate-500">
              งบประมาณรวมปัจจุบัน:{' '}
              <strong className="font-mono text-blue-900 text-sm">
                {proposal.totalBudget.toLocaleString()} บาท
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ชื่อโครงการ</label>
              <input
                type="text"
                value={proposal.projectName}
                onChange={(e) => handleUpdateField('projectName', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">รหัสโครงการ</label>
              <input
                type="text"
                value={proposal.projectCode}
                onChange={(e) => handleUpdateField('projectCode', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ฝ่ายบริหาร</label>
              <input
                type="text"
                value={proposal.department}
                onChange={(e) => handleUpdateField('department', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Responsible Person */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ผู้รับผิดชอบโครงการ</label>
              <input
                type="text"
                value={proposal.responsiblePerson}
                onChange={(e) => handleUpdateField('responsiblePerson', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ตำแหน่ง</label>
              <input
                type="text"
                value={proposal.position || ''}
                onChange={(e) => handleUpdateField('position', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Strategy Alignment */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ความสอดคล้องกับยุทธศาสตร์</label>
              <input
                type="text"
                value={proposal.strategyAlignment}
                onChange={(e) => handleUpdateField('strategyAlignment', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Rationale */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">หลักการและเหตุผล</label>
              <textarea
                rows={4}
                value={proposal.rationale}
                onChange={(e) => handleUpdateField('rationale', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Objectives */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">วัตถุประสงค์โครงการ</label>
                <button
                  type="button"
                  onClick={handleAddObjective}
                  className="flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-semibold"
                >
                  <Plus className="h-3 w-3" /> เพิ่มวัตถุประสงค์
                </button>
              </div>
              <div className="space-y-2">
                {proposal.objectives.map((obj, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono w-5">{i + 1}.</span>
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => handleObjectiveChange(i, e.target.value)}
                      className="flex-1 rounded border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(i)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Targets */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">เป้าหมายเชิงปริมาณ</label>
              <textarea
                rows={2}
                value={proposal.quantitativeTarget}
                onChange={(e) => handleUpdateField('quantitativeTarget', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">เป้าหมายเชิงคุณภาพ</label>
              <textarea
                rows={2}
                value={proposal.qualitativeTarget}
                onChange={(e) => handleUpdateField('qualitativeTarget', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Location & Timeline */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">สถานที่ดำเนินการ</label>
              <input
                type="text"
                value={proposal.location}
                onChange={(e) => handleUpdateField('location', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ระยะเวลาดำเนินการ</label>
              <input
                type="text"
                value={proposal.timeline}
                onChange={(e) => handleUpdateField('timeline', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Itemized Expenses Table */}
            <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">แจกแจงรายละเอียดงบประมาณ 4 หมวด สพฐ.</h4>
                  <p className="text-[11px] text-slate-500">
                    คำนวณราคารวมอัตโนมัติ (Dynamic Sum)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="flex items-center gap-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มรายการค่าใช้จ่าย
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-2 px-2 text-left">รายการค่าใช้จ่าย</th>
                      <th className="py-2 px-2 text-center w-28">หมวด</th>
                      <th className="py-2 px-2 text-center w-16">จำนวน</th>
                      <th className="py-2 px-2 text-center w-16">หน่วย</th>
                      <th className="py-2 px-2 text-right w-24">ราคา/หน่วย</th>
                      <th className="py-2 px-2 text-right w-28">รวมเงิน</th>
                      <th className="py-2 px-2 text-center w-10">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposal.expenseItems.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={exp.itemName}
                            onChange={(e) => handleExpenseChange(exp.id, 'itemName', e.target.value)}
                            className="w-full rounded border border-slate-200 py-1 px-2 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <select
                            value={exp.category}
                            onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                            className="w-full rounded border border-slate-200 py-1 px-1 text-[11px] focus:outline-none"
                          >
                            <option value="ค่าตอบแทน">ค่าตอบแทน</option>
                            <option value="ค่าใช้สอย">ค่าใช้สอย</option>
                            <option value="ค่าวัสดุ">ค่าวัสดุ</option>
                            <option value="ค่าครุภัณฑ์">ค่าครุภัณฑ์</option>
                          </select>
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={exp.quantity}
                            onChange={(e) => handleExpenseChange(exp.id, 'quantity', e.target.value)}
                            className="w-14 rounded border border-slate-200 py-1 px-1 text-center font-mono focus:outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="text"
                            value={exp.unit}
                            onChange={(e) => handleExpenseChange(exp.id, 'unit', e.target.value)}
                            className="w-14 rounded border border-slate-200 py-1 px-1 text-center focus:outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            value={exp.unitPrice}
                            onChange={(e) => handleExpenseChange(exp.id, 'unitPrice', e.target.value)}
                            className="w-20 rounded border border-slate-200 py-1 px-1 text-right font-mono focus:outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-blue-900">
                          {exp.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={5} className="py-2.5 px-3 text-right">
                        งบประมาณรวมทั้งสิ้น:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-300 text-sm">
                        {proposal.totalBudget.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-1 text-center text-xs text-slate-400 font-normal">
                        บาท
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* KPIs & Evaluation */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ตัวชี้วัดความสำเร็จ (KPI)</label>
              <textarea
                rows={2}
                value={proposal.kpis}
                onChange={(e) => handleUpdateField('kpis', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">วิธีการและเครื่องมือประเมินผล</label>
              <textarea
                rows={2}
                value={proposal.evaluationMethods}
                onChange={(e) => handleUpdateField('evaluationMethods', e.target.value)}
                className="w-full rounded border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Expected Benefits */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">ประโยชน์ที่คาดว่าจะได้รับ</label>
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-semibold"
                >
                  <Plus className="h-3 w-3" /> เพิ่มประโยชน์ที่คาดว่าจะได้รับ
                </button>
              </div>
              <div className="space-y-2">
                {proposal.expectedBenefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono w-5">{i + 1}.</span>
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => handleBenefitChange(i, e.target.value)}
                      className="flex-1 rounded border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(i)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 13. Signatories Editor Section (3 parts) */}
            <div className="md:col-span-2 pt-4 border-t border-slate-200 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>13. ผู้ลงนามในแบบเสนอโครงการ (3 ส่วนตามระเบียบ สพฐ.)</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  แก้ไขหรือเลือกรายชื่อจากระบบของโรงเรียนเพื่อลงนาม
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Proposer */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">1. ผู้เสนอโครงการ</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">คอลัมน์ซ้าย</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">เลือกจากระบบ:</label>
                    <select
                      value={selectedProposerId}
                      onChange={(e) => handleSelectProposer(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 py-1 px-2 bg-slate-50"
                    >
                      <option value="custom">— พิมพ์เอง —</option>
                      {users.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.fullName} ({u.position || u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ชื่อ-สกุล:</label>
                    <input
                      type="text"
                      value={proposal.proposerName || proposerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProposerName(val);
                        handleUpdateField('proposerName', val);
                        handleUpdateField('responsiblePerson', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำแหน่ง:</label>
                    <input
                      type="text"
                      value={proposal.proposerPosition || proposerPosition}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProposerPosition(val);
                        handleUpdateField('proposerPosition', val);
                        handleUpdateField('position', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เลขบัตรประชาชน 13 หลัก:</label>
                    <input
                      type="text"
                      maxLength={13}
                      value={proposerCitizenId}
                      onChange={(e) => setProposerCitizenId(e.target.value.replace(/\D/g, ''))}
                      className="w-full font-mono rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>
                </div>

                {/* Endorser */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">2. ผู้เห็นชอบโครงการ</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">คอลัมน์ขวา</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">เลือกจากระบบ:</label>
                    <select
                      value={selectedEndorserId}
                      onChange={(e) => handleSelectEndorser(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 py-1 px-2 bg-slate-50"
                    >
                      <option value="custom">— พิมพ์เอง —</option>
                      {users.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.fullName} ({u.position || u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ชื่อ-สกุล:</label>
                    <input
                      type="text"
                      value={proposal.endorserName || endorserName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndorserName(val);
                        handleUpdateField('endorserName', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำแหน่ง:</label>
                    <input
                      type="text"
                      value={proposal.endorserPosition || endorserPosition}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndorserPosition(val);
                        handleUpdateField('endorserPosition', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>
                </div>

                {/* Approver */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">3. ผู้อนุมัติโครงการ</span>
                    <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">แถวล่างสุด</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">เลือกจากระบบ:</label>
                    <select
                      value={selectedApproverId}
                      onChange={(e) => handleSelectApprover(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 py-1 px-2 bg-slate-50"
                    >
                      <option value="custom">— พิมพ์เอง —</option>
                      {users.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.fullName} ({u.position || u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ชื่อ-สกุล:</label>
                    <input
                      type="text"
                      value={proposal.approverName || approverName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApproverName(val);
                        handleUpdateField('approverName', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำแหน่ง:</label>
                    <input
                      type="text"
                      value={proposal.approverPosition || approverPosition}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApproverPosition(val);
                        handleUpdateField('approverPosition', val);
                      }}
                      className="w-full rounded border border-slate-300 py-1 px-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-5 py-2 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>ดูตัวอย่างแบบฟอร์มเสนอโครงการ (Preview)</span>
              <span>&raquo;</span>
            </button>
          </div>
        </div>
      )}

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-700" />
                <span>การเชื่อมต่อ Gemini API Key</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      hasSystemKey ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>
                    สถานะ System API Key (Server):{' '}
                    {hasSystemKey ? (
                      <span className="text-emerald-700 font-bold">พร้อมใช้งาน</span>
                    ) : (
                      <span className="text-amber-700 font-bold">ยังไม่ได้ตั้งค่าใน Secrets</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ระบบเชื่อมต่อโมเดล Gemini 2.5 Flash / 1.5 Flash ในการวิเคราะห์โครงสร้างโครงการและเขียนภาษาราชการตามระเบียบ สพฐ.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  กำหนด Gemini API Key ของท่าน (รองรับทุกรูปแบบคีย์จาก Google AI Studio)
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="วาง API Key ที่นี่ (เช่น AIza... หรือคีย์รูปแบบใหม่อื่นๆ)"
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  รองรับคีย์ API ทุกรูปแบบจาก Google AI Studio ระบบจะบันทึกไว้ในเบราว์เซอร์ของท่านอย่างปลอดภัย
                </p>
              </div>

              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-900 mb-0.5">วิธีขอรับ Gemini API Key ฟรี:</div>
                <p className="text-[11px] text-blue-800">
                  ท่านสามารถเข้าสู่ระบบ Google AI Studio เพื่อสร้าง API Key ได้ฟรี โดยไม่มีค่าใช้จ่าย
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline mt-1.5"
                >
                  <span>ไปยัง Google AI Studio เพื่อขอรับ Key</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleSaveApiKey('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ล้าง Custom Key
              </button>
              <button
                type="button"
                onClick={() => handleSaveApiKey(customApiKey)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
              >
                บันทึกและใช้งาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
