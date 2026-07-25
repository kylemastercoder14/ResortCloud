-- CreateEnum
CREATE TYPE "TenantReceptionQueueStatus" AS ENUM ('ARRIVING', 'IN_HOUSE', 'CHECKING_OUT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TenantReceptionRequestPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "TenantReceptionRequestStatus" AS ENUM ('OPEN', 'SENT', 'RESOLVED');

-- AlterTable
ALTER TABLE "tenant_reservation" ADD COLUMN     "frontDeskStatus" "TenantReceptionQueueStatus";

-- CreateTable
CREATE TABLE "tenant_reception_request" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "reservationId" TEXT,
    "department" TEXT NOT NULL,
    "roomOrArea" TEXT NOT NULL,
    "priority" "TenantReceptionRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "note" TEXT NOT NULL,
    "status" "TenantReceptionRequestStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_reception_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_reception_shift_note" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_reception_shift_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_reception_request_tenantProfileId_idx" ON "tenant_reception_request"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_reception_request_reservationId_idx" ON "tenant_reception_request"("reservationId");

-- CreateIndex
CREATE INDEX "tenant_reception_request_department_idx" ON "tenant_reception_request"("department");

-- CreateIndex
CREATE INDEX "tenant_reception_request_status_idx" ON "tenant_reception_request"("status");

-- CreateIndex
CREATE INDEX "tenant_reception_shift_note_tenantProfileId_idx" ON "tenant_reception_shift_note"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_reception_shift_note_createdAt_idx" ON "tenant_reception_shift_note"("createdAt");

-- CreateIndex
CREATE INDEX "tenant_reservation_frontDeskStatus_idx" ON "tenant_reservation"("frontDeskStatus");

-- AddForeignKey
ALTER TABLE "tenant_reception_request" ADD CONSTRAINT "tenant_reception_request_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_reception_request" ADD CONSTRAINT "tenant_reception_request_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "tenant_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_reception_shift_note" ADD CONSTRAINT "tenant_reception_shift_note_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
