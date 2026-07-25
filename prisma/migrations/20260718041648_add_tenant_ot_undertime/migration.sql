-- CreateEnum
CREATE TYPE "TenantOtUndertimeType" AS ENUM ('OVERTIME', 'UNDERTIME');

-- CreateEnum
CREATE TYPE "TenantOtUndertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "tenant_ot_undertime_entry" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "type" "TenantOtUndertimeType" NOT NULL,
    "hours" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TenantOtUndertimeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_ot_undertime_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_ot_undertime_entry_tenantProfileId_idx" ON "tenant_ot_undertime_entry"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_ot_undertime_entry_staffProfileId_idx" ON "tenant_ot_undertime_entry"("staffProfileId");

-- CreateIndex
CREATE INDEX "tenant_ot_undertime_entry_type_idx" ON "tenant_ot_undertime_entry"("type");

-- CreateIndex
CREATE INDEX "tenant_ot_undertime_entry_status_idx" ON "tenant_ot_undertime_entry"("status");

-- AddForeignKey
ALTER TABLE "tenant_ot_undertime_entry" ADD CONSTRAINT "tenant_ot_undertime_entry_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_ot_undertime_entry" ADD CONSTRAINT "tenant_ot_undertime_entry_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
