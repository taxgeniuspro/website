// Local type definitions (replacing @prisma/client exports)

// User roles
export type UserRole = 'admin' | 'client' | 'tax_preparer' | 'affiliate' | 'lead';

// Referral status
export type ReferralStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

// Contest type
export type ContestType = 'REFERRAL_COUNT' | 'REVENUE' | 'CONVERSION_RATE' | 'LEADERBOARD';

// Notification type
export type NotificationType =
  | 'SYSTEM'
  | 'REFERRAL'
  | 'PAYMENT'
  | 'MESSAGE'
  | 'DOCUMENT'
  | 'TAX_RETURN'
  | 'CONTEST'
  | 'MARKETING';

// Tax return status
export type TaxReturnStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FILED'
  | 'COMPLETED';

// Document type
export type DocumentType =
  | 'W2'
  | '1099'
  | 'ID'
  | 'TAX_RETURN'
  | 'RECEIPT'
  | 'OTHER';

// Payment status
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

// Payment type
export type PaymentType =
  | 'TAX_FILING'
  | 'COMMISSION'
  | 'REFUND'
  | 'SUBSCRIPTION'
  | 'PRODUCT';

// Material type
export type MaterialType =
  | 'FLYER'
  | 'SOCIAL_POST'
  | 'EMAIL_TEMPLATE'
  | 'VIDEO'
  | 'BANNER'
  | 'QR_CODE';

// Analytics event type
export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'CLICK'
  | 'CONVERSION'
  | 'SIGNUP'
  | 'LOGIN'
  | 'PURCHASE';

// User interface
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Profile interface
export interface Profile {
  id: string;
  userId: string;
  supabaseUserId?: string | null;
  email?: string | null;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  shortLinkUsername?: string | null;
  trackingCode?: string | null;
  customTrackingCode?: string | null;
  affiliateStatus?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Referral interface
export interface Referral {
  id: string;
  referrerId: string;
  referredId?: string | null;
  status: ReferralStatus;
  commissionAmount?: number | null;
  paidAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Contest interface
export interface Contest {
  id: string;
  name: string;
  description?: string | null;
  type: ContestType;
  startDate: Date | string;
  endDate: Date | string;
  prize?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Contest participant interface
export interface ContestParticipant {
  id: string;
  contestId: string;
  profileId: string;
  score: number;
  rank?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Marketing material interface
export interface MarketingMaterial {
  id: string;
  name: string;
  type: MaterialType;
  url?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | string | null;
  data?: Record<string, unknown> | null;
  createdAt: Date | string;
}

// Tax return interface
export interface TaxReturn {
  id: string;
  clientId: string;
  preparerId?: string | null;
  status: TaxReturnStatus;
  taxYear: number;
  filingType?: string | null;
  submittedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Document interface
export interface Document {
  id: string;
  userId: string;
  taxReturnId?: string | null;
  type: DocumentType;
  name: string;
  url: string;
  mimeType?: string | null;
  size?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Payment interface
export interface Payment {
  id: string;
  userId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  stripePaymentId?: string | null;
  description?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Commission interface
export interface Commission {
  id: string;
  profileId: string;
  referralId?: string | null;
  amount: number;
  status: PaymentStatus;
  paidAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Chat room interface
export interface ChatRoom {
  id: string;
  name?: string | null;
  type: 'DIRECT' | 'GROUP' | 'SUPPORT';
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: Date | string | null;
  createdAt: Date | string;
}

// Custom types for leaderboard
export interface ContestLeaderboardEntry {
  id: string;
  contest_id: string;
  referrer_id: string;
  rank: number;
  score: number;
  last_calculated: string;
  referrer: {
    first_name?: string | null;
    last_name?: string | null;
    vanity_slug?: string | null;
  };
}
