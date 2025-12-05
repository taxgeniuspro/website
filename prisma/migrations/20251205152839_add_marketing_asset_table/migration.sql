-- CreateTable: marketing_assets
CREATE TABLE "public"."marketing_assets" (
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

    CONSTRAINT "marketing_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_assets_profileId_idx" ON "public"."marketing_assets"("profileId");

-- CreateIndex
CREATE INDEX "marketing_assets_category_idx" ON "public"."marketing_assets"("category");

-- CreateIndex
CREATE INDEX "marketing_assets_isPrimary_idx" ON "public"."marketing_assets"("isPrimary");

-- AddForeignKey
ALTER TABLE "public"."marketing_assets" ADD CONSTRAINT "marketing_assets_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
