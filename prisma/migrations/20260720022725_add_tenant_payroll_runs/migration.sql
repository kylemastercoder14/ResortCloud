-- CreateEnum
CREATE TYPE "TenantPayrollRunStatus" AS ENUM ('DRAFT', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "TenantPayrollPayType" AS ENUM ('REGULAR', 'FINAL');

-- CreateEnum
CREATE TYPE "TenantPayrollFrequency" AS ENUM ('MONTHLY', 'BI_WEEKLY');

-- CreateTable
CREATE TABLE "tenant_payroll_run" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "payType" "TenantPayrollPayType" NOT NULL DEFAULT 'REGULAR',
    "frequency" "TenantPayrollFrequency" NOT NULL DEFAULT 'MONTHLY',
    "department" TEXT,
    "notes" TEXT,
    "status" "TenantPayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "includedEmployees" INTEGER NOT NULL DEFAULT 0,
    "excludedEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalBasicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIncentives" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOvertimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalGrossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalLeaveDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalUndertimeDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalGovernmentDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOtherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerContributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "options" JSONB,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_payroll_item" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "roleName" TEXT,
    "departmentName" TEXT,
    "employmentType" TEXT,
    "workLocation" TEXT,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "regularHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "undertimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "basicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incentives" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leaveDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "undertimeDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "governmentDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payroll_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_payroll_run_tenantProfileId_idx" ON "tenant_payroll_run"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_payroll_run_periodStart_idx" ON "tenant_payroll_run"("periodStart");

-- CreateIndex
CREATE INDEX "tenant_payroll_run_status_idx" ON "tenant_payroll_run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_payroll_run_tenantProfileId_code_key" ON "tenant_payroll_run"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_payroll_item_tenantProfileId_idx" ON "tenant_payroll_item"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_payroll_item_staffProfileId_idx" ON "tenant_payroll_item"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_payroll_item_payrollRunId_staffProfileId_key" ON "tenant_payroll_item"("payrollRunId", "staffProfileId");

-- AddForeignKey
ALTER TABLE "tenant_payroll_run" ADD CONSTRAINT "tenant_payroll_run_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payroll_item" ADD CONSTRAINT "tenant_payroll_item_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "tenant_payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payroll_item" ADD CONSTRAINT "tenant_payroll_item_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payroll_item" ADD CONSTRAINT "tenant_payroll_item_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
