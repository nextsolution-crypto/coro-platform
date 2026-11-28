-- Objectif annuel de valeur produite (équipe ou conseiller), pour le suivi mensuel du rendement.
CREATE TABLE "RendementObjective" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "userId" TEXT,
  "valueTarget" DECIMAL(20,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RendementObjective_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RendementObjective_year_check" CHECK ("year" BETWEEN 2000 AND 2100),
  CONSTRAINT "RendementObjective_valueTarget_check" CHECK ("valueTarget" >= 0)
);
CREATE INDEX "RendementObjective_organizationId_year_idx" ON "RendementObjective"("organizationId", "year");
CREATE UNIQUE INDEX "RendementObjective_team_key" ON "RendementObjective"("organizationId", "year") WHERE "userId" IS NULL;
CREATE UNIQUE INDEX "RendementObjective_advisor_key" ON "RendementObjective"("organizationId", "year", "userId") WHERE "userId" IS NOT NULL;
ALTER TABLE "RendementObjective" ADD CONSTRAINT "RendementObjective_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
