-- CreateEnum
CREATE TYPE "TenantFinanceEntryType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TenantFinanceEntrySource" AS ENUM ('MANUAL', 'AUTO_BOOKING', 'INVOICE_PAYMENT');

-- CreateEnum
CREATE TYPE "TenantFinanceEntryStatus" AS ENUM ('CLEARED', 'PENDING');

-- CreateTable
CREATE TABLE "tenant_finance_entry" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TenantFinanceEntryType" NOT NULL,
    "source" "TenantFinanceEntrySource" NOT NULL DEFAULT 'MANUAL',
    "status" "TenantFinanceEntryStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "amount" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "receiptKey" TEXT,
    "receiptName" TEXT,
    "receiptUrl" TEXT,
    "receiptSize" INTEGER,
    "receiptType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_finance_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_finance_entry_tenantProfileId_idx" ON "tenant_finance_entry"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_finance_entry_type_idx" ON "tenant_finance_entry"("type");

-- CreateIndex
CREATE INDEX "tenant_finance_entry_status_idx" ON "tenant_finance_entry"("status");

-- CreateIndex
CREATE INDEX "tenant_finance_entry_entryDate_idx" ON "tenant_finance_entry"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_finance_entry_tenantProfileId_code_key" ON "tenant_finance_entry"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_finance_entry" ADD CONSTRAINT "tenant_finance_entry_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
