-- Additive migration: existing document IDs, storage objects and citations are preserved.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "ProjectFile" f JOIN "Project" p ON p.id = f."projectId" JOIN "Building" b ON b.id = p."buildingId" WHERE f."organizationId" <> p."organizationId" OR f."organizationId" <> b."organizationId") THEN
  RAISE EXCEPTION 'BUILDING_DOCUMENT_TENANT_INCONSISTENCY';
 END IF;
END $$;
ALTER TABLE "ProjectFile" ADD COLUMN "buildingId" TEXT;
UPDATE "ProjectFile" f SET "buildingId" = p."buildingId" FROM "Project" p WHERE p.id = f."projectId";
ALTER TABLE "ProjectFile" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "ProjectFileLifecycleEvent" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "ProjectFileKnowledgeIngestion" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_documentary_owner_check" CHECK ("buildingId" IS NOT NULL OR "projectId" IS NOT NULL);
CREATE INDEX "ProjectFile_buildingId_lifecycleState_idx" ON "ProjectFile"("buildingId", "lifecycleState");
CREATE TABLE "BuildingDocumentGrant" (
 "id" TEXT NOT NULL PRIMARY KEY, "buildingId" TEXT NOT NULL, "clientUserId" TEXT NOT NULL,
 "organizationId" TEXT NOT NULL, "canUpload" BOOLEAN NOT NULL DEFAULT true,
 "grantedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "BuildingDocumentGrant_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "BuildingDocumentGrant_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BuildingDocumentGrant_buildingId_clientUserId_key" ON "BuildingDocumentGrant"("buildingId", "clientUserId");
CREATE INDEX "BuildingDocumentGrant_organizationId_buildingId_idx" ON "BuildingDocumentGrant"("organizationId", "buildingId");
