-- CreateTable
CREATE TABLE "CustomProcedure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "code" TEXT NOT NULL,
    "titleFR" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "objective" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2C3E50',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "sourceText" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "rolesDetected" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomProcedure_organizationId_idx" ON "CustomProcedure"("organizationId");

-- CreateIndex
CREATE INDEX "CustomProcedure_projectId_idx" ON "CustomProcedure"("projectId");

-- AddForeignKey
ALTER TABLE "CustomProcedure" ADD CONSTRAINT "CustomProcedure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomProcedure" ADD CONSTRAINT "CustomProcedure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomProcedure" ADD CONSTRAINT "CustomProcedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
