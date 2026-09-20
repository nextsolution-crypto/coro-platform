CREATE TYPE "OperationalReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'FINALIZED');
CREATE TYPE "OperationalReviewConfidentiality" AS ENUM ('RESTRICTED', 'BUILDING_TEAM', 'ORGANIZATION', 'ADVISOR');
CREATE TYPE "OperationalReviewAuditEventType" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'FINALIZED');
CREATE TYPE "OperationalReviewPermission" AS ENUM ('REX_CREATE', 'REX_EDIT', 'REX_REVIEW', 'REX_FINALIZE');
ALTER TABLE "ClientUser" ADD COLUMN "operationalReviewPermissions" "OperationalReviewPermission"[] NOT NULL DEFAULT ARRAY[]::"OperationalReviewPermission"[];
CREATE SEQUENCE "operational_review_reference_seq";
CREATE FUNCTION operational_review_reference() RETURNS text LANGUAGE sql AS $$ SELECT 'REX-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-' || LPAD(nextval('operational_review_reference_seq')::text, 6, '0') $$;
CREATE TABLE "OperationalReview" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "reference" TEXT NOT NULL DEFAULT operational_review_reference(), "version" INTEGER NOT NULL DEFAULT 1,
 "status" "OperationalReviewStatus" NOT NULL DEFAULT 'DRAFT', "confidentiality" "OperationalReviewConfidentiality" NOT NULL DEFAULT 'RESTRICTED',
 "title" TEXT NOT NULL, "summary" TEXT, "buildingId" TEXT, "projectId" TEXT, "populationOperationalEventId" TEXT, "populationEvidenceRecordId" TEXT,
 "incidentEventId" TEXT, "exerciseReportId" TEXT, "createdByType" "CoroActorType" NOT NULL, "createdById" TEXT NOT NULL,
 "submittedAt" TIMESTAMP(3), "submittedByType" "CoroActorType", "submittedById" TEXT, "finalizedAt" TIMESTAMP(3), "finalizedByType" "CoroActorType", "finalizedById" TEXT,
 "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "OperationalReview_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "OperationalReview_exactly_one_source" CHECK (num_nonnulls("populationOperationalEventId", "incidentEventId", "exerciseReportId") = 1),
 CONSTRAINT "OperationalReview_evidence_requires_population" CHECK ("populationEvidenceRecordId" IS NULL OR "populationOperationalEventId" IS NOT NULL)
);
CREATE UNIQUE INDEX "OperationalReview_reference_key" ON "OperationalReview"("reference");
CREATE UNIQUE INDEX "OperationalReview_supersedesId_key" ON "OperationalReview"("supersedesId");
CREATE UNIQUE INDEX "OperationalReview_population_v1_key" ON "OperationalReview"("populationOperationalEventId", "version") WHERE "populationOperationalEventId" IS NOT NULL AND "supersedesId" IS NULL;
CREATE UNIQUE INDEX "OperationalReview_incident_v1_key" ON "OperationalReview"("incidentEventId", "version") WHERE "incidentEventId" IS NOT NULL AND "supersedesId" IS NULL;
CREATE UNIQUE INDEX "OperationalReview_exercise_v1_key" ON "OperationalReview"("exerciseReportId", "version") WHERE "exerciseReportId" IS NOT NULL AND "supersedesId" IS NULL;
CREATE INDEX "OperationalReview_organizationId_idx" ON "OperationalReview"("organizationId"); CREATE INDEX "OperationalReview_buildingId_idx" ON "OperationalReview"("buildingId"); CREATE INDEX "OperationalReview_status_idx" ON "OperationalReview"("status");
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_building_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_project_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_population_event_fkey" FOREIGN KEY ("populationOperationalEventId") REFERENCES "PopulationOperationalEvent"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_population_evidence_fkey" FOREIGN KEY ("populationEvidenceRecordId") REFERENCES "PopulationEvidenceRecord"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_incident_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_exercise_fkey" FOREIGN KEY ("exerciseReportId") REFERENCES "ExerciseReport"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReview" ADD CONSTRAINT "OperationalReview_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "OperationalReview"("id") ON DELETE RESTRICT;
CREATE TABLE "OperationalReviewAuditEvent" ("id" TEXT NOT NULL, "reviewId" TEXT NOT NULL, "type" "OperationalReviewAuditEventType" NOT NULL, "actorType" "CoroActorType" NOT NULL, "actorId" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OperationalReviewAuditEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX "OperationalReviewAuditEvent_reviewId_createdAt_idx" ON "OperationalReviewAuditEvent"("reviewId", "createdAt");
ALTER TABLE "OperationalReviewAuditEvent" ADD CONSTRAINT "OperationalReviewAuditEvent_review_fkey" FOREIGN KEY ("reviewId") REFERENCES "OperationalReview"("id") ON DELETE RESTRICT;
CREATE FUNCTION validate_operational_review_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."buildingId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Building" WHERE "id" = NEW."buildingId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'OperationalReview building tenant mismatch'; END IF;
 IF NEW."projectId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Project" WHERE "id" = NEW."projectId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'OperationalReview project tenant mismatch'; END IF;
 IF NEW."populationOperationalEventId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "PopulationOperationalEvent" WHERE "id" = NEW."populationOperationalEventId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'OperationalReview Population tenant mismatch'; END IF;
 IF NEW."incidentEventId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "IncidentEvent" WHERE "id" = NEW."incidentEventId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'OperationalReview incident tenant mismatch'; END IF;
 IF NEW."exerciseReportId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ExerciseReport" WHERE "id" = NEW."exerciseReportId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'OperationalReview exercise tenant mismatch'; END IF;
 IF NEW."populationEvidenceRecordId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "PopulationEvidenceRecord" WHERE "id" = NEW."populationEvidenceRecordId" AND "organizationId" = NEW."organizationId" AND "operationalEventId" = NEW."populationOperationalEventId" AND "status" = 'FINALIZED') THEN RAISE EXCEPTION 'OperationalReview Evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "OperationalReview_scope_guard" BEFORE INSERT OR UPDATE ON "OperationalReview" FOR EACH ROW EXECUTE FUNCTION validate_operational_review_scope();
CREATE FUNCTION protect_finalized_operational_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."status" = 'FINALIZED' THEN RAISE EXCEPTION 'FINALIZED OperationalReview is immutable'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "OperationalReview_finalized_immutable" BEFORE UPDATE OR DELETE ON "OperationalReview" FOR EACH ROW EXECUTE FUNCTION protect_finalized_operational_review();
CREATE FUNCTION protect_operational_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'OperationalReviewAuditEvent is append-only'; END $$;
CREATE TRIGGER "OperationalReviewAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "OperationalReviewAuditEvent" FOR EACH ROW EXECUTE FUNCTION protect_operational_review_audit();
