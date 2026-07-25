-- CreateEnum
CREATE TYPE "TenantRoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TenantRoomSmokingPolicy" AS ENUM ('NON_SMOKING', 'SMOKING');

-- CreateTable
CREATE TABLE "tenant_room" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "baseRate" TEXT NOT NULL,
    "peakRate" TEXT,
    "extraPersonCharge" TEXT,
    "maxAdults" INTEGER NOT NULL DEFAULT 0,
    "childrenOccupancy" INTEGER NOT NULL DEFAULT 0,
    "bedConfiguration" TEXT NOT NULL,
    "roomSize" TEXT,
    "viewType" TEXT NOT NULL,
    "smokingPolicy" "TenantRoomSmokingPolicy" NOT NULL DEFAULT 'NON_SMOKING',
    "status" "TenantRoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "checkIn" TEXT NOT NULL DEFAULT '14:00:00',
    "checkOut" TEXT NOT NULL DEFAULT '12:00:00',
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "guestNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_room_photo" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_room_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TenantRoomAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TenantRoomAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "tenant_room_tenantProfileId_idx" ON "tenant_room"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_room_status_idx" ON "tenant_room"("status");

-- CreateIndex
CREATE INDEX "tenant_room_type_idx" ON "tenant_room"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_room_tenantProfileId_code_key" ON "tenant_room"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_room_photo_roomId_idx" ON "tenant_room_photo"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_room_photo_key_key" ON "tenant_room_photo"("key");

-- CreateIndex
CREATE INDEX "_TenantRoomAmenities_B_index" ON "_TenantRoomAmenities"("B");

-- AddForeignKey
ALTER TABLE "tenant_room" ADD CONSTRAINT "tenant_room_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_room_photo" ADD CONSTRAINT "tenant_room_photo_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "tenant_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantRoomAmenities" ADD CONSTRAINT "_TenantRoomAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "tenant_amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantRoomAmenities" ADD CONSTRAINT "_TenantRoomAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "tenant_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
