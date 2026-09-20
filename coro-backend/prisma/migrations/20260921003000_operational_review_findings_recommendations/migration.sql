ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'FINDING_CREATED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'FINDING_UPDATED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'FINDING_STATUS_CHANGED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'FINDING_DELETED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'RECOMMENDATION_CREATED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'RECOMMENDATION_UPDATED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'RECOMMENDATION_DECIDED';
ALTER TYPE "OperationalReviewAuditEventType" ADD VALUE 'RECOMMENDATION_DELETED';
CREATE TYPE "ReviewFindingCategory" AS ENUM ('STRENGTH', 'GAP', 'OBSERVATION', 'NON_COMPLIANCE', 'RISK', 'IMPROVEMENT_OPPORTUNITY');
CREATE TYPE "ReviewFindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');
CREATE TYPE "ReviewFindingStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'MONITORED', 'CLOSED');
CREATE TYPE "ReviewRecommendationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ReviewRecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'DEFERRED');
CREATE UNIQUE INDEX "OperationalReview_id_organizationId_key" ON "OperationalReview"("id", "organizationId");
CREATE TABLE "ReviewFinding" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "operationalReviewId" TEXT NOT NULL,
 "category" "ReviewFindingCategory" NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
 "severity" "ReviewFindingSeverity" NOT NULL, "impact" TEXT, "status" "ReviewFindingStatus" NOT NULL DEFAULT 'OPEN', "displayOrder" INTEGER NOT NULL,
 "createdByType" "CoroActorType" NOT NULL, "createdById" TEXT NOT NULL,
 "acceptedAt" TIMESTAMP(3), "acceptedByType" "CoroActorType", "acceptedById" TEXT,
 "closedAt" TIMESTAMP(3), "closedByType" "CoroActorType", "closedById" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ReviewFinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewFinding_id_review_org_key" ON "ReviewFinding"("id", "operationalReviewId", "organizationId");
CREATE UNIQUE INDEX "ReviewFinding_review_order_key" ON "ReviewFinding"("operationalReviewId", "displayOrder");
CREATE INDEX "ReviewFinding_organizationId_idx" ON "ReviewFinding"("organizationId");
CREATE INDEX "ReviewFinding_review_status_idx" ON "ReviewFinding"("operationalReviewId", "status");
ALTER TABLE "ReviewFinding" ADD CONSTRAINT "ReviewFinding_review_fkey" FOREIGN KEY ("operationalReviewId", "organizationId") REFERENCES "OperationalReview"("id", "organizationId") ON DELETE RESTRICT;
CREATE TABLE "ReviewRecommendation" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "operationalReviewId" TEXT NOT NULL, "reviewFindingId" TEXT NOT NULL,
 "title" TEXT, "description" TEXT NOT NULL, "priority" "ReviewRecommendationPriority", "status" "ReviewRecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
 "rationale" TEXT, "displayOrder" INTEGER NOT NULL, "createdByType" "CoroActorType" NOT NULL, "createdById" TEXT NOT NULL,
 "decidedAt" TIMESTAMP(3), "decidedByType" "CoroActorType", "decidedById" TEXT, "decisionComment" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ReviewRecommendation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewRecommendation_review_order_key" ON "ReviewRecommendation"("operationalReviewId", "displayOrder");
CREATE INDEX "ReviewRecommendation_organizationId_idx" ON "ReviewRecommendation"("organizationId");
CREATE INDEX "ReviewRecommendation_finding_status_idx" ON "ReviewRecommendation"("reviewFindingId", "status");
ALTER TABLE "ReviewRecommendation" ADD CONSTRAINT "ReviewRecommendation_review_fkey" FOREIGN KEY ("operationalReviewId", "organizationId") REFERENCES "OperationalReview"("id", "organizationId") ON DELETE RESTRICT;
ALTER TABLE "ReviewRecommendation" ADD CONSTRAINT "ReviewRecommendation_finding_fkey" FOREIGN KEY ("reviewFindingId", "operationalReviewId", "organizationId") REFERENCES "ReviewFinding"("id", "operationalReviewId", "organizationId") ON DELETE RESTRICT;
CREATE FUNCTION protect_operational_review_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_review_id TEXT;
BEGIN
 parent_review_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."operationalReviewId" ELSE NEW."operationalReviewId" END;
 IF EXISTS (SELECT 1 FROM "OperationalReview" WHERE "id" = parent_review_id AND "status" = 'FINALIZED') THEN RAISE EXCEPTION 'FINALIZED OperationalReview children are immutable'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ReviewFinding_parent_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "ReviewFinding" FOR EACH ROW EXECUTE FUNCTION protect_operational_review_children();
CREATE TRIGGER "ReviewRecommendation_parent_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "ReviewRecommendation" FOR EACH ROW EXECUTE FUNCTION protect_operational_review_children();
