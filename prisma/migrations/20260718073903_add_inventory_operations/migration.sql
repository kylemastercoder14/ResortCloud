-- CreateEnum
CREATE TYPE "TenantInventoryMovementType" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "tenant_inventory_item" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "dashboardAlert" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_inventory_movement" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TenantInventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_inventory_item_tenantProfileId_idx" ON "tenant_inventory_item"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_inventory_item_category_idx" ON "tenant_inventory_item"("category");

-- CreateIndex
CREATE INDEX "tenant_inventory_item_name_idx" ON "tenant_inventory_item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_inventory_item_tenantProfileId_code_key" ON "tenant_inventory_item"("tenantProfileId", "code");

-- CreateIndex
CREATE INDEX "tenant_inventory_movement_tenantProfileId_idx" ON "tenant_inventory_movement"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_inventory_movement_itemId_idx" ON "tenant_inventory_movement"("itemId");

-- CreateIndex
CREATE INDEX "tenant_inventory_movement_type_idx" ON "tenant_inventory_movement"("type");

-- CreateIndex
CREATE INDEX "tenant_inventory_movement_createdAt_idx" ON "tenant_inventory_movement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_inventory_movement_tenantProfileId_code_key" ON "tenant_inventory_movement"("tenantProfileId", "code");

-- AddForeignKey
ALTER TABLE "tenant_inventory_item" ADD CONSTRAINT "tenant_inventory_item_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_inventory_movement" ADD CONSTRAINT "tenant_inventory_movement_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_inventory_movement" ADD CONSTRAINT "tenant_inventory_movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "tenant_inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
