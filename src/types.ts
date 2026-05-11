export type UserRole = 'ADMIN' | 'STUDENT' | 'PHOTOGRAPHER' | 'LAYOUT' | 'FINANCE';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  studentId?: string;
  course?: string;
  section?: string;
  batch?: string;
  quote?: string;
  achievements?: string;
  createdAt: string;
  isActive?: boolean;
}

export interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  course: string;
  section: string;
  batch: string;
  quote?: string;
  achievements?: string[];
  completionStatus: number;
  updatedAt: string;
}

export interface DocumentSubmission {
  id: string;
  type: 'CLEARANCE' | 'RECEIPT' | 'BIRTH_CERTIFICATE' | 'OTHER';
  fileUrl: string;
  fileName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  studentId: string;
  submittedAt: string;
  verifiedBy?: string;
  financeStatus?: 'NONE' | 'VERIFIED' | 'REJECTED';
  financeVerifiedAt?: string;
  financeVerifiedBy?: string;
}

export interface BookingSession {
  id: string;
  studentId: string;
  date: string;
  timeSlot: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  photographerId?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'URGENT' | 'GENERAL' | 'SCHEDULE';
  isPinned: boolean;
  authorId: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}
