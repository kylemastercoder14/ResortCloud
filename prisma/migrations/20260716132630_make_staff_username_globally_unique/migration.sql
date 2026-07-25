-- Drop tenant-scoped username uniqueness so username can be used for global login.
DROP INDEX IF EXISTS "tenant_staff_profile_tenantProfileId_username_key";

-- PostgreSQL allows multiple NULL values in a unique index, so username remains optional.
CREATE UNIQUE INDEX "tenant_staff_profile_username_key" ON "tenant_staff_profile"("username");
