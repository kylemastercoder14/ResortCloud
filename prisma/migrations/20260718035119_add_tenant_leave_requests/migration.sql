-- CreateEnum
CREATE TYPE "TenantLeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "tenant_leave_request" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceDays" INTEGER NOT NULL DEFAULT 0,
    "status" "TenantLeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_leave_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_leave_request_tenantProfileId_idx" ON "tenant_leave_request"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_leave_request_staffProfileId_idx" ON "tenant_leave_request"("staffProfileId");

-- CreateIndex
CREATE INDEX "tenant_leave_request_status_idx" ON "tenant_leave_request"("status");

-- CreateIndex
CREATE INDEX "tenant_leave_request_startDate_idx" ON "tenant_leave_request"("startDate");

-- AddForeignKey
ALTER TABLE "tenant_leave_request" ADD CONSTRAINT "tenant_leave_request_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_leave_request" ADD CONSTRAINT "tenant_leave_request_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
