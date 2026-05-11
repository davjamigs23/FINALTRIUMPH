import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { auth } from '../firebase'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: any): string {
  if (!date) return 'N/A';
  
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date?.toDate === 'function') {
    d = date.toDate();
  } else if (date?.seconds !== undefined) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString();
}

export function formatYear(date: any): string {
  if (!date) return new Date().getFullYear().toString();
  
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date?.toDate === 'function') {
    d = date.toDate();
  } else if (date?.seconds !== undefined) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return new Date().getFullYear().toString();
  
  return d.getFullYear().toString();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const isPermissionError = error instanceof Error && error.message.includes('Missing or insufficient permissions');
  const isUnauthenticated = !auth.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }

  // If it's a permission error during unauthenticated state (likely logout), 
  // we just log it as a warning and don't throw to avoid crashing the UI
  if (isPermissionError && isUnauthenticated) {
    console.warn('Firestore Permission Error (Unauthenticated): ', JSON.stringify(errInfo));
    // We still throw to avoid returning 'never' correctly, but maybe we should return null?
    // Actually, callers expect this to throw or return never.
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  
  throw new Error(JSON.stringify(errInfo));
}
