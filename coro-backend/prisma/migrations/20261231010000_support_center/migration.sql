-- Centre d'aide : tickets, messages et pièces jointes (24 nov. 2026).

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "subject" TEXT NOT NULL,
    "requesterUserId" TEXT,
    "requesterClientUserId" TEXT,
    "clientId" TEXT,
    "buildingId" TEXT,
    "context" JSONB,
    "assignedUserId" TEXT,
    "duplicateOfId" TEXT,
    "legacyFeedbackId" TEXT,
    "firstResponseDueAt" TIMESTAMP(3) NOT NULL,
    "firstRespondedAt" TIMESTAMP(3),
    "lastRequesterActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAgentActivityAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorClientUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "malwareScanStatus" TEXT,
    "malwareScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");
CREATE UNIQUE INDEX "SupportTicket_legacyFeedbackId_key" ON "SupportTicket"("legacyFeedbackId");
CREATE INDEX "SupportTicket_queue_status_priority_idx" ON "SupportTicket"("queue", "status", "priority");
CREATE INDEX "SupportTicket_organizationId_queue_status_idx" ON "SupportTicket"("organizationId", "queue", "status");
CREATE INDEX "SupportTicket_requesterUserId_createdAt_idx" ON "SupportTicket"("requesterUserId", "createdAt");
CREATE INDEX "SupportTicket_requesterClientUserId_createdAt_idx" ON "SupportTicket"("requesterClientUserId", "createdAt");
CREATE INDEX "SupportTicket_duplicateOfId_idx" ON "SupportTicket"("duplicateOfId");
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");
CREATE UNIQUE INDEX "SupportTicketAttachment_storageKey_key" ON "SupportTicketAttachment"("storageKey");
CREATE INDEX "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");
CREATE INDEX "SupportTicketAttachment_malwareScanStatus_idx" ON "SupportTicketAttachment"("malwareScanStatus");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportTicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reprise des anciens « feedbacks » (Nous écrire) en tickets de la file CORO. Rien n'est supprimé.
INSERT INTO "SupportTicket" (
    "id", "organizationId", "channel", "queue", "type", "impact", "priority", "status", "subject",
    "requesterUserId", "legacyFeedbackId", "firstResponseDueAt", "lastRequesterActivityAt", "createdAt", "updatedAt",
    "resolvedAt", "firstRespondedAt"
)
SELECT
    'legacy-' || f."id",
    f."organizationId",
    'ADVISOR_APP',
    'CORO',
    CASE WHEN f."category" IN ('BUG', 'SUGGESTION', 'QUESTION') THEN f."category" ELSE 'OTHER' END,
    CASE WHEN f."category" = 'BUG' THEN 'DISRUPTIVE' ELSE 'MINOR' END,
    CASE WHEN f."category" = 'BUG' THEN 2 ELSE 3 END,
    CASE f."status" WHEN 'RESOLU' THEN 'RESOLVED' WHEN 'EN_COURS' THEN 'IN_PROGRESS' WHEN 'LU' THEN 'IN_PROGRESS' ELSE 'NEW' END,
    LEFT(REGEXP_REPLACE(f."message", '\s+', ' ', 'g'), 90),
    f."userId",
    f."id",
    f."createdAt" + INTERVAL '3 days',
    f."createdAt",
    f."createdAt",
    CURRENT_TIMESTAMP,
    CASE WHEN f."status" = 'RESOLU' THEN CURRENT_TIMESTAMP ELSE NULL END,
    CASE WHEN f."status" IN ('LU', 'EN_COURS', 'RESOLU') THEN CURRENT_TIMESTAMP ELSE NULL END
FROM "Feedback" f;

INSERT INTO "SupportTicketMessage" ("id", "ticketId", "authorKind", "authorUserId", "authorName", "body", "createdAt")
SELECT
    'legacy-msg-' || f."id",
    'legacy-' || f."id",
    'REQUESTER',
    f."userId",
    TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')),
    f."message",
    f."createdAt"
FROM "Feedback" f
LEFT JOIN "User" u ON u."id" = f."userId";
