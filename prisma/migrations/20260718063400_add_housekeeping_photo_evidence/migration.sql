-- AlterTable
ALTER TABLE "tenant_housekeeping_damage_report" ADD COLUMN     "photoKey" TEXT,
ADD COLUMN     "photoName" TEXT,
ADD COLUMN     "photoSize" INTEGER,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "tenant_housekeeping_room" ADD COLUMN     "lastPhotoKey" TEXT,
ADD COLUMN     "lastPhotoName" TEXT,
ADD COLUMN     "lastPhotoSize" INTEGER,
ADD COLUMN     "lastPhotoUrl" TEXT;
