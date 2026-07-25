-- AlterTable
ALTER TABLE "app_user" ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_staff_profile" ALTER COLUMN "username" DROP NOT NULL;
