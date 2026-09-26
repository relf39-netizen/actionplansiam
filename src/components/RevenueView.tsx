import React, { useState, useEffect } from 'react';
import { RevenueItem, FiscalYear, StudentLevel } from '../types';
import {
  Calculator,
  Plus,
  Trash2,
  Save,
  Check,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Download,
  Layers,
  GraduationCap
} from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';

interface RevenueViewProps {
  revenues: RevenueItem[];
  activeFiscalYear: FiscalYear;
  totalStudents: number;
  students?: StudentLevel[];
  onUpdateRevenues: (updated: RevenueItem[]) => void;
}

interface StandardRateTemplate {
  key: string;
  category: RevenueItem['category'];
  itemName: string;
  defaultRate: number;
  stage: 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย' | 'all';
  note: string;
}

const SEPARATED_TEMPLATES: StandardRateTemplate[] = [
  {
    key: 'sub_kinder',
    category: 'subsidy',
    itemName: '1.1 เงินอุดหนุนรายหัว ระดับก่อนประถมศึกษา (อนุบาล)',
    defaultRate: 1800,
    stage: 'อนุบาล',
    note: 'เกณฑ์ สพฐ. 1,800 บาท/คน/ปี',
  },
  {
    key: 'sub_primary',
    category: 'subsidy',
    itemName: '1.2 เงินอุดหนุนรายหัว ระดับประถมศึกษา (ป.1 - ป.6)',
    defaultRate: 2050,
    stage: 'ประถม',
    note: 'เกณฑ์ สพฐ. 2,050 บาท/คน/ปี',
  },
  {
    key: 'sub_sec_lower',
    category: 'subsidy',
    itemName: '1.3 เงินอุดหนุนรายหัว ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    defaultRate: 3700,
    stage: 'มัธยมต้น',
    note: 'เกณฑ์ สพฐ. 3,700 บาท/คน/ปี',
  },
  {
    key: 'sub_sec_upper',
    category: 'subsidy',
    itemName: '1.4 เงินอุดหนุนรายหัว ระดับมัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    defaultRate: 4100,
    stage: 'มัธยมปลาย',
    note: 'เกณฑ์ สพฐ. 4,100 บาท/คน/ปี',
  },
  {
    key: 'act_kinder',
    category: 'activity',
    itemName: '2.1 เงินกิจกรรมพัฒนาผู้เรียน ระดับก่อนประถมศึกษา (อนุบาล)',
    defaultRate: 464,
    stage: 'อนุบาล',
    note: 'เกณฑ์ สพฐ. 464 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    key: 'act_primary',
    category: 'activity',
    itemName: '2.2 เงินกิจกรรมพัฒนาผู้เรียน ระดับประถมศึกษา (ป.1 - ป.6)',
    defaultRate: 518,
    stage: 'ประถม',
    note: 'เกณฑ์ สพฐ. 518 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    key: 'act_sec_lower',
    category: 'activity',
    itemName: '2.3 เงินกิจกรรมพัฒนาผู้เรียน ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    defaultRate: 966,
    stage: 'มัธยมต้น',
    note: 'เกณฑ์ สพฐ. 966 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
  {
    key: 'act_sec_upper',
    category: 'activity',
    itemName: '2.4 เงินกิจกรรมพัฒนาผู้เรียน ระดับมัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    defaultRate: 1026,
    stage: 'มัธยมปลาย',
    note: 'เกณฑ์ สพฐ. 1,026 บาท/คน/ปี (4 กิจกรรมหลัก)',
  },
];

export const RevenueView: React.FC<RevenueViewProps> = ({
  revenues,
  activeFiscalYear,
  totalStudents,
  students = [],
  onUpdateRevenues,
}) => {
  // Count actual students per stage from latest students table of same school and fiscal year
  const kinderCount = students.filter((s) => s.stage === 'อนุบาล').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
  const primaryCount = students.filter((s) => s.stage === 'ประถม').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
  const secLowerCount = students.filter((s) => s.stage === 'มัธยมต้น').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
  const secUpperCount = students.filter((s) => s.stage === 'มัธยมปลาย').reduce((sum, s) => sum + (Number(s.totalCount) || 0), 0);
  const actualTotal = students.length > 0 ? (kinderCount + primaryCount + secLowerCount + secUpperCount) : totalStudents;

  const getStageCount = (stage: 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย' | 'all') => {
    switch (stage) {
      case 'อนุบาล':
        return kinderCount;
      case 'ประถม':
        return primaryCount;
      case 'มัธยมต้น':
        return secLowerCount;
      case 'มัธยมปลาย':
        return secUpperCount;
      default:
        return actualTotal;
    }
  };

  // Helper to ensure 4-stage separation while preserving all existing items and custom data
  const ensureSeparatedRevenueRows = (incoming: RevenueItem[]): RevenueItem[] => {
    let currentList = [...incoming];
    let maxId = currentList.length > 0 ? Math.max(...currentList.map((r) => Number(r.id) || 0)) : 0;

    // Check if the 4-level items exist; if old general single row exists, replace or upgrade gracefully
    const hasSeparatedSubsidy = currentList.some((r) => r.itemName.includes('1.1') || (r.itemName.includes('เงินอุดหนุนรายหัว') && r.itemName.includes('อนุบาล')));
    const hasSeparatedActivity = currentList.some((r) => r.itemName.includes('2.1') || (r.itemName.includes('กิจกรรมพัฒนาผู้เรียน') && r.itemName.includes('อนุบาล')));

    // If still old flat items, migrate smoothly
    if (!hasSeparatedSubsidy || !hasSeparatedActivity) {
      const newList: RevenueItem[] = [];
      let subsidyInserted = false;
      let activityInserted = false;

      for (const item of currentList) {
        // If old flat subsidy item
        if (!hasSeparatedSubsidy && item.itemName.includes('เงินอุดหนุนรายหัว') && !item.itemName.includes('อนุบาล') && !item.itemName.includes('1.')) {
          if (!subsidyInserted) {
            SEPARATED_TEMPLATES.slice(0, 4).forEach((tpl) => {
              maxId += 1;
              const count = getStageCount(tpl.stage);
              newList.push({
                id: maxId,
                schoolId: item.schoolId || 1,
                fiscalYearId: activeFiscalYear.id,
                category: tpl.category,
                itemName: tpl.itemName,
                ratePerHead: tpl.defaultRate,
                eligibleCount: count,
                calculatedAmount: Math.round(tpl.defaultRate * count),
                isCustomRate: false,
                note: tpl.note,
              });
            });
            subsidyInserted = true;
          }
          continue; // replace old single line
        }

        // If old flat activity item
        if (!hasSeparatedActivity && item.itemName.includes('กิจกรรมพัฒนาผู้เรียน') && !item.itemName.includes('อนุบาล') && !item.itemName.includes('2.')) {
          if (!activityInserted) {
            SEPARATED_TEMPLATES.slice(4, 8).forEach((tpl) => {
              maxId += 1;
              const count = getStageCount(tpl.stage);
              newList.push({
                id: maxId,
                schoolId: item.schoolId || 1,
                fiscalYearId: activeFiscalYear.id,
                category: tpl.category,
                itemName: tpl.itemName,
                ratePerHead: tpl.defaultRate,
                eligibleCount: count,
                calculatedAmount: Math.round(tpl.defaultRate * count),
                isCustomRate: false,
                note: tpl.note,
              });
            });
            activityInserted = true;
          }
          continue; // replace old single line
        }

        newList.push(item);
      }

      // If templates still not added, prepend them
      if (!subsidyInserted && !hasSeparatedSubsidy) {
        const addedSub = SEPARATED_TEMPLATES.slice(0, 4).map((tpl) => {
          maxId += 1;
          const count = getStageCount(tpl.stage);
          return {
            id: maxId,
            schoolId: 1,
            fiscalYearId: activeFiscalYear.id,
            category: tpl.category,
            itemName: tpl.itemName,
            ratePerHead: tpl.defaultRate,
            eligibleCount: count,
            calculatedAmount: Math.round(tpl.defaultRate * count),
            isCustomRate: false,
            note: tpl.note,
          };
        });
        newList.unshift(...addedSub);
      }

      if (!activityInserted && !hasSeparatedActivity) {
        const addedAct = SEPARATED_TEMPLATES.slice(4, 8).map((tpl) => {
          maxId += 1;
          const count = getStageCount(tpl.stage);
          return {
            id: maxId,
            schoolId: 1,
            fiscalYearId: activeFiscalYear.id,
            category: tpl.category,
            itemName: tpl.itemName,
            ratePerHead: tpl.defaultRate,
            eligibleCount: count,
            calculatedAmount: Math.round(tpl.defaultRate * count),
            isCustomRate: false,
            note: tpl.note,
          };
        });
        // insert after subsidies
        newList.splice(4, 0, ...addedAct);
      }

      return newList;
    }

    // If separated items already exist, make sure eligible counts are synced with actual counts
    return currentList.map((item) => {
      let stageMatch: 'อนุบาล' | 'ประถม' | 'มัธยมต้น' | 'มัธยมปลาย' | null = null;
      if (item.itemName.includes('อนุบาล')) stageMatch = 'อนุบาล';
      else if (item.itemName.includes('ประถม')) stageMatch = 'ประถม';
      else if (item.itemName.includes('มัธยมต้น') || item.itemName.includes('มัธยมศึกษาตอนต้น')) stageMatch = 'มัธยมต้น';
      else if (item.itemName.includes('มัธยมปลาย') || item.itemName.includes('มัธยมศึกษาตอนปลาย')) stageMatch = 'มัธยมปลาย';

      if (stageMatch) {
        const count = getStageCount(stageMatch);
        return {
          ...item,
          eligibleCount: count,
          calculatedAmount: Math.round((Number(item.ratePerHead) || 0) * count),
        };
      } else if (item.itemName.includes('นักเรียน') || item.category === 'welfare') {
        const count = actualTotal;
        return {
          ...item,
          eligibleCount: count,
          calculatedAmount: Math.round((Number(item.ratePerHead) || 0) * count),
        };
      }
      return item;
    });
  };

  const [items, setItems] = useState<RevenueItem[]>(() => ensureSeparatedRevenueRows(revenues));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize items whenever revenues or students count changes
  useEffect(() => {
    setItems((prev) => ensureSeparatedRevenueRows(revenues.length > 0 ? revenues : prev));
  }, [revenues, students, activeFiscalYear.id]);

  // Per-Head rates for the 4 stages
  const [rateSubKinder, setRateSubKinder] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('1.1') || (i.itemName.includes('อุดหนุน') && i.itemName.includes('อนุบาล')));
    return r ? r.ratePerHead : 1800;
  });
  const [rateSubPrimary, setRateSubPrimary] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('1.2') || (i.itemName.includes('อุดหนุน') && i.itemName.includes('ประถม')));
    return r ? r.ratePerHead : 2050;
  });
  const [rateSubSecLower, setRateSubSecLower] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('1.3') || (i.itemName.includes('อุดหนุน') && i.itemName.includes('มัธยมต้น')));
    return r ? r.ratePerHead : 3700;
  });
  const [rateSubSecUpper, setRateSubSecUpper] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('1.4') || (i.itemName.includes('อุดหนุน') && i.itemName.includes('มัธยมปลาย')));
    return r ? r.ratePerHead : 4100;
  });

  // Learner Activity rates for the 4 stages
  const [rateActKinder, setRateActKinder] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('2.1') || (i.itemName.includes('กิจกรรม') && i.itemName.includes('อนุบาล')));
    return r ? r.ratePerHead : 464;
  });
  const [rateActPrimary, setRateActPrimary] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('2.2') || (i.itemName.includes('กิจกรรม') && i.itemName.includes('ประถม')));
    return r ? r.ratePerHead : 518;
  });
  const [rateActSecLower, setRateActSecLower] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('2.3') || (i.itemName.includes('กิจกรรม') && i.itemName.includes('มัธยมต้น')));
    return r ? r.ratePerHead : 966;
  });
  const [rateActSecUpper, setRateActSecUpper] = useState<number>(() => {
    const r = items.find((i) => i.itemName.includes('2.4') || (i.itemName.includes('กิจกรรม') && i.itemName.includes('มัธยมปลาย')));
    return r ? r.ratePerHead : 1026;
  });

  // Apply Quick Rates configured in top panel to all 8 items using actual student counts
  const handleApplyQuickRates = () => {
    setItems((prev) =>
      prev.map((r) => {
        // Subsidy rows
        if (r.itemName.includes('1.1') || (r.category === 'subsidy' && r.itemName.includes('อนุบาล'))) {
          return { ...r, ratePerHead: rateSubKinder, eligibleCount: kinderCount, calculatedAmount: Math.round(rateSubKinder * kinderCount) };
        }
        if (r.itemName.includes('1.2') || (r.category === 'subsidy' && r.itemName.includes('ประถม'))) {
          return { ...r, ratePerHead: rateSubPrimary, eligibleCount: primaryCount, calculatedAmount: Math.round(rateSubPrimary * primaryCount) };
        }
        if (r.itemName.includes('1.3') || (r.category === 'subsidy' && (r.itemName.includes('มัธยมต้น') || r.itemName.includes('มัธยมศึกษาตอนต้น')))) {
          return { ...r, ratePerHead: rateSubSecLower, eligibleCount: secLowerCount, calculatedAmount: Math.round(rateSubSecLower * secLowerCount) };
        }
        if (r.itemName.includes('1.4') || (r.category === 'subsidy' && (r.itemName.includes('มัธยมปลาย') || r.itemName.includes('มัธยมศึกษาตอนปลาย')))) {
          return { ...r, ratePerHead: rateSubSecUpper, eligibleCount: secUpperCount, calculatedAmount: Math.round(rateSubSecUpper * secUpperCount) };
        }

        // Activity rows
        if (r.itemName.includes('2.1') || (r.category === 'activity' && r.itemName.includes('อนุบาล'))) {
          return { ...r, ratePerHead: rateActKinder, eligibleCount: kinderCount, calculatedAmount: Math.round(rateActKinder * kinderCount) };
        }
        if (r.itemName.includes('2.2') || (r.category === 'activity' && r.itemName.includes('ประถม'))) {
          return { ...r, ratePerHead: rateActPrimary, eligibleCount: primaryCount, calculatedAmount: Math.round(rateActPrimary * primaryCount) };
        }
        if (r.itemName.includes('2.3') || (r.category === 'activity' && (r.itemName.includes('มัธยมต้น') || r.itemName.includes('มัธยมศึกษาตอนต้น')))) {
          return { ...r, ratePerHead: rateActSecLower, eligibleCount: secLowerCount, calculatedAmount: Math.round(rateActSecLower * secLowerCount) };
        }
        if (r.itemName.includes('2.4') || (r.category === 'activity' && (r.itemName.includes('มัธยมปลาย') || r.itemName.includes('มัธยมศึกษาตอนปลาย')))) {
          return { ...r, ratePerHead: rateActSecUpper, eligibleCount: secUpperCount, calculatedAmount: Math.round(rateActSecUpper * secUpperCount) };
        }

        return r;
      })
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Field change
  const handleItemChange = (id: number, field: keyof RevenueItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'ratePerHead' || field === 'eligibleCount') {
            const rate = field === 'ratePerHead' ? Number(val) || 0 : item.ratePerHead;
            const count = field === 'eligibleCount' ? Number(val) || 0 : item.eligibleCount;
            updated.calculatedAmount = Math.round(rate * count);
          } else if (field === 'calculatedAmount') {
            updated.calculatedAmount = Number(val) || 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add new revenue item
  const handleAddItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map((i) => Number(i.id) || 0)) + 1 : 1;
    const newItem: RevenueItem = {
      id: newId,
      schoolId: 1,
      fiscalYearId: activeFiscalYear.id,
      category: 'other',
      itemName: `รายการรายรับเพิ่มเติมที่ ${items.length + 1}`,
      ratePerHead: 0,
      eligibleCount: actualTotal,
      calculatedAmount: 0,
      isCustomRate: false,
      note: 'ระบุรายละเอียดหรือแหล่งที่มาของเงิน',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleRemoveItem = (id: number) => {
    if (window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // Sync all student counts to actual numbers from StudentDataView
  const handleSyncStudentCounts = () => {
    setItems((prev) =>
      prev.map((item) => {
        let targetCount = item.eligibleCount;
        if (item.itemName.includes('อนุบาล')) targetCount = kinderCount;
        else if (item.itemName.includes('ประถม')) targetCount = primaryCount;
        else if (item.itemName.includes('มัธยมต้น') || item.itemName.includes('มัธยมศึกษาตอนต้น')) targetCount = secLowerCount;
        else if (item.itemName.includes('มัธยมปลาย') || item.itemName.includes('มัธยมศึกษาตอนปลาย')) targetCount = secUpperCount;
        else if (!item.isCustomRate && (item.itemName.includes('นักเรียน') || item.category === 'welfare')) {
          targetCount = actualTotal;
        }

        return {
          ...item,
          eligibleCount: targetCount,
          calculatedAmount: Math.round(item.ratePerHead * targetCount),
        };
      })
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Reset to standard OBEC preset
  const handleApplyObecPreset = () => {
    if (window.confirm('ปรับอัตราเงินอุดหนุนรายหัวและเงินกิจกรรมพัฒนาผู้เรียนทั้ง 4 ช่วงชั้นตามเกณฑ์ สพฐ. มาตรฐานหรือไม่?')) {
      setRateSubKinder(1800);
      setRateSubPrimary(2050);
      setRateSubSecLower(3700);
      setRateSubSecUpper(4100);

      setRateActKinder(464);
      setRateActPrimary(518);
      setRateActSecLower(966);
      setRateActSecUpper(1026);

      setItems((prev) =>
        prev.map((r) => {
          if (r.itemName.includes('1.1') || (r.category === 'subsidy' && r.itemName.includes('อนุบาล'))) {
            return { ...r, ratePerHead: 1800, eligibleCount: kinderCount, calculatedAmount: Math.round(1800 * kinderCount) };
          }
          if (r.itemName.includes('1.2') || (r.category === 'subsidy' && r.itemName.includes('ประถม'))) {
            return { ...r, ratePerHead: 2050, eligibleCount: primaryCount, calculatedAmount: Math.round(2050 * primaryCount) };
          }
          if (r.itemName.includes('1.3') || (r.category === 'subsidy' && (r.itemName.includes('มัธยมต้น') || r.itemName.includes('มัธยมศึกษาตอนต้น')))) {
            return { ...r, ratePerHead: 3700, eligibleCount: secLowerCount, calculatedAmount: Math.round(3700 * secLowerCount) };
          }
          if (r.itemName.includes('1.4') || (r.category === 'subsidy' && (r.itemName.includes('มัธยมปลาย') || r.itemName.includes('มัธยมศึกษาตอนปลาย')))) {
            return { ...r, ratePerHead: 4100, eligibleCount: secUpperCount, calculatedAmount: Math.round(4100 * secUpperCount) };
          }
          if (r.itemName.includes('2.1') || (r.category === 'activity' && r.itemName.includes('อนุบาล'))) {
            return { ...r, ratePerHead: 464, eligibleCount: kinderCount, calculatedAmount: Math.round(464 * kinderCount) };
          }
          if (r.itemName.includes('2.2') || (r.category === 'activity' && r.itemName.includes('ประถม'))) {
            return { ...r, ratePerHead: 518, eligibleCount: primaryCount, calculatedAmount: Math.round(518 * primaryCount) };
          }
          if (r.itemName.includes('2.3') || (r.category === 'activity' && (r.itemName.includes('มัธยมต้น') || r.itemName.includes('มัธยมศึกษาตอนต้น')))) {
            return { ...r, ratePerHead: 966, eligibleCount: secLowerCount, calculatedAmount: Math.round(966 * secLowerCount) };
          }
          if (r.itemName.includes('2.4') || (r.category === 'activity' && (r.itemName.includes('มัธยมปลาย') || r.itemName.includes('มัธยมศึกษาตอนปลาย')))) {
            return { ...r, ratePerHead: 1026, eligibleCount: secUpperCount, calculatedAmount: Math.round(1026 * secUpperCount) };
          }
          return r;
        })
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.calculatedAmount) || 0), 0);

  // Subtotals
  const totalSubsidyAmount = items
    .filter((r) => r.category === 'subsidy' || r.itemName.includes('เงินอุดหนุนรายหัว'))
    .reduce((sum, r) => sum + (Number(r.calculatedAmount) || 0), 0);

  const totalActivityAmount = items
    .filter((r) => r.category === 'activity' || r.itemName.includes('กิจกรรมพัฒนาผู้เรียน'))
    .reduce((sum, r) => sum + (Number(r.calculatedAmount) || 0), 0);

  const handleSave = () => {
    const payload = items.map((r) => ({
      ...r,
      schoolId: r.schoolId || activeFiscalYear.schoolId || 1,
      fiscalYearId: activeFiscalYear.id,
      calculatedAmount: Math.round((Number(r.ratePerHead) || 0) * (Number(r.eligibleCount) || 0)),
    }));
    onUpdateRevenues(payload);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportExcel = () => {
    const exportData = items.map((r, idx) => ({
      ลำดับ: idx + 1,
      รายการรายรับ: r.itemName,
      'อัตราต่อคน (บาท)': r.ratePerHead,
      'จำนวนผู้มีสิทธิ์ (คน)': r.eligibleCount,
      'จำนวนเงินรวม (บาท)': r.calculatedAmount,
      หมายเหตุ: r.note || '',
    }));
    exportToExcel('ประมาณการรายรับ', `ประมาณการรายรับ_ปี${activeFiscalYear.year}`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-700" />
            <span>ประมาณการรายรับสถานศึกษา (แยก 4 ช่วงชั้น สพฐ.)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คำนวณเงินอุดหนุนรายหัวและเงินกิจกรรมพัฒนาผู้เรียนแยกตามระดับ อนุบาล, ประถม, มัธยมต้น, มัธยมปลาย จากจำนวนนักเรียนจริง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs">
              <Check className="h-4 w-4" />
              <span>บันทึกและคำนวณยอดเงินรวมใหม่แล้ว</span>
            </div>
          )}
          <button
            id="btn-sync-students-to-revenue"
            type="button"
            onClick={handleSyncStudentCounts}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            title="ดึงยอดนักเรียนจริงจากหน้านักเรียนมาคำนวณใหม่ทันที"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>ดึงยอดนักเรียนจริง ({actualTotal} คน)</span>
          </button>
          <button
            id="btn-apply-obec-preset-revenue"
            type="button"
            onClick={handleApplyObecPreset}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            title="ปรับปรุงอัตราตามเกณฑ์มาตรฐาน สพฐ."
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>โหลดเกณฑ์ สพฐ. 4 ระดับ</span>
          </button>
          <button
            id="btn-export-revenue-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            id="btn-save-revenue"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกข้อมูลรายรับ</span>
          </button>
        </div>
      </div>

      {/* Actual Student Count Indicator Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-blue-900 text-white p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-blue-200">นักเรียนจริงทั้งหมด</div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1">{actualTotal} <span className="text-xs text-blue-200">คน</span></div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-amber-900">1. อนุบาล (อ.1-3)</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{kinderCount} <span className="text-xs text-slate-500">คน</span></div>
        </div>
        <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-blue-900">2. ประถม (ป.1-6)</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{primaryCount} <span className="text-xs text-slate-500">คน</span></div>
        </div>
        <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-950">3. มัธยมต้น (ม.1-3)</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{secLowerCount} <span className="text-xs text-slate-500">คน</span></div>
        </div>
        <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-purple-950">4. มัธยมปลาย (ม.4-6)</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{secUpperCount} <span className="text-xs text-slate-500">คน</span></div>
        </div>
      </div>

      {/* Per-Head & Learner Activity Rate Setting Panel for Current Fiscal Year */}
      <div className="bg-white rounded-2xl border-2 border-blue-200/90 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-700" />
              <span>กำหนดอัตราและคำนวณจากจำนวนนักเรียนจริง (4 ช่วงชั้น: อนุบาล • ประถม • มัธยมต้น • มัธยมปลาย)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กรอกอัตราต่อคนของแต่ละระดับชั้น จากนั้นกดปุ่ม "คำนวณและปรับใช้อัตราตามจำนวนนักเรียนจริง" ด้านขวา
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyQuickRates}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>คำนวณและปรับใช้อัตราตามจำนวนนักเรียนจริง</span>
          </button>
        </div>

        {/* Section 1: Per-Head Subsidy 4 Stages */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            <span>หมวด 1: เงินอุดหนุนรายหัว (การจัดการศึกษาขั้นพื้นฐาน)</span>
            <span className="text-[11px] text-blue-700 font-mono">รวมหมวด: {totalSubsidyAmount.toLocaleString()} บาท</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Subsidy: Kindergarten */}
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 space-y-1">
              <div className="text-[11px] font-bold text-amber-900">1.1 อนุบาล (อ.1-3)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateSubKinder}
                  onChange={(e) => setRateSubKinder(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-amber-950 bg-white border border-amber-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-amber-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {kinderCount} คน</span>
                <span className="font-bold font-mono">{(rateSubKinder * kinderCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Subsidy: Primary */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-1">
              <div className="text-[11px] font-bold text-blue-900">1.2 ประถม (ป.1-6)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateSubPrimary}
                  onChange={(e) => setRateSubPrimary(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-blue-950 bg-white border border-blue-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-blue-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {primaryCount} คน</span>
                <span className="font-bold font-mono">{(rateSubPrimary * primaryCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Subsidy: Lower Secondary */}
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200 space-y-1">
              <div className="text-[11px] font-bold text-indigo-950">1.3 มัธยมต้น (ม.1-3)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateSubSecLower}
                  onChange={(e) => setRateSubSecLower(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-indigo-950 bg-white border border-indigo-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-indigo-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {secLowerCount} คน</span>
                <span className="font-bold font-mono">{(rateSubSecLower * secLowerCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Subsidy: Upper Secondary */}
            <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200 space-y-1">
              <div className="text-[11px] font-bold text-purple-950">1.4 มัธยมปลาย (ม.4-6)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateSubSecUpper}
                  onChange={(e) => setRateSubSecUpper(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-purple-950 bg-white border border-purple-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-purple-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {secUpperCount} คน</span>
                <span className="font-bold font-mono">{(rateSubSecUpper * secUpperCount).toLocaleString()} บ.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Learner Activity 4 Stages */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            <span>หมวด 2: เงินกิจกรรมพัฒนาคุณภาพผู้เรียน (4 กิจกรรมหลัก สพฐ.)</span>
            <span className="text-[11px] text-indigo-700 font-mono">รวมหมวด: {totalActivityAmount.toLocaleString()} บาท</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Activity: Kindergarten */}
            <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200 space-y-1">
              <div className="text-[11px] font-bold text-amber-900">2.1 อนุบาล (อ.1-3)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateActKinder}
                  onChange={(e) => setRateActKinder(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-amber-950 bg-white border border-amber-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-amber-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {kinderCount} คน</span>
                <span className="font-bold font-mono">{(rateActKinder * kinderCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Activity: Primary */}
            <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 space-y-1">
              <div className="text-[11px] font-bold text-blue-900">2.2 ประถม (ป.1-6)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateActPrimary}
                  onChange={(e) => setRateActPrimary(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-blue-950 bg-white border border-blue-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-blue-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {primaryCount} คน</span>
                <span className="font-bold font-mono">{(rateActPrimary * primaryCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Activity: Lower Secondary */}
            <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-200 space-y-1">
              <div className="text-[11px] font-bold text-indigo-950">2.3 มัธยมต้น (ม.1-3)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateActSecLower}
                  onChange={(e) => setRateActSecLower(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-indigo-950 bg-white border border-indigo-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-indigo-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {secLowerCount} คน</span>
                <span className="font-bold font-mono">{(rateActSecLower * secLowerCount).toLocaleString()} บ.</span>
              </div>
            </div>

            {/* Activity: Upper Secondary */}
            <div className="bg-purple-50/40 p-3 rounded-xl border border-purple-200 space-y-1">
              <div className="text-[11px] font-bold text-purple-950">2.4 มัธยมปลาย (ม.4-6)</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rateActSecUpper}
                  onChange={(e) => setRateActSecUpper(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-purple-950 bg-white border border-purple-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 shrink-0">บ./คน</span>
              </div>
              <div className="text-[10px] text-purple-800 flex items-center justify-between pt-0.5">
                <span>นักเรียน: {secUpperCount} คน</span>
                <span className="font-bold font-mono">{(rateActSecUpper * secUpperCount).toLocaleString()} บ.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table of Revenue Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>ตารางแจกแจงรายการประมาณการรายรับสถานศึกษา</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              สามารถแก้ไขอัตราต่อคน หรือจำนวนผู้มีสิทธิ์ในตารางได้โดยตรง ระบบจะคำนวณจำนวนเงินรวมให้อัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>เพิ่มรายการรายรับ</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                <th className="py-3 px-4 min-w-[280px]">รายการรายรับ</th>
                <th className="py-3 px-4 text-right w-36">อัตราต่อคน (บาท)</th>
                <th className="py-3 px-4 text-center w-36">จำนวนผู้มีสิทธิ์ (คน)</th>
                <th className="py-3 px-4 text-right w-44 bg-blue-50/70 text-blue-950 font-bold">จำนวนเงินรวม (บาท)</th>
                <th className="py-3 px-4 min-w-[200px]">หมายเหตุ / เกณฑ์ สพฐ.</th>
                <th className="py-3 px-4 w-12 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const isSubHeader =
                  item.itemName.startsWith('1.') ||
                  item.itemName.startsWith('2.') ||
                  item.itemName.startsWith('3.') ||
                  item.itemName.startsWith('4.') ||
                  item.itemName.startsWith('5.') ||
                  item.itemName.startsWith('6.');

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.itemName.startsWith('1.')
                        ? 'bg-blue-50/20'
                        : item.itemName.startsWith('2.')
                        ? 'bg-indigo-50/20'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                        className={`w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 py-0.5 focus:outline-none ${
                          isSubHeader ? 'font-bold text-slate-900' : 'text-slate-800'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.ratePerHead}
                        onChange={(e) => handleItemChange(item.id, 'ratePerHead', e.target.value)}
                        className="w-28 text-right rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.eligibleCount}
                        onChange={(e) => handleItemChange(item.id, 'eligibleCount', e.target.value)}
                        className="w-24 text-center rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-mono font-bold text-blue-900 bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-right bg-blue-50/40 font-mono font-bold text-blue-950 text-sm">
                      {Number(item.calculatedAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                        placeholder="ระบุหมายเหตุ..."
                        className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 py-0.5 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer transition-colors"
                        title="ลบรายการ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-sm">
                <td colSpan={4} className="py-4 px-4 text-right">
                  ประมาณการรายรับรวมทั้งสิ้นของสถานศึกษา:
                </td>
                <td className="py-4 px-4 text-right bg-amber-400 text-slate-950 font-black text-lg font-mono">
                  {grandTotal.toLocaleString()} บ.
                </td>
                <td colSpan={2} className="py-4 px-4 text-xs text-slate-300">
                  พร้อมนำไปจัดสรรแผนงบประมาณ 4 ฝ่าย
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
