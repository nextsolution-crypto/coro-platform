-- Versions de procédures enregistrées par les conseillers (25 nov. 2026).
-- Nouvelle table seulement : aucune donnée existante n'est modifiée.

CREATE TABLE "ProcedureVariant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sharedWithOrganization" BOOLEAN NOT NULL DEFAULT false,
    "sourceProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureVariant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcedureVariant_organizationId_procedureId_idx" ON "ProcedureVariant"("organizationId", "procedureId");
CREATE INDEX "ProcedureVariant_ownerId_idx" ON "ProcedureVariant"("ownerId");

ALTER TABLE "ProcedureVariant" ADD CONSTRAINT "ProcedureVariant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcedureVariant" ADD CONSTRAINT "ProcedureVariant_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ProcedureDefault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
