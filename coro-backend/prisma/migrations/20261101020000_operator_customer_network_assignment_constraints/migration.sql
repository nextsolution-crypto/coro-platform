ALTER TABLE "CustomerPortfolioAssignment"
  ADD COLUMN "operatorUserId" TEXT;

ALTER TABLE "CustomerPortfolioAssignment"
  DROP CONSTRAINT "CustomerPortfolioAssignment_subject_check";

ALTER TABLE "CustomerPortfolioAssignment"
  ADD CONSTRAINT "CustomerPortfolioAssignment_subject_check" CHECK (
    ("subjectType" = 'INTERNAL_USER' AND "userId" IS NOT NULL AND "clientUserId" IS NULL AND "operatorUserId" IS NULL) OR
    ("subjectType" = 'CLIENT_USER' AND "clientUserId" IS NOT NULL AND "userId" IS NULL AND "operatorUserId" IS NULL) OR
    ("subjectType" = 'OPERATOR_USER' AND "operatorUserId" IS NOT NULL AND "userId" IS NULL AND "clientUserId" IS NULL)
  );

ALTER TABLE "CustomerPortfolioAssignment"
  ADD CONSTRAINT "CustomerPortfolioAssignment_operatorUserId_fkey"
  FOREIGN KEY ("operatorUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CustomerPortfolioAssignment_operatorUserId_status_idx"
  ON "CustomerPortfolioAssignment"("operatorUserId", "status");

CREATE UNIQUE INDEX "CustomerPortfolioAssignment_active_operator_scope_idx"
  ON "CustomerPortfolioAssignment"(
    "organizationId",
    "operatorUserId",
    "scope",
    COALESCE("portfolioId", ''),
    COALESCE("regionId", ''),
    COALESCE("buildingId", '')
  )
  WHERE "subjectType" = 'OPERATOR_USER' AND "status" = 'ACTIVE';
