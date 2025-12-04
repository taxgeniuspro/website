/**
 * CRM System Types (Epic 7)
 *
 * Type definitions for CRM Contact Management, Interactions, and Pipeline Management
 */

import {
  ContactType,
  InteractionType,
  Direction,
  PipelineStage,
  CRMContact,
  CRMInteraction,
  CRMStageHistory,
} from '@prisma/client';

// ============ Contact Management Types ============

export interface CRMContactInput {
  userId?: string | null;
  contactType: ContactType;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  filingStatus?: string;
  dependents?: number;
  previousYearAGI?: number;
  taxYear?: number;
  source?: string;
  assignedPreparerId?: string;
  // Lead Attribution (Epic 6 integration)
  referrerUsername?: string | null;
  referrerType?: string | null;
  commissionRate?: number | null;
  commissionRateLockedAt?: Date | null;
  attributionMethod?: string | null;
  attributionConfidence?: number;
}

export interface CRMContactUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  filingStatus?: string;
  dependents?: number;
  previousYearAGI?: number;
  taxYear?: number;
  stage?: PipelineStage;
  assignedPreparerId?: string;
  lastContactedAt?: Date;
}

export interface ContactFilters {
  stage?: PipelineStage;
  contactType?: ContactType;
  assignedPreparerId?: string;
  search?: string; // Search across name, email, phone
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CRMContactWithRelations extends CRMContact {
  user?: {
    id: string;
    email: string;
  } | null;
  interactions?: CRMInteraction[];
  stageHistory?: CRMStageHistory[];
  _count?: {
    interactions: number;
  };
}

export interface CRMContactListResponse {
  contacts: CRMContactWithRelations[];
  total: number;
  page: number;
  limit: number;
}

// ============ Interaction Types ============

export interface CRMInteractionInput {
  contactId: string;
  userId?: string | null;
  type: InteractionType;
  direction?: Direction;
  subject?: string;
  body?: string;
  duration?: number;
  occurredAt?: Date;
  emailId?: string;
  emailThreadId?: string;
  emailTo?: string[];
  emailCc?: string[];
  emailBcc?: string[];
  attachments?: AttachmentData[];
}

export interface CRMInteractionUpdate {
  subject?: string;
  body?: string;
  duration?: number;
  occurredAt?: Date;
  attachments?: AttachmentData[];
}

export interface AttachmentData {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface CRMInteractionWithRelations extends CRMInteraction {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  user?: {
    id: string;
    email: string;
  } | null;
}

// ============ Stage Management Types ============

export interface StageUpdateInput {
  contactId: string;
  fromStage?: PipelineStage;
  toStage: PipelineStage;
  changedBy?: string;
  changedByClerk?: string;
  reason?: string;
}

export interface CRMStageHistoryWithRelations extends CRMStageHistory {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============ API Response Types ============

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type CRMContactResponse = APIResponse<CRMContactWithRelations>;
export type CRMContactListResponseAPI = APIResponse<CRMContactListResponse>;
export type CRMInteractionResponse = APIResponse<CRMInteractionWithRelations>;
export type CRMInteractionListResponse = APIResponse<CRMInteractionWithRelations[]>;
export type CRMStageHistoryResponse = APIResponse<CRMStageHistoryWithRelations[]>;

// ============ Permission Helper Types ============

export interface CRMAccessContext {
  userId: string;
  userRole: string;
  preparerId?: string; // If user is a tax preparer, their preparer ID
}

// ============ Search Types ============

export interface ContactSearchParams {
  query?: string;
  contactType?: ContactType;
  stage?: PipelineStage;
  assignedPreparerId?: string;
  page?: number;
  limit?: number;
}

// ============ Export Types ============

export interface ContactExportData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  contactType: ContactType;
  stage: PipelineStage;
  assignedPreparer?: string;
  source?: string;
  lastContactedAt?: Date;
  totalInteractions: number;
  createdAt: Date;
  // Lead Attribution (Epic 6 integration)
  referrerUsername?: string;
  attributionMethod?: string;
  commissionRate?: number;
}

export interface InteractionExportData {
  id: string;
  contactName: string;
  contactEmail: string;
  type: InteractionType;
  direction: Direction;
  subject?: string;
  duration?: number;
  occurredAt: Date;
  loggedBy: string;
}

// ============ Report Types ============

export interface InteractionSummaryReport {
  totalInteractions: number;
  byType: Record<InteractionType, number>;
  byDirection: Record<Direction, number>;
  last7Days: number;
  last30Days: number;
  last90Days: number;
}

export interface PipelineHealthReport {
  totalContacts: number;
  byStage: Record<PipelineStage, number>;
  avgTimeInStage: Record<PipelineStage, number>; // in days
  conversionRate: number; // percentage from NEW to COMPLETE
}

export interface PreparerPerformanceReport {
  preparerId: string;
  preparerName: string;
  totalClients: number;
  totalInteractions: number;
  avgResponseTime: number; // in hours
  pipelineVelocity: number; // avg days from NEW to COMPLETE
  stageDistribution: Record<PipelineStage, number>;
}

// ============ Constants ============

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  CLIENT: 'Client',
  LEAD: 'Lead',
  AFFILIATE: 'Affiliate',
  PREPARER: 'Tax Preparer',
};

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  DOCUMENTS: 'Documents',
  PREPARING: 'Preparing',
  COMPLETE: 'Complete',
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  EMAIL: 'Email',
  PHONE_CALL: 'Phone Call',
  MEETING: 'Meeting',
  NOTE: 'Note',
  OTHER: 'Other',
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
};

// ============ Validation Constants ============

export const CRM_VALIDATION = {
  CONTACT: {
    FIRST_NAME_MIN: 1,
    FIRST_NAME_MAX: 100,
    LAST_NAME_MIN: 1,
    LAST_NAME_MAX: 100,
    EMAIL_MAX: 255,
    PHONE_MAX: 20,
    COMPANY_MAX: 200,
  },
  INTERACTION: {
    SUBJECT_MAX: 500,
    BODY_MAX: 50000,
    DURATION_MAX: 1440, // 24 hours in minutes
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
  },
};
