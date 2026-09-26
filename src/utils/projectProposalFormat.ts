import { ProjectProposal } from '../types';

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function fiscalMonthRange(year: number, from: number, to: number): string {
  const month = (index: number) => {
    const absolute = 9 + Math.max(1, Math.min(12, index)) - 1;
    return `${thaiMonths[absolute % 12]} ${String(year - 1 + Math.floor(absolute / 12)).slice(-2)}`;
  };
  return from === to ? month(from) : `${month(from)} - ${month(to)}`;
}

export function normalizeProjectProposal(proposal: ProjectProposal, schoolName: string, year: number, requestedTarget = ''): ProjectProposal {
  const group = `นักเรียน${schoolName}`;
  const target = proposal.quantitativeTarget?.trim();
  const generic = !target || /^(กลุ่มเป้าหมาย|นักเรียนและครูผู้สอน|นักเรียนทุกคน)/.test(target) && !target.includes(schoolName);
  const activities = (proposal.activities || []).map(activity => {
    const duration = activity.duration || '';
    const match = duration.match(/เดือนที่\s*(\d{1,2})(?:\s*[-–ถึง]+\s*(\d{1,2}))?/);
    return { ...activity, duration: match ? fiscalMonthRange(year, Number(match[1]), Number(match[2] || match[1])) : duration };
  });
  return {
    ...proposal,
    projectName: (proposal.projectName || '').replace(/^โครงการ\s*/, '').trim(),
    quantitativeTarget: generic ? `${requestedTarget ? `${requestedTarget}${requestedTarget.includes(schoolName) ? '' : ` (${schoolName})`}` : group} เข้าร่วมกิจกรรมตามจำนวนและระดับชั้นที่โรงเรียนกำหนด` : target,
    location: !proposal.location || proposal.location === 'สถานศึกษาและแหล่งเรียนรู้ที่เกี่ยวข้อง' ? schoolName : proposal.location,
    activities,
  };
}
