/*
  Warnings:

  - Changed the type of `category` on the `tenant_laundry_job` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "tenant_laundry_job" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TenantLaundryCategory";

-- CreateIndex
CREATE INDEX "tenant_laundry_job_category_idx" ON "tenant_laundry_job"("category");
