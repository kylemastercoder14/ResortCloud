CREATE TYPE "TenantFolioChargeStatus" AS ENUM ('UNBILLED', 'INVOICED', 'VOIDED', 'ADJUSTED');

CREATE TYPE "TenantFolioChargeType" AS ENUM ('STAY', 'ADDITIONAL', 'FEE', 'ADJUSTMENT');

CREATE TYPE "TenantPaymentLogStatus" AS ENUM ('RECORDED', 'VOIDED');

ALTER TABLE "tenant_reservation"
ADD COLUMN "packageName" TEXT,
ADD COLUMN "packagePrice" TEXT,
ADD COLUMN "roomsIncluded" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "tenant_folio_charge" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "code" TEXT NOT NULL,
    "type" "TenantFolioChargeType" NOT NULL DEFAULT 'ADDITIONAL',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "TenantFolioChargeStatus" NOT NULL DEFAULT 'UNBILLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_folio_charge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_payment_log" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "code" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "proofUrl" TEXT,
    "proofNote" TEXT,
    "status" "TenantPaymentLogStatus" NOT NULL DEFAULT 'RECORDED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_payment_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_folio_charge_tenantProfileId_code_key" ON "tenant_folio_charge"("tenantProfileId", "code");
CREATE INDEX "tenant_folio_charge_tenantProfileId_idx" ON "tenant_folio_charge"("tenantProfileId");
CREATE INDEX "tenant_folio_charge_reservationId_idx" ON "tenant_folio_charge"("reservationId");
CREATE INDEX "tenant_folio_charge_invoiceId_idx" ON "tenant_folio_charge"("invoiceId");
CREATE INDEX "tenant_folio_charge_status_idx" ON "tenant_folio_charge"("status");

CREATE UNIQUE INDEX "tenant_payment_log_tenantProfileId_code_key" ON "tenant_payment_log"("tenantProfileId", "code");
CREATE INDEX "tenant_payment_log_tenantProfileId_idx" ON "tenant_payment_log"("tenantProfileId");
CREATE INDEX "tenant_payment_log_reservationId_idx" ON "tenant_payment_log"("reservationId");
CREATE INDEX "tenant_payment_log_invoiceId_idx" ON "tenant_payment_log"("invoiceId");
CREATE INDEX "tenant_payment_log_status_idx" ON "tenant_payment_log"("status");
CREATE INDEX "tenant_payment_log_paidAt_idx" ON "tenant_payment_log"("paidAt");

ALTER TABLE "tenant_folio_charge" ADD CONSTRAINT "tenant_folio_charge_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_folio_charge" ADD CONSTRAINT "tenant_folio_charge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "tenant_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_folio_charge" ADD CONSTRAINT "tenant_folio_charge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_payment_log" ADD CONSTRAINT "tenant_payment_log_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_payment_log" ADD CONSTRAINT "tenant_payment_log_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "tenant_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_payment_log" ADD CONSTRAINT "tenant_payment_log_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
