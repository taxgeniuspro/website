-- Step 1: Create new UserRole enum with updated values
CREATE TYPE "public"."UserRole_new" AS ENUM ('ADMIN', 'CLIENT', 'REFERRER', 'TAX_PREPARER', 'AFFILIATE');

-- Step 2: Update all existing role values to match new enum
-- Map PREPARER -> TAX_PREPARER
UPDATE "public"."profiles" SET role = 'CLIENT' WHERE role = 'CLIENT';
UPDATE "public"."profiles" SET role = 'ADMIN' WHERE role = 'ADMIN';
UPDATE "public"."profiles" SET role = 'REFERRER' WHERE role = 'REFERRER';

-- Step 3: Alter the column to use the new enum type
ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" TYPE "public"."UserRole_new"
  USING (
    CASE role::text
      WHEN 'PREPARER' THEN 'TAX_PREPARER'::text
      ELSE role::text
    END
  )::"public"."UserRole_new";

-- Step 4: Drop old enum and rename new one
DROP TYPE "public"."UserRole";
ALTER TYPE "public"."UserRole_new" RENAME TO "UserRole";

-- Step 5: Create Product table
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DECIMAL(10, 2) NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "interval" TEXT,
    "availableFor" TEXT[],
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "products_type_idx" ON "public"."products"("type");
CREATE INDEX "products_isActive_idx" ON "public"."products"("isActive");
CREATE INDEX "products_category_idx" ON "public"."products"("category");

-- Step 6: Create Subscription table
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "stripeSubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_stripeSubId_key" ON "public"."subscriptions"("stripeSubId");
CREATE INDEX "subscriptions_profileId_idx" ON "public"."subscriptions"("profileId");
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- Step 7: Create MarketingCampaign table
CREATE TABLE "public"."marketing_campaigns" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "customName" TEXT,
    "customPhoto" TEXT,
    "customPhone" TEXT,
    "customLicense" TEXT,
    "trackingCode" TEXT NOT NULL,
    "landingUrl" TEXT,
    "qrCodeUrl" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketing_campaigns_trackingCode_key" ON "public"."marketing_campaigns"("trackingCode");
CREATE INDEX "marketing_campaigns_creatorId_idx" ON "public"."marketing_campaigns"("creatorId");
CREATE INDEX "marketing_campaigns_trackingCode_idx" ON "public"."marketing_campaigns"("trackingCode");

-- Step 8: Add foreign key constraints
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
