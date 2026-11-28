-- Équipe d'un client : conseillers rattachés (visibilité Restreinte).
CREATE TABLE "ClientTeamMember" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientTeamMember_clientId_userId_key" ON "ClientTeamMember"("clientId", "userId");
CREATE INDEX "ClientTeamMember_userId_organizationId_idx" ON "ClientTeamMember"("userId", "organizationId");
ALTER TABLE "ClientTeamMember" ADD CONSTRAINT "ClientTeamMember_clientId_organizationId_fkey"
  FOREIGN KEY ("clientId", "organizationId") REFERENCES "Client"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientTeamMember" ADD CONSTRAINT "ClientTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
