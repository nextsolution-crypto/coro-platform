-- CreateTable
CREATE TABLE "ProcedureDefault" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureOverride" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureDefault_code_key" ON "ProcedureDefault"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureOverride_procedureId_organizationId_key" ON "ProcedureOverride"("procedureId", "organizationId");

-- AddForeignKey
ALTER TABLE "ProcedureOverride" ADD CONSTRAINT "ProcedureOverride_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ProcedureDefault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureOverride" ADD CONSTRAINT "ProcedureOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
