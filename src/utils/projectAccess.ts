import { Project, User } from '../types';

const normalized = (text?: string) => (text || '').replace(/\s+/g, '').trim().toLocaleLowerCase('th-TH');

export const canSeeAllProjects = (user: User) => user.role === 'admin' || user.role === 'director' || user.role === 'superadmin' || /เจ้าหน้าที่แผน|งานแผนปฏิบัติการ/.test(user.position || '');

export const canAccessProject = (project: Project, user: User): boolean => {
  if (project.schoolId && project.schoolId !== user.schoolId && user.role !== 'superadmin') return false;
  if (canSeeAllProjects(user)) return true;
  const matchingId = !!project.responsibleId && project.responsibleId === user.id;
  const matchingCitizenId = !!project.proposerCitizenId && !!user.citizenId && project.proposerCitizenId.replace(/\D/g, '') === user.citizenId.replace(/\D/g, '');
  const matchingName = !!normalized(user.fullName) && [project.responsiblePerson, project.proposerName].some(name => normalized(name) === normalized(user.fullName));
  return matchingId || matchingCitizenId || matchingName;
};
