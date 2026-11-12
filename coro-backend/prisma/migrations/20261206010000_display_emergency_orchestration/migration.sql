CREATE TYPE "DisplayOperationalEventSource" AS ENUM ('MANUAL', 'CORO_OPS', 'CORO_INCIDENT', 'SIMULATOR', 'BUILDING_BRIDGE_FUTURE');
CREATE TYPE "DisplayOperationalEventSeverity" AS ENUM ('INFORMATION', 'MINOR', 'MAJOR', 'CRITICAL');
CREATE TYPE "DisplayOperationalEventStatus" AS ENUM ('RECEIVED', 'AUTHORIZED', 'COMMAND_CREATED', 'REJECTED', 'CLOSED');
CREATE TYPE "DisplayOperationalCommandType" AS ENUM ('ENTER_EMERGENCY', 'ENTER_EXERCISE', 'MAINTAIN_EMERGENCY', 'UPDATE_EMERGENCY_CONTEXT', 'REQUEST_CLEAR', 'APPROVE_CLEAR', 'CANCEL_EXERCISE', 'RESTORE_NORMAL');
CREATE TYPE "DisplayOperationalPriority" AS ENUM ('NORMAL_CYCLE', 'PERMANENT_PLAN', 'EMERGENCY_EXERCISE', 'EMERGENCY_REAL');
CREATE TYPE "DisplayOperationalCommandStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'QUEUED', 'PARTIALLY_CONFIRMED', 'APPLIED', 'REJECTED', 'FAILED', 'STALE', 'SUPERSEDED', 'CLOSED');
CREATE TYPE "DisplayCommandDeliveryStatus" AS ENUM ('QUEUED', 'DELIVERED', 'RECEIVED', 'APPLIED', 'REJECTED', 'FAILED', 'STALE', 'SUPERSEDED');
CREATE TYPE "DisplayCommandOutboxStatus" AS ENUM ('PENDING', 'CLAIMED', 'DISPATCHED', 'FAILED');
CREATE TYPE "DisplayOperationalEscalationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "DisplayOperationalEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "zoneIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "incidentEventId" TEXT, "protocolId" TEXT,
  "eventType" TEXT NOT NULL, "severity" "DisplayOperationalEventSeverity" NOT NULL,
  "source" "DisplayOperationalEventSource" NOT NULL, "exercise" BOOLEAN NOT NULL DEFAULT false,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1, "payload" JSONB NOT NULL, "actorUserId" TEXT NOT NULL,
  "authorization" JSONB NOT NULL, "correlationId" TEXT NOT NULL, "causationId" TEXT,
  "idempotencyKey" TEXT NOT NULL, "status" "DisplayOperationalEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DisplayOperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisplayOperationalCommand" (
  "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "incidentEventId" TEXT, "type" "DisplayOperationalCommandType" NOT NULL,
  "priority" "DisplayOperationalPriority" NOT NULL, "targetScope" JSONB NOT NULL,
  "authorization" JSONB NOT NULL, "source" "DisplayOperationalEventSource" NOT NULL,
  "correlationId" TEXT NOT NULL, "causationId" TEXT, "idempotencyKey" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL, "sequence" BIGINT NOT NULL, "signedPayload" JSONB NOT NULL,
  "signingKeyId" TEXT NOT NULL, "signature" TEXT NOT NULL,
  "status" "DisplayOperationalCommandStatus" NOT NULL DEFAULT 'CREATED', "requestedClearById" TEXT,
  "authorizedById" TEXT NOT NULL, "authorizedAt" TIMESTAMP(3) NOT NULL, "closedAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DisplayOperationalCommand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisplayCommandDelivery" (
  "id" TEXT NOT NULL, "commandId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL, "status" "DisplayCommandDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0, "deliveredAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "errorCode" TEXT, "declaredState" JSONB,
  "physicalObservation" JSONB, "ackRequestId" TEXT, "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayCommandDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisplayCommandOutbox" (
  "id" TEXT NOT NULL, "commandId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "status" "DisplayCommandOutboxStatus" NOT NULL DEFAULT 'PENDING', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "claimedAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DisplayCommandOutbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisplayOperationalEscalation" (
  "id" TEXT NOT NULL, "deliveryId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL, "incidentEventId" TEXT, "code" TEXT NOT NULL,
  "severity" "DisplayOperationalEventSeverity" NOT NULL, "status" "DisplayOperationalEscalationStatus" NOT NULL DEFAULT 'OPEN',
  "responsibleUserId" TEXT, "dueAt" TIMESTAMP(3), "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "DisplayOperationalEscalation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisplayOperationalEvent_organizationId_idempotencyKey_key" ON "DisplayOperationalEvent"("organizationId", "idempotencyKey");
CREATE INDEX "DisplayOperationalEvent_organizationId_buildingId_status_createdAt_idx" ON "DisplayOperationalEvent"("organizationId", "buildingId", "status", "createdAt");
CREATE INDEX "DisplayOperationalEvent_incidentEventId_idx" ON "DisplayOperationalEvent"("incidentEventId");
CREATE UNIQUE INDEX "DisplayOperationalCommand_organizationId_idempotencyKey_key" ON "DisplayOperationalCommand"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "DisplayOperationalCommand_organizationId_buildingId_sequence_key" ON "DisplayOperationalCommand"("organizationId", "buildingId", "sequence");
CREATE INDEX "DisplayOperationalCommand_organizationId_buildingId_status_priority_idx" ON "DisplayOperationalCommand"("organizationId", "buildingId", "status", "priority");
CREATE INDEX "DisplayOperationalCommand_incidentEventId_idx" ON "DisplayOperationalCommand"("incidentEventId");
CREATE UNIQUE INDEX "DisplayCommandDelivery_commandId_deviceId_key" ON "DisplayCommandDelivery"("commandId", "deviceId");
CREATE UNIQUE INDEX "DisplayCommandDelivery_deviceId_ackRequestId_key" ON "DisplayCommandDelivery"("deviceId", "ackRequestId");
CREATE INDEX "DisplayCommandDelivery_organizationId_buildingId_deviceId_status_idx" ON "DisplayCommandDelivery"("organizationId", "buildingId", "deviceId", "status");
CREATE UNIQUE INDEX "DisplayCommandOutbox_commandId_key" ON "DisplayCommandOutbox"("commandId");
CREATE INDEX "DisplayCommandOutbox_status_availableAt_idx" ON "DisplayCommandOutbox"("status", "availableAt");
CREATE UNIQUE INDEX "DisplayOperationalEscalation_deliveryId_code_key" ON "DisplayOperationalEscalation"("deliveryId", "code");
CREATE INDEX "DisplayOperationalEscalation_organizationId_buildingId_status_createdAt_idx" ON "DisplayOperationalEscalation"("organizationId", "buildingId", "status", "createdAt");

ALTER TABLE "DisplayOperationalEvent" ADD CONSTRAINT "DisplayOperationalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEvent" ADD CONSTRAINT "DisplayOperationalEvent_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEvent" ADD CONSTRAINT "DisplayOperationalEvent_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEvent" ADD CONSTRAINT "DisplayOperationalEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalCommand" ADD CONSTRAINT "DisplayOperationalCommand_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DisplayOperationalEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalCommand" ADD CONSTRAINT "DisplayOperationalCommand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalCommand" ADD CONSTRAINT "DisplayOperationalCommand_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalCommand" ADD CONSTRAINT "DisplayOperationalCommand_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalCommand" ADD CONSTRAINT "DisplayOperationalCommand_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCommandDelivery" ADD CONSTRAINT "DisplayCommandDelivery_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DisplayOperationalCommand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCommandDelivery" ADD CONSTRAINT "DisplayCommandDelivery_deviceId_organizationId_buildingId_fkey" FOREIGN KEY ("deviceId", "organizationId", "buildingId") REFERENCES "DisplayDevice"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCommandOutbox" ADD CONSTRAINT "DisplayCommandOutbox_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DisplayOperationalCommand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEscalation" ADD CONSTRAINT "DisplayOperationalEscalation_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "DisplayCommandDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEscalation" ADD CONSTRAINT "DisplayOperationalEscalation_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayOperationalEscalation" ADD CONSTRAINT "DisplayOperationalEscalation_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "display_operational_event_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'DisplayOperationalEvent is append-only';
END $$;
CREATE TRIGGER "DisplayOperationalEvent_append_only_update" BEFORE UPDATE ON "DisplayOperationalEvent" FOR EACH ROW EXECUTE FUNCTION "display_operational_event_append_only"();
CREATE TRIGGER "DisplayOperationalEvent_append_only_delete" BEFORE DELETE ON "DisplayOperationalEvent" FOR EACH ROW EXECUTE FUNCTION "display_operational_event_append_only"();

CREATE FUNCTION "display_command_scope_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_event "DisplayOperationalEvent"%ROWTYPE;
BEGIN
  SELECT * INTO source_event FROM "DisplayOperationalEvent" WHERE "id" = NEW."eventId";
  IF NOT FOUND OR source_event."organizationId" <> NEW."organizationId" OR source_event."buildingId" <> NEW."buildingId" OR source_event."incidentEventId" IS DISTINCT FROM NEW."incidentEventId" THEN
    RAISE EXCEPTION 'Display command scope does not match its source event';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    OLD."eventId" IS DISTINCT FROM NEW."eventId" OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId" OR
    OLD."buildingId" IS DISTINCT FROM NEW."buildingId" OR OLD."incidentEventId" IS DISTINCT FROM NEW."incidentEventId" OR
    OLD."type" IS DISTINCT FROM NEW."type" OR OLD."priority" IS DISTINCT FROM NEW."priority" OR
    OLD."targetScope" IS DISTINCT FROM NEW."targetScope" OR OLD."authorization" IS DISTINCT FROM NEW."authorization" OR
    OLD."sequence" IS DISTINCT FROM NEW."sequence" OR OLD."signedPayload" IS DISTINCT FROM NEW."signedPayload" OR
    OLD."signingKeyId" IS DISTINCT FROM NEW."signingKeyId" OR OLD."signature" IS DISTINCT FROM NEW."signature"
  ) THEN RAISE EXCEPTION 'Display command authorized identity is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisplayOperationalCommand_scope_guard" BEFORE INSERT OR UPDATE ON "DisplayOperationalCommand" FOR EACH ROW EXECUTE FUNCTION "display_command_scope_guard"();

CREATE FUNCTION "display_delivery_scope_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DisplayOperationalCommand" c WHERE c."id" = NEW."commandId" AND c."organizationId" = NEW."organizationId" AND c."buildingId" = NEW."buildingId") THEN
    RAISE EXCEPTION 'Display delivery command scope mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "DisplayDevice" d WHERE d."id" = NEW."deviceId" AND d."organizationId" = NEW."organizationId" AND d."buildingId" = NEW."buildingId") THEN
    RAISE EXCEPTION 'Display delivery device scope mismatch';
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD."commandId" IS DISTINCT FROM NEW."commandId" OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId" OR OLD."buildingId" IS DISTINCT FROM NEW."buildingId" OR OLD."deviceId" IS DISTINCT FROM NEW."deviceId") THEN
    RAISE EXCEPTION 'Display delivery identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisplayCommandDelivery_scope_guard" BEFORE INSERT OR UPDATE ON "DisplayCommandDelivery" FOR EACH ROW EXECUTE FUNCTION "display_delivery_scope_guard"();

CREATE FUNCTION "display_outbox_scope_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DisplayOperationalCommand" c WHERE c."id" = NEW."commandId" AND c."organizationId" = NEW."organizationId" AND c."buildingId" = NEW."buildingId") THEN
    RAISE EXCEPTION 'Display outbox command scope mismatch';
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD."commandId" IS DISTINCT FROM NEW."commandId" OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId" OR OLD."buildingId" IS DISTINCT FROM NEW."buildingId") THEN
    RAISE EXCEPTION 'Display outbox identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisplayCommandOutbox_scope_guard" BEFORE INSERT OR UPDATE ON "DisplayCommandOutbox" FOR EACH ROW EXECUTE FUNCTION "display_outbox_scope_guard"();

CREATE FUNCTION "display_escalation_scope_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DisplayCommandDelivery" d JOIN "DisplayOperationalCommand" c ON c."id" = d."commandId" WHERE d."id" = NEW."deliveryId" AND d."organizationId" = NEW."organizationId" AND d."buildingId" = NEW."buildingId" AND d."deviceId" = NEW."deviceId" AND c."incidentEventId" IS NOT DISTINCT FROM NEW."incidentEventId") THEN
    RAISE EXCEPTION 'Display escalation scope mismatch';
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD."deliveryId" IS DISTINCT FROM NEW."deliveryId" OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId" OR OLD."buildingId" IS DISTINCT FROM NEW."buildingId" OR OLD."deviceId" IS DISTINCT FROM NEW."deviceId" OR OLD."incidentEventId" IS DISTINCT FROM NEW."incidentEventId" OR OLD."code" IS DISTINCT FROM NEW."code") THEN
    RAISE EXCEPTION 'Display escalation identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisplayOperationalEscalation_scope_guard" BEFORE INSERT OR UPDATE ON "DisplayOperationalEscalation" FOR EACH ROW EXECUTE FUNCTION "display_escalation_scope_guard"();
