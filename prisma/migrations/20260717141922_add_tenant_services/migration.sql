-- CreateEnum
CREATE TYPE "TenantServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TenantServiceBillingType" AS ENUM ('FIXED_PRICE', 'PER_HOUR', 'PER_GUEST', 'CUSTOM_QUOTE');

-- CreateTable
CREATE TABLE "tenant_service" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT,
    "baseCharge" TEXT NOT NULL,
    "billingType" "TenantServiceBillingType" NOT NULL DEFAULT 'FIXED_PRICE',
    "duration" TEXT,
    "bookingLeadTime" TEXT,
    "feeNote" TEXT,
    "description" TEXT,
    "internalNotes" TEXT,
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "status" "TenantServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_service_tenantProfileId_idx" ON "tenant_service"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_service_status_idx" ON "tenant_service"("status");

-- CreateIndex
CREATE INDEX "tenant_service_category_idx" ON "tenant_service"("category");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_service_tenantProfileId_code_key" ON "tenant_service"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_service" ADD CONSTRAINT "tenant_service_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
