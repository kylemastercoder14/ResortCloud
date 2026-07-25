-- CreateEnum
CREATE TYPE "TenantStaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "tenant_staff_invitation" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "message" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" "TenantStaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_staff_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_staff_invitation_tokenHash_key" ON "tenant_staff_invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "tenant_staff_invitation_tenantProfileId_idx" ON "tenant_staff_invitation"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_staff_invitation_email_idx" ON "tenant_staff_invitation"("email");

-- CreateIndex
CREATE INDEX "tenant_staff_invitation_status_idx" ON "tenant_staff_invitation"("status");

-- AddForeignKey
ALTER TABLE "tenant_staff_invitation" ADD CONSTRAINT "tenant_staff_invitation_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
