-- CreateEnum
CREATE TYPE "TenantStaffStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "tenant_staff_profile" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "roleName" TEXT NOT NULL,
    "status" "TenantStaffStatus" NOT NULL DEFAULT 'INVITED',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_staff_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_staff_profile_appUserId_key" ON "tenant_staff_profile"("appUserId");

-- CreateIndex
CREATE INDEX "tenant_staff_profile_tenantProfileId_idx" ON "tenant_staff_profile"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_staff_profile_roleName_idx" ON "tenant_staff_profile"("roleName");

-- CreateIndex
CREATE INDEX "tenant_staff_profile_status_idx" ON "tenant_staff_profile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_staff_profile_tenantProfileId_username_key" ON "tenant_staff_profile"("tenantProfileId", "username");

-- AddForeignKey
ALTER TABLE "tenant_staff_profile" ADD CONSTRAINT "tenant_staff_profile_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_staff_profile" ADD CONSTRAINT "tenant_staff_profile_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_user"("authUserId") ON DELETE CASCADE ON UPDATE CASCADE;
