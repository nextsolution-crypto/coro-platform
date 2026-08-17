-- CreateTable
CREATE TABLE "OrganizationModule1Template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationModule1Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModule1Template_organizationId_key" ON "OrganizationModule1Template"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationModule1Template" ADD CONSTRAINT "OrganizationModule1Template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
