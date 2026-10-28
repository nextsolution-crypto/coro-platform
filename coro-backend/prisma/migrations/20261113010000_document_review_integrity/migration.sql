CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'SUPERSEDED');
CREATE TYPE "DocumentReviewNotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

CREATE TABLE "DocumentReviewRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "documentVersion" INTEGER NOT NULL,
    "documentLockVersion" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "decisionVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentReviewNotificationEvent" (
    "id" TEXT NOT NULL,
    "reviewRequestId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "DocumentReviewNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentReviewNotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentReviewRequest_projectId_status_idx" ON "DocumentReviewRequest"("projectId", "status");
CREATE INDEX "DocumentReviewRequest_organizationId_submittedAt_idx" ON "DocumentReviewRequest"("organizationId", "submittedAt");
CREATE INDEX "DocumentReviewRequest_documentId_documentVersion_idx" ON "DocumentReviewRequest"("documentId", "documentVersion");
CREATE UNIQUE INDEX "DocumentReviewNotificationEvent_idempotencyKey_key" ON "DocumentReviewNotificationEvent"("idempotencyKey");
CREATE INDEX "DocumentReviewNotificationEvent_status_createdAt_idx" ON "DocumentReviewNotificationEvent"("status", "createdAt");
CREATE INDEX "DocumentReviewNotificationEvent_projectId_eventType_idx" ON "DocumentReviewNotificationEvent"("projectId", "eventType");

ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewNotificationEvent" ADD CONSTRAINT "DocumentReviewNotificationEvent_reviewRequestId_fkey" FOREIGN KEY ("reviewRequestId") REFERENCES "DocumentReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewNotificationEvent" ADD CONSTRAINT "DocumentReviewNotificationEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewNotificationEvent" ADD CONSTRAINT "DocumentReviewNotificationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historical approvals intentionally remain unlinked. No hash is synthesized
-- for decisions whose exact reviewed content cannot be reconstructed.
