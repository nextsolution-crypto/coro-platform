ALTER TABLE "DisplayDevice"
  ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3),
  ADD COLUMN "lastDeclaredMode" TEXT,
  ADD COLUMN "lastCacheHealth" TEXT,
  ADD COLUMN "lastRuntimeHealth" TEXT,
  ADD COLUMN "lastNetworkStatus" TEXT,
  ADD COLUMN "lastHeartbeatErrors" JSONB;

CREATE INDEX "DisplayDevice_heartbeat_idx"
  ON "DisplayDevice"("organizationId", "buildingId", "lastHeartbeatAt");
