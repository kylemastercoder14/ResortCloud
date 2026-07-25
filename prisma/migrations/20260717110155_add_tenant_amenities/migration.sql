-- CreateEnum
CREATE TYPE "TenantAmenityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TenantAmenityScope" AS ENUM ('ROOM_LEVEL', 'PROPERTY_LEVEL');

-- CreateEnum
CREATE TYPE "TenantAmenityFeeUnit" AS ENUM ('PER_STAY', 'PER_DAY', 'PER_USE');

-- CreateTable
CREATE TABLE "tenant_amenity" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "description" TEXT,
    "appliesTo" "TenantAmenityScope" NOT NULL DEFAULT 'ROOM_LEVEL',
    "chargeable" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" TEXT,
    "feeUnit" "TenantAmenityFeeUnit" NOT NULL DEFAULT 'PER_STAY',
    "status" "TenantAmenityStatus" NOT NULL DEFAULT 'ACTIVE',
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_amenity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_amenity_tenantProfileId_idx" ON "tenant_amenity"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_amenity_status_idx" ON "tenant_amenity"("status");

-- CreateIndex
CREATE INDEX "tenant_amenity_category_idx" ON "tenant_amenity"("category");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_amenity_tenantProfileId_code_key" ON "tenant_amenity"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_amenity" ADD CONSTRAINT "tenant_amenity_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
