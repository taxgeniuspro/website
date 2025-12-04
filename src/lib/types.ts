// Re-export types from Prisma for components
export type {
  User,
  Profile,
  Referral,
  Contest,
  ContestParticipant,
  MarketingMaterial,
  Notification,
  TaxReturn,
  Document,
  Payment,
  Commission,
  ChatRoom,
  ChatMessage,
  UserRole,
  ReferralStatus,
  ContestType,
  NotificationType,
  TaxReturnStatus,
  DocumentType,
  PaymentStatus,
  PaymentType,
  MaterialType,
  AnalyticsEventType,
} from '@prisma/client';

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
