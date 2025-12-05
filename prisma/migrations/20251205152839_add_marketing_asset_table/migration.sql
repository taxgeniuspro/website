-- CreateTable: MarketingAsset
CREATE TABLE "public"."MarketingAsset" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingAsset_profileId_idx" ON "public"."MarketingAsset"("profileId");

-- AddForeignKey
ALTER TABLE "public"."MarketingAsset" ADD CONSTRAINT "MarketingAsset_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
