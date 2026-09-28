CREATE TABLE "MandateServiceOperation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
  "projectMandateId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL, "commercialRevision" TEXT NOT NULL, "result" JSONB NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MandateServiceOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MandateServiceOperation_payloadHash_check" CHECK (length("payloadHash") = 64),
  CONSTRAINT "MandateServiceOperation_commercialRevision_check" CHECK (length("commercialRevision") = 64)
);
ALTER TABLE "ProjectActivity" ADD COLUMN "replacementOfActivityId" TEXT;
CREATE UNIQUE INDEX "MandateServiceOperation_organizationId_idempotencyKey_key" ON "MandateServiceOperation"("organizationId", "idempotencyKey");
CREATE INDEX "MandateServiceOperation_projectMandateId_createdAt_idx" ON "MandateServiceOperation"("projectMandateId", "createdAt");
CREATE INDEX "MandateServiceOperation_projectId_createdAt_idx" ON "MandateServiceOperation"("projectId", "createdAt");
CREATE UNIQUE INDEX "ProjectActivity_replacementOfActivityId_key" ON "ProjectActivity"("replacementOfActivityId");
ALTER TABLE "MandateServiceOperation" ADD CONSTRAINT "MandateServiceOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MandateServiceOperation" ADD CONSTRAINT "MandateServiceOperation_projectMandateId_projectId_organizationId_fkey" FOREIGN KEY ("projectMandateId", "projectId", "organizationId") REFERENCES "ProjectMandate"("id", "projectId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MandateServiceOperation" ADD CONSTRAINT "MandateServiceOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_replacementOfActivityId_projectId_organizationId_fkey" FOREIGN KEY ("replacementOfActivityId", "projectId", "organizationId") REFERENCES "ProjectActivity"("id", "projectId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
