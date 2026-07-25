-- CreateEnum
CREATE TYPE "TenantTransactionExportFormat" AS ENUM ('CSV', 'PDF', 'XLSX');

-- CreateEnum
CREATE TYPE "TenantTransactionExportStatus" AS ENUM ('READY', 'SCHEDULED', 'FAILED');

-- CreateTable
CREATE TABLE "tenant_transaction_export" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "format" "TenantTransactionExportFormat" NOT NULL,
    "status" "TenantTransactionExportStatus" NOT NULL DEFAULT 'READY',
    "size" TEXT NOT NULL DEFAULT '--',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_transaction_export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_transaction_export_tenantProfileId_idx" ON "tenant_transaction_export"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_transaction_export_status_idx" ON "tenant_transaction_export"("status");

-- CreateIndex
CREATE INDEX "tenant_transaction_export_createdAt_idx" ON "tenant_transaction_export"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_transaction_export_tenantProfileId_code_key" ON "tenant_transaction_export"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_transaction_export" ADD CONSTRAINT "tenant_transaction_export_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
