-- CreateEnum
CREATE TYPE "TenantInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "TenantInvoiceReminderCadence" AS ENUM ('STANDARD', 'LIGHT', 'STRICT', 'PAUSED');

-- CreateTable
CREATE TABLE "tenant_invoice" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "reservationId" TEXT,
    "code" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TenantInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentMethod" TEXT,
    "reminderCadence" "TenantInvoiceReminderCadence" NOT NULL DEFAULT 'STANDARD',
    "paymentInstructions" TEXT,
    "notes" TEXT,
    "subtotal" TEXT NOT NULL,
    "discount" TEXT NOT NULL DEFAULT '0',
    "tax" TEXT NOT NULL DEFAULT '0',
    "depositPaid" TEXT NOT NULL DEFAULT '0',
    "totalAmount" TEXT NOT NULL,
    "balanceDue" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "nextReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invoice_line_item" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tenant_invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_invoice_tenantProfileId_idx" ON "tenant_invoice"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_invoice_reservationId_idx" ON "tenant_invoice"("reservationId");

-- CreateIndex
CREATE INDEX "tenant_invoice_status_idx" ON "tenant_invoice"("status");

-- CreateIndex
CREATE INDEX "tenant_invoice_dueDate_idx" ON "tenant_invoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoice_tenantProfileId_code_key" ON "tenant_invoice"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_invoice_line_item_invoiceId_idx" ON "tenant_invoice_line_item"("invoiceId");

-- AddForeignKey
ALTER TABLE "tenant_invoice" ADD CONSTRAINT "tenant_invoice_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoice" ADD CONSTRAINT "tenant_invoice_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "tenant_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoice_line_item" ADD CONSTRAINT "tenant_invoice_line_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
