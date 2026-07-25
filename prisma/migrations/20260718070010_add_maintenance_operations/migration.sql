-- CreateEnum
CREATE TYPE "TenantMaintenancePriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "TenantMaintenanceRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "tenant_maintenance_request" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "roomId" TEXT,
    "code" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "notes" TEXT,
    "forwardedBy" TEXT NOT NULL DEFAULT 'Reception',
    "priority" "TenantMaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TenantMaintenanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_maintenance_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_maintenance_request_tenantProfileId_idx" ON "tenant_maintenance_request"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_maintenance_request_roomId_idx" ON "tenant_maintenance_request"("roomId");

-- CreateIndex
CREATE INDEX "tenant_maintenance_request_priority_idx" ON "tenant_maintenance_request"("priority");

-- CreateIndex
CREATE INDEX "tenant_maintenance_request_status_idx" ON "tenant_maintenance_request"("status");

-- CreateIndex
CREATE INDEX "tenant_maintenance_request_createdAt_idx" ON "tenant_maintenance_request"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_maintenance_request_tenantProfileId_code_key" ON "tenant_maintenance_request"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_maintenance_request" ADD CONSTRAINT "tenant_maintenance_request_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_maintenance_request" ADD CONSTRAINT "tenant_maintenance_request_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "tenant_room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
