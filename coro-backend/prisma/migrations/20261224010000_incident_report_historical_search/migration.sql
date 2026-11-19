ALTER TABLE "IncidentReportHistoricalRecord" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';
CREATE INDEX "IncidentReportHistoricalRecord_organizationId_buildingId_searchText_idx" ON "IncidentReportHistoricalRecord"("organizationId", "buildingId", "searchText");

