-- Affiliate System Enhancement Migration
-- Inspired by Fluent Affiliate Pro

-- Create new enums
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FLAT', 'TIERED');
CREATE TYPE "CreativePrivacy" AS ENUM ('PUBLIC', 'PRIVATE', 'GROUP_ONLY');
CREATE TYPE "CreativeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED');
CREATE TYPE "CreativeType" AS ENUM ('IMAGE', 'TEXT', 'VIDEO', 'BANNER', 'EMAIL_TEMPLATE', 'SOCIAL_POST', 'FLYER', 'BUSINESS_CARD');
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'INACTIVE');

-- Create AffiliateGroup table
CREATE TABLE "affiliate_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionRate" DECIMAL(5,2),
    "flatAmount" DECIMAL(10,2),
    "tieredRates" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minimumPayout" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "payoutFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "totalAffiliates" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_groups_pkey" PRIMARY KEY ("id")
);

-- Create AffiliateCreative table
CREATE TABLE "affiliate_creatives" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CreativeType" NOT NULL DEFAULT 'IMAGE',
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "text" TEXT,
    "htmlContent" TEXT,
    "videoUrl" TEXT,
    "downloadUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "targetUrl" TEXT,
    "privacy" "CreativePrivacy" NOT NULL DEFAULT 'PUBLIC',
    "affiliateIds" TEXT[],
    "groupIds" TEXT[],
    "status" "CreativeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "category" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "affiliate_creatives_pkey" PRIMARY KEY ("id")
);

-- Create CreativeUsage table
CREATE TABLE "creative_usage" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "platform" TEXT,
    "campaignId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_usage_pkey" PRIMARY KEY ("id")
);

-- Create junction table for AffiliateGroup <-> AffiliateCreative many-to-many
CREATE TABLE "_GroupCreatives" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Add new columns to profiles table
ALTER TABLE "profiles" ADD COLUMN "affiliateGroupId" TEXT;
ALTER TABLE "profiles" ADD COLUMN "customCommissionType" "CommissionType";
ALTER TABLE "profiles" ADD COLUMN "customCommissionRate" DECIMAL(5,2);
ALTER TABLE "profiles" ADD COLUMN "customFlatAmount" DECIMAL(10,2);
ALTER TABLE "profiles" ADD COLUMN "customMinimumPayout" DECIMAL(10,2);
ALTER TABLE "profiles" ADD COLUMN "affiliateStatus" "AffiliateStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "profiles" ADD COLUMN "affiliateApprovedAt" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN "affiliateApprovedBy" TEXT;
ALTER TABLE "profiles" ADD COLUMN "totalConversions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "lifetimeEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "currentTier" TEXT;

-- Add new columns to commissions table
ALTER TABLE "commissions" ALTER COLUMN "referralId" DROP NOT NULL;
ALTER TABLE "commissions" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "commissions" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "commissions" ADD COLUMN "clientName" TEXT;
ALTER TABLE "commissions" ADD COLUMN "clientEmail" TEXT;
ALTER TABLE "commissions" ADD COLUMN "grossAmount" DECIMAL(10,2);
ALTER TABLE "commissions" ADD COLUMN "commissionType" "CommissionType";
ALTER TABLE "commissions" ADD COLUMN "commissionRate" DECIMAL(5,2);
ALTER TABLE "commissions" ADD COLUMN "rateSource" TEXT;
ALTER TABLE "commissions" ADD COLUMN "groupIdAtCreation" TEXT;
ALTER TABLE "commissions" ADD COLUMN "pendingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "commissions" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "commissions" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "commissions" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "commissions" ADD COLUMN "approvalNotes" TEXT;
ALTER TABLE "commissions" ADD COLUMN "payoutRequestId" TEXT;

-- Create unique index for affiliate_groups name
CREATE UNIQUE INDEX "affiliate_groups_name_key" ON "affiliate_groups"("name");

-- Create indexes for affiliate_groups
CREATE INDEX "affiliate_groups_isActive_idx" ON "affiliate_groups"("isActive");
CREATE INDEX "affiliate_groups_name_idx" ON "affiliate_groups"("name");

-- Create indexes for affiliate_creatives
CREATE INDEX "affiliate_creatives_status_privacy_idx" ON "affiliate_creatives"("status", "privacy");
CREATE INDEX "affiliate_creatives_type_idx" ON "affiliate_creatives"("type");
CREATE INDEX "affiliate_creatives_category_idx" ON "affiliate_creatives"("category");
CREATE INDEX "affiliate_creatives_startDate_endDate_idx" ON "affiliate_creatives"("startDate", "endDate");
CREATE INDEX "affiliate_creatives_createdAt_idx" ON "affiliate_creatives"("createdAt");

-- Create indexes for creative_usage
CREATE INDEX "creative_usage_creativeId_affiliateId_idx" ON "creative_usage"("creativeId", "affiliateId");
CREATE INDEX "creative_usage_usedAt_idx" ON "creative_usage"("usedAt");
CREATE INDEX "creative_usage_action_idx" ON "creative_usage"("action");

-- Create indexes for junction table
CREATE UNIQUE INDEX "_GroupCreatives_AB_unique" ON "_GroupCreatives"("A", "B");
CREATE INDEX "_GroupCreatives_B_index" ON "_GroupCreatives"("B");

-- Create indexes for profiles new columns
CREATE INDEX "profiles_affiliateGroupId_idx" ON "profiles"("affiliateGroupId");
CREATE INDEX "profiles_affiliateStatus_idx" ON "profiles"("affiliateStatus");

-- Create indexes for commissions new columns
CREATE INDEX "commissions_sourceType_sourceId_idx" ON "commissions"("sourceType", "sourceId");
CREATE INDEX "commissions_payoutRequestId_idx" ON "commissions"("payoutRequestId");

-- Add foreign key constraints
ALTER TABLE "creative_usage" ADD CONSTRAINT "creative_usage_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "affiliate_creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_GroupCreatives" ADD CONSTRAINT "_GroupCreatives_A_fkey" FOREIGN KEY ("A") REFERENCES "affiliate_creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_GroupCreatives" ADD CONSTRAINT "_GroupCreatives_B_fkey" FOREIGN KEY ("B") REFERENCES "affiliate_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_affiliateGroupId_fkey" FOREIGN KEY ("affiliateGroupId") REFERENCES "affiliate_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
