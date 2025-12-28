
export enum UserRole {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  ITF_OFFICER = 'ITF_OFFICER'
}

export enum LogStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  ERROR = 'ERROR'
}

export interface SIWESLog {
  id: string;
  studentId: string;
  date: string;
  weekNumber: number;
  activityDescription: string;
  evidenceImageUrl?: string;
  status: LogStatus;
  syncStatus: SyncStatus; // Tracks if the log is saved to cloud or just local
  supervisorComment?: string;
  timestamp: number;
  lastModified: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  matricNumber: string;
  institution: string;
  course: string;
  placementOrg: string;
  supervisorId: string;
  progress: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InstitutionStats {
  id: string;
  name: string;
  activeStudents: number;
  totalStudents: number;
  approvedLogs: number;
}
