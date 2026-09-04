ALTER TABLE "tenant_lead" ADD COLUMN "reservationId" TEXT;

CREATE INDEX "tenant_lead_reservationId_idx" ON "tenant_lead"("reservationId");

ALTER TABLE "tenant_lead" ADD CONSTRAINT "tenant_lead_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "tenant_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
