-- CreateEnum
CREATE TYPE "TenantLeadStage" AS ENUM ('INTAKE', 'QUALIFIED', 'PAYMENT_DONE', 'CONVERTED');

-- CreateEnum
CREATE TYPE "TenantLeadChannel" AS ENUM ('MESSENGER');

-- CreateEnum
CREATE TYPE "TenantLeadMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "tenant_messenger_integration" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT,
    "pageAccessToken" TEXT,
    "verifyToken" TEXT,
    "subscribedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_messenger_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_lead" (
    "id" TEXT NOT NULL,
    "tenantProfileId" TEXT NOT NULL,
    "messengerIntegrationId" TEXT,
    "psid" TEXT NOT NULL,
    "channel" "TenantLeadChannel" NOT NULL DEFAULT 'MESSENGER',
    "guestName" TEXT NOT NULL DEFAULT 'Messenger guest',
    "inquiry" TEXT,
    "lastMessage" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Organic',
    "stage" "TenantLeadStage" NOT NULL DEFAULT 'INTAKE',
    "targetDate" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_lead_message" (
    "id" TEXT NOT NULL,
    "tenantLeadId" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "direction" "TenantLeadMessageDirection" NOT NULL DEFAULT 'INBOUND',
    "text" TEXT,
    "attachments" JSONB,
    "postbackPayload" TEXT,
    "raw" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_lead_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_messenger_integration_pageId_key" ON "tenant_messenger_integration"("pageId");

-- CreateIndex
CREATE INDEX "tenant_messenger_integration_tenantProfileId_idx" ON "tenant_messenger_integration"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_messenger_integration_isActive_idx" ON "tenant_messenger_integration"("isActive");

-- CreateIndex
CREATE INDEX "tenant_lead_tenantProfileId_idx" ON "tenant_lead"("tenantProfileId");

-- CreateIndex
CREATE INDEX "tenant_lead_messengerIntegrationId_idx" ON "tenant_lead"("messengerIntegrationId");

-- CreateIndex
CREATE INDEX "tenant_lead_stage_idx" ON "tenant_lead"("stage");

-- CreateIndex
CREATE INDEX "tenant_lead_lastMessageAt_idx" ON "tenant_lead"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_lead_tenantProfileId_psid_key" ON "tenant_lead"("tenantProfileId", "psid");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_lead_message_metaMessageId_key" ON "tenant_lead_message"("metaMessageId");

-- CreateIndex
CREATE INDEX "tenant_lead_message_tenantLeadId_idx" ON "tenant_lead_message"("tenantLeadId");

-- CreateIndex
CREATE INDEX "tenant_lead_message_senderId_idx" ON "tenant_lead_message"("senderId");

-- CreateIndex
CREATE INDEX "tenant_lead_message_recipientId_idx" ON "tenant_lead_message"("recipientId");

-- CreateIndex
CREATE INDEX "tenant_lead_message_sentAt_idx" ON "tenant_lead_message"("sentAt");

-- AddForeignKey
ALTER TABLE "tenant_messenger_integration" ADD CONSTRAINT "tenant_messenger_integration_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_lead" ADD CONSTRAINT "tenant_lead_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_lead" ADD CONSTRAINT "tenant_lead_messengerIntegrationId_fkey" FOREIGN KEY ("messengerIntegrationId") REFERENCES "tenant_messenger_integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_lead_message" ADD CONSTRAINT "tenant_lead_message_tenantLeadId_fkey" FOREIGN KEY ("tenantLeadId") REFERENCES "tenant_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
