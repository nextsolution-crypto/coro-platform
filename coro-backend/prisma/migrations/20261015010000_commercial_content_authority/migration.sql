CREATE TYPE "CommercialContentIntent" AS ENUM ('INCLUDED', 'OPTIONAL', 'AUTONOMOUS', 'TECHNICAL_DEPENDENCY', 'NOT_INCLUDED', 'FUTURE');
CREATE TYPE "CommercialContentDeliveryMaturity" AS ENUM ('AVAILABLE', 'LIMITED', 'FUTURE', 'UNVERIFIED');
CREATE TYPE "CommercialContentVersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "CommercialContentTargetType" AS ENUM ('FAMILY', 'CAPABILITY', 'COMPONENT', 'FUNCTIONAL_FEATURE');

CREATE TABLE "CommercialContent" ("id" TEXT NOT NULL, "code" VARCHAR(100) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CommercialContent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CommercialContentVersion" ("id" TEXT NOT NULL, "commercialContentId" TEXT NOT NULL, "versionNumber" INTEGER NOT NULL, "status" "CommercialContentVersionStatus" NOT NULL DEFAULT 'DRAFT', "titleFR" TEXT NOT NULL, "titleEN" TEXT, "descriptionFR" TEXT NOT NULL, "descriptionEN" TEXT, "provenance" VARCHAR(100) NOT NULL, "contentHash" CHAR(64) NOT NULL, "lifecycleReason" TEXT, "lockVersion" INTEGER NOT NULL DEFAULT 0, "createdByUserId" TEXT, "submittedByUserId" TEXT, "approvedByUserId" TEXT, "archivedByUserId" TEXT, "submittedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CommercialContentVersion_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CommercialContentBinding" ("id" TEXT NOT NULL, "commercialContentVersionId" TEXT NOT NULL, "targetType" "CommercialContentTargetType" NOT NULL, "targetCode" VARCHAR(120) NOT NULL, "labelFR" TEXT NOT NULL, "labelEN" TEXT, "commercialIntent" "CommercialContentIntent" NOT NULL, "deliveryMaturity" "CommercialContentDeliveryMaturity" NOT NULL, "evidence" TEXT, "displayOrder" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CommercialContentBinding_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "CommercialContent_code_key" ON "CommercialContent"("code");
CREATE UNIQUE INDEX "CommercialContentVersion_commercialContentId_versionNumber_key" ON "CommercialContentVersion"("commercialContentId", "versionNumber");
CREATE INDEX "CommercialContentVersion_status_createdAt_idx" ON "CommercialContentVersion"("status", "createdAt");
CREATE INDEX "CommercialContentVersion_commercialContentId_status_idx" ON "CommercialContentVersion"("commercialContentId", "status");
CREATE UNIQUE INDEX "CommercialContentVersion_one_open_version_key" ON "CommercialContentVersion"("commercialContentId") WHERE "status" IN ('DRAFT', 'IN_REVIEW');
CREATE UNIQUE INDEX "CommercialContentBinding_commercialContentVersionId_targetT_key" ON "CommercialContentBinding"("commercialContentVersionId", "targetType", "targetCode");
CREATE INDEX "CommercialContentBinding_targetType_targetCode_idx" ON "CommercialContentBinding"("targetType", "targetCode");
CREATE INDEX "CommercialContentBinding_commercialContentVersionId_display_idx" ON "CommercialContentBinding"("commercialContentVersionId", "displayOrder");

ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_commercialContentId_fkey" FOREIGN KEY ("commercialContentId") REFERENCES "CommercialContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialContentBinding" ADD CONSTRAINT "CommercialContentBinding_commercialContentVersionId_fkey" FOREIGN KEY ("commercialContentVersionId") REFERENCES "CommercialContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_lifecycle_check" CHECK (("status"='DRAFT' AND "submittedAt" IS NULL AND "approvedAt" IS NULL AND "archivedAt" IS NULL) OR ("status"='IN_REVIEW' AND "submittedAt" IS NOT NULL AND "submittedByUserId" IS NOT NULL AND "approvedAt" IS NULL AND "archivedAt" IS NULL) OR ("status"='APPROVED' AND "submittedAt" IS NOT NULL AND "submittedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "archivedAt" IS NULL) OR ("status"='ARCHIVED' AND "approvedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "archivedAt" IS NOT NULL AND "archivedByUserId" IS NOT NULL));
ALTER TABLE "CommercialContentVersion" ADD CONSTRAINT "CommercialContentVersion_values_check" CHECK ("versionNumber">0 AND "lockVersion">=0 AND LENGTH(BTRIM("titleFR"))>0 AND LENGTH(BTRIM("descriptionFR"))>0 AND LENGTH(BTRIM("provenance"))>0);
ALTER TABLE "CommercialContentBinding" ADD CONSTRAINT "CommercialContentBinding_values_check" CHECK ("displayOrder">=0 AND LENGTH(BTRIM("targetCode"))>0 AND LENGTH(BTRIM("labelFR"))>0 AND NOT ("commercialIntent"='FUTURE' AND "deliveryMaturity"<>'FUTURE'));

CREATE FUNCTION protect_commercial_content_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Commercial content versions are retained'; END IF;
  IF OLD."status" IN ('APPROVED','ARCHIVED') THEN
    IF OLD."status"='APPROVED' AND NEW."status"='ARCHIVED' AND (NEW."commercialContentId",NEW."versionNumber",NEW."titleFR",NEW."titleEN",NEW."descriptionFR",NEW."descriptionEN",NEW."provenance",NEW."contentHash",NEW."createdByUserId",NEW."submittedByUserId",NEW."approvedByUserId",NEW."submittedAt",NEW."approvedAt",NEW."createdAt") IS NOT DISTINCT FROM (OLD."commercialContentId",OLD."versionNumber",OLD."titleFR",OLD."titleEN",OLD."descriptionFR",OLD."descriptionEN",OLD."provenance",OLD."contentHash",OLD."createdByUserId",OLD."submittedByUserId",OLD."approvedByUserId",OLD."submittedAt",OLD."approvedAt",OLD."createdAt") THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Approved commercial content is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_content_version_protect BEFORE UPDATE OR DELETE ON "CommercialContentVersion" FOR EACH ROW EXECUTE FUNCTION protect_commercial_content_version();

CREATE FUNCTION protect_commercial_content_binding() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE version_id TEXT; version_status "CommercialContentVersionStatus"; BEGIN
  version_id:=CASE WHEN TG_OP='DELETE' THEN OLD."commercialContentVersionId" ELSE NEW."commercialContentVersionId" END;
  SELECT "status" INTO version_status FROM "CommercialContentVersion" WHERE "id"=version_id;
  IF version_status IN ('APPROVED','ARCHIVED') THEN RAISE EXCEPTION 'Approved commercial content bindings are immutable'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER commercial_content_binding_protect BEFORE INSERT OR UPDATE OR DELETE ON "CommercialContentBinding" FOR EACH ROW EXECUTE FUNCTION protect_commercial_content_binding();
