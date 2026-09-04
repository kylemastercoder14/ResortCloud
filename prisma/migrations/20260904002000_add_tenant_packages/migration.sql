-- CreateEnum
CREATE TYPE "TenantPackageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "tenant_package" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "description" TEXT,
    "inclusionsNote" TEXT,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER,
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "TenantPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TenantPackageRooms" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TenantPackageRooms_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TenantPackageServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TenantPackageServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TenantPackageAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TenantPackageAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_package_tenantProfileId_code_key" ON "tenant_package"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_package_tenantProfileId_idx" ON "tenant_package"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_package_status_idx" ON "tenant_package"("status");

-- CreateIndex
CREATE INDEX "tenant_package_category_idx" ON "tenant_package"("category");

-- CreateIndex
CREATE INDEX "tenant_package_sortOrder_idx" ON "tenant_package"("sortOrder");

-- CreateIndex
CREATE INDEX "_TenantPackageRooms_B_index" ON "_TenantPackageRooms"("B");

-- CreateIndex
CREATE INDEX "_TenantPackageServices_B_index" ON "_TenantPackageServices"("B");

-- CreateIndex
CREATE INDEX "_TenantPackageAmenities_B_index" ON "_TenantPackageAmenities"("B");

-- AddForeignKey
ALTER TABLE "tenant_package" ADD CONSTRAINT "tenant_package_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageRooms" ADD CONSTRAINT "_TenantPackageRooms_A_fkey" FOREIGN KEY ("A") REFERENCES "tenant_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageRooms" ADD CONSTRAINT "_TenantPackageRooms_B_fkey" FOREIGN KEY ("B") REFERENCES "tenant_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageServices" ADD CONSTRAINT "_TenantPackageServices_A_fkey" FOREIGN KEY ("A") REFERENCES "tenant_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageServices" ADD CONSTRAINT "_TenantPackageServices_B_fkey" FOREIGN KEY ("B") REFERENCES "tenant_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageAmenities" ADD CONSTRAINT "_TenantPackageAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "tenant_amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantPackageAmenities" ADD CONSTRAINT "_TenantPackageAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "tenant_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
