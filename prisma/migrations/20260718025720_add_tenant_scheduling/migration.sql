-- CreateEnum
CREATE TYPE "TenantScheduleShiftStatus" AS ENUM ('ASSIGNED', 'OPEN', 'CHANGED');

-- CreateTable
CREATE TABLE "tenant_schedule_shift" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "shift" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "TenantScheduleShiftStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_schedule_shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_schedule_shift_tenantProfileId_idx" ON "tenant_schedule_shift"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_schedule_shift_staffProfileId_idx" ON "tenant_schedule_shift"("staffProfileId");

-- CreateIndex
CREATE INDEX "tenant_schedule_shift_startAt_idx" ON "tenant_schedule_shift"("startAt");

-- CreateIndex
CREATE INDEX "tenant_schedule_shift_status_idx" ON "tenant_schedule_shift"("status");

-- AddForeignKey
ALTER TABLE "tenant_schedule_shift" ADD CONSTRAINT "tenant_schedule_shift_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_schedule_shift" ADD CONSTRAINT "tenant_schedule_shift_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
