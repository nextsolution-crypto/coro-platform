ALTER TABLE "IncidentAuthorityAssignment"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "payloadHash" CHAR(64);

CREATE UNIQUE INDEX "IncidentAuthorityAssignment_organizationId_idempotencyKey_key"
  ON "IncidentAuthorityAssignment"("organizationId", "idempotencyKey");
