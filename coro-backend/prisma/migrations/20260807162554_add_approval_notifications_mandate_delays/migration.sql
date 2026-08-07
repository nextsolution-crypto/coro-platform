-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectMandate" ADD COLUMN     "alerteActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dateDebutDelai" TIMESTAMP(3),
ADD COLUMN     "dateLimite" TIMESTAMP(3),
ADD COLUMN     "delaiJours" INTEGER,
ADD COLUMN     "typeDelai" TEXT,
ADD COLUMN     "typeMandat" TEXT;

-- CreateTable
CREATE TABLE "ReviewObservation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "module" TEXT,
    "texte" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'OUVERTE',
    "createdById" TEXT NOT NULL,
    "treatedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "projectId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewObservation" ADD CONSTRAINT "ReviewObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewObservation" ADD CONSTRAINT "ReviewObservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewObservation" ADD CONSTRAINT "ReviewObservation_treatedById_fkey" FOREIGN KEY ("treatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
