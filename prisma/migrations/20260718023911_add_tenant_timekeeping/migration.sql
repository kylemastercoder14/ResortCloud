-- CreateEnum
CREATE TYPE "TenantTimeLogFlag" AS ENUM ('ON_TIME', 'LATE', 'ABSENT');

-- CreateTable
CREATE TABLE "tenant_time_log" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "flag" "TenantTimeLogFlag" NOT NULL DEFAULT 'ON_TIME',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_time_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_time_log_tenantProfileId_idx" ON "tenant_time_log"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_time_log_staffProfileId_idx" ON "tenant_time_log"("staffProfileId");

-- CreateIndex
CREATE INDEX "tenant_time_log_date_idx" ON "tenant_time_log"("date");

-- CreateIndex
CREATE INDEX "tenant_time_log_flag_idx" ON "tenant_time_log"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_time_log_staffProfileId_date_key" ON "tenant_time_log"("staffProfileId", "date");

-- AddForeignKey
ALTER TABLE "tenant_time_log" ADD CONSTRAINT "tenant_time_log_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_time_log" ADD CONSTRAINT "tenant_time_log_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "tenant_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
