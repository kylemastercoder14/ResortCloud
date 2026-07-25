-- CreateEnum
CREATE TYPE "TenantLaundryStatus" AS ENUM ('RECEIVED', 'WASHING', 'DRYING', 'READY', 'RETURNED');

-- CreateEnum
CREATE TYPE "TenantLaundryPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "TenantLaundryCategory" AS ENUM ('ROOM_LINEN', 'TOWELS', 'STAFF_UNIFORMS', 'GUEST_LAUNDRY');

-- CreateTable
CREATE TABLE "tenant_laundry_job" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guestOrRoom" TEXT NOT NULL,
    "category" "TenantLaundryCategory" NOT NULL,
    "pieces" INTEGER NOT NULL,
    "dueTime" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "TenantLaundryPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TenantLaundryStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_laundry_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_laundry_job_tenantProfileId_idx" ON "tenant_laundry_job"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_laundry_job_category_idx" ON "tenant_laundry_job"("category");

-- CreateIndex
CREATE INDEX "tenant_laundry_job_priority_idx" ON "tenant_laundry_job"("priority");

-- CreateIndex
CREATE INDEX "tenant_laundry_job_status_idx" ON "tenant_laundry_job"("status");

-- CreateIndex
CREATE INDEX "tenant_laundry_job_receivedAt_idx" ON "tenant_laundry_job"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_laundry_job_tenantProfileId_code_key" ON "tenant_laundry_job"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_laundry_job" ADD CONSTRAINT "tenant_laundry_job_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
