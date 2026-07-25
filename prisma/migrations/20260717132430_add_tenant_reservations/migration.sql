-- CreateEnum
CREATE TYPE "TenantReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED');

-- CreateTable
CREATE TABLE "tenant_reservation" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "deposit" TEXT,
    "totalAmount" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" "TenantReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_reservation_tenantProfileId_idx" ON "tenant_reservation"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_reservation_roomId_idx" ON "tenant_reservation"("roomId");

-- CreateIndex
CREATE INDEX "tenant_reservation_status_idx" ON "tenant_reservation"("status");

-- CreateIndex
CREATE INDEX "tenant_reservation_checkIn_checkOut_idx" ON "tenant_reservation"("checkIn", "checkOut");

-- AddForeignKey
ALTER TABLE "tenant_reservation" ADD CONSTRAINT "tenant_reservation_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_reservation" ADD CONSTRAINT "tenant_reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "tenant_room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
