-- CreateEnum
CREATE TYPE "TenantDepartmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "tenant_staff_profile" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "isDepartmentHead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tenant_department" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "routing" TEXT,
    "status" "TenantDepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "headStaffProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_department_headStaffProfileId_key" ON "tenant_department"("headStaffProfileId");

-- CreateIndex
CREATE INDEX "tenant_department_tenantProfileId_idx" ON "tenant_department"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_department_status_idx" ON "tenant_department"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_department_tenantProfileId_code_key" ON "tenant_department"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_staff_profile_departmentId_idx" ON "tenant_staff_profile"("departmentId");

-- AddForeignKey
ALTER TABLE "tenant_staff_profile" ADD CONSTRAINT "tenant_staff_profile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "tenant_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_department" ADD CONSTRAINT "tenant_department_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_department" ADD CONSTRAINT "tenant_department_headStaffProfileId_fkey" FOREIGN KEY ("headStaffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
