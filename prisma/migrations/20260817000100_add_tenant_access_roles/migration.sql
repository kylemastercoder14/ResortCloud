-- CreateTable
CREATE TABLE "tenant_access_role" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_access_role_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tenant_staff_profile" ADD COLUMN "accessRoleId" TEXT;

-- Backfill roles from existing staff role names.
INSERT INTO "tenant_access_role" (
    "id",
    "tenantProfileId",
    "name",
    "description",
    "permissions",
    "createdAt",
    "updatedAt"
)
SELECT
    'tar_' || md5("tenantProfileId" || ':' || "roleName") AS "id",
    "tenantProfileId",
    "roleName" AS "name",
    'Migrated from staff role permissions.' AS "description",
    ARRAY(
        SELECT DISTINCT permissions.permission
        FROM "tenant_staff_profile" permission_source
        CROSS JOIN LATERAL unnest(permission_source."permissions") AS permissions(permission)
        WHERE permission_source."tenantProfileId" = staff."tenantProfileId"
          AND permission_source."roleName" = staff."roleName"
        ORDER BY permissions.permission
    ) AS "permissions",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "tenant_staff_profile" staff
WHERE trim(staff."roleName") <> ''
GROUP BY staff."tenantProfileId", staff."roleName";

UPDATE "tenant_staff_profile" staff
SET "accessRoleId" = role."id"
FROM "tenant_access_role" role
WHERE role."tenantProfileId" = staff."tenantProfileId"
  AND role."name" = staff."roleName";

-- CreateIndex
CREATE INDEX "tenant_access_role_tenantProfileId_idx" ON "tenant_access_role"("tenantProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_access_role_tenantProfileId_name_key" ON "tenant_access_role"("tenantProfileId", "name");

-- CreateIndex
CREATE INDEX "tenant_staff_profile_accessRoleId_idx" ON "tenant_staff_profile"("accessRoleId");

-- AddForeignKey
ALTER TABLE "tenant_access_role" ADD CONSTRAINT "tenant_access_role_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_staff_profile" ADD CONSTRAINT "tenant_staff_profile_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "tenant_access_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
