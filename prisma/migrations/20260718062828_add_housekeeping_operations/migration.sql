-- CreateEnum
CREATE TYPE "TenantHousekeepingStatus" AS ENUM ('CLEAN', 'DIRTY', 'OCCUPIED', 'VACANT');

-- CreateEnum
CREATE TYPE "TenantHousekeepingDamageStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "tenant_housekeeping_room" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "attendantStaffProfileId" TEXT,
    "status" "TenantHousekeepingStatus" NOT NULL DEFAULT 'VACANT',
    "lastPhotoNote" TEXT,
    "lastPhotoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_housekeeping_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_housekeeping_damage_report" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "photoNote" TEXT,
    "status" "TenantHousekeepingDamageStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_housekeeping_damage_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_housekeeping_room_roomId_key" ON "tenant_housekeeping_room"("roomId");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_room_tenantProfileId_idx" ON "tenant_housekeeping_room"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_room_attendantStaffProfileId_idx" ON "tenant_housekeeping_room"("attendantStaffProfileId");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_room_status_idx" ON "tenant_housekeeping_room"("status");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_damage_report_tenantProfileId_idx" ON "tenant_housekeeping_damage_report"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_damage_report_roomId_idx" ON "tenant_housekeeping_damage_report"("roomId");

-- CreateIndex
CREATE INDEX "tenant_housekeeping_damage_report_status_idx" ON "tenant_housekeeping_damage_report"("status");

-- AddForeignKey
ALTER TABLE "tenant_housekeeping_room" ADD CONSTRAINT "tenant_housekeeping_room_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_housekeeping_room" ADD CONSTRAINT "tenant_housekeeping_room_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "tenant_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_housekeeping_room" ADD CONSTRAINT "tenant_housekeeping_room_attendantStaffProfileId_fkey" FOREIGN KEY ("attendantStaffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_housekeeping_damage_report" ADD CONSTRAINT "tenant_housekeeping_damage_report_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_housekeeping_damage_report" ADD CONSTRAINT "tenant_housekeeping_damage_report_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "tenant_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
