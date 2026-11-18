-- CLIENT-01B: tenant-scoped, FK-verifiable actor provenance.
-- Additive expand-and-contract migration; historical actor columns and values
-- are preserved verbatim.

CREATE TABLE "CoroActorIdentity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorType" "CoroActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "userId" TEXT,
  "clientUserId" TEXT,
  "systemActorKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoroActorIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CoroActorIdentity_exact_identity_check" CHECK (
    ("actorType" = 'USER' AND "userId" = "actorId" AND "clientUserId" IS NULL AND "systemActorKey" IS NULL)
    OR
    ("actorType" = 'CLIENT_USER' AND "clientUserId" = "actorId" AND "userId" IS NULL AND "systemActorKey" IS NULL)
    OR
    ("actorType" = 'SYSTEM' AND "systemActorKey" = "actorId" AND "userId" IS NULL AND "clientUserId" IS NULL)
  ),
  CONSTRAINT "CoroActorIdentity_user_fkey" FOREIGN KEY ("userId", "organizationId")
    REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CoroActorIdentity_client_user_fkey" FOREIGN KEY ("clientUserId", "organizationId")
    REFERENCES "ClientUser"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CoroActorIdentity_organizationId_actorType_actorId_key"
  ON "CoroActorIdentity"("organizationId", "actorType", "actorId");
CREATE INDEX "CoroActorIdentity_organizationId_userId_idx"
  ON "CoroActorIdentity"("organizationId", "userId");
CREATE INDEX "CoroActorIdentity_organizationId_clientUserId_idx"
  ON "CoroActorIdentity"("organizationId", "clientUserId");

INSERT INTO "CoroActorIdentity" ("id", "organizationId", "actorType", "actorId", "userId")
SELECT gen_random_uuid()::text, "organizationId", 'USER'::"CoroActorType", "id", "id"
FROM "User";

INSERT INTO "CoroActorIdentity" ("id", "organizationId", "actorType", "actorId", "clientUserId")
SELECT gen_random_uuid()::text, "organizationId", 'CLIENT_USER'::"CoroActorType", "id", "id"
FROM "ClientUser";

-- Historical automation remains explicitly SYSTEM and cannot authenticate.
INSERT INTO "CoroActorIdentity" ("id", "organizationId", "actorType", "actorId", "systemActorKey")
SELECT gen_random_uuid()::text, "organizationId", 'SYSTEM'::"CoroActorType", "actorId", "actorId"
FROM (
  SELECT "organizationId", "createdByActorId" AS "actorId" FROM "IncidentReportTemplateVersion" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "createdByActorId" FROM "IncidentReportRetentionPolicy" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "createdByActorId" FROM "IncidentReport" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "createdByActorId" FROM "IncidentReportVersion" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "createdByActorId" FROM "IncidentReportAttachment" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "actorId" FROM "IncidentReportApproval" WHERE "actorType" = 'SYSTEM'
  UNION SELECT "organizationId", "createdByActorId" FROM "IncidentReportExport" WHERE "createdByActorType" = 'SYSTEM'
  UNION SELECT "organizationId", "actorId" FROM "IncidentReportAuditEvent" WHERE "actorType" = 'SYSTEM'
) historical_system_actors
WHERE "actorId" IS NOT NULL
ON CONFLICT ("organizationId", "actorType", "actorId") DO NOTHING;

ALTER TABLE "IncidentReport"
  ADD COLUMN "reviewerActorType" "CoroActorType",
  ADD COLUMN "reviewerActorId" TEXT,
  ADD COLUMN "publishedByActorType" "CoroActorType",
  ADD COLUMN "publishedByActorId" TEXT;
ALTER TABLE "IncidentReportAttachment"
  ADD COLUMN "revokedByActorType" "CoroActorType";

UPDATE "IncidentReport"
SET "reviewerActorType" = 'USER', "reviewerActorId" = "reviewerUserId"
WHERE "reviewerUserId" IS NOT NULL;
UPDATE "IncidentReportAttachment"
SET "revokedByActorType" = 'USER'
WHERE "revokedByActorId" IS NOT NULL;

ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reviewer_actor_pair_check"
  CHECK (("reviewerActorType" IS NULL) = ("reviewerActorId" IS NULL));
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_publisher_actor_pair_check"
  CHECK (("publishedByActorType" IS NULL) = ("publishedByActorId" IS NULL));
ALTER TABLE "IncidentReportAttachment" ADD CONSTRAINT "IncidentReportAttachment_revoker_actor_pair_check"
  CHECK (("revokedByActorType" IS NULL) = ("revokedByActorId" IS NULL));

-- Existing typed provenance becomes FK-verifiable without rewriting it.
ALTER TABLE "IncidentReportTemplateVersion" ADD CONSTRAINT "IncidentReportTemplateVersion_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportRetentionPolicy" ADD CONSTRAINT "IncidentReportRetentionPolicy_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_submitter_actor_fkey"
  FOREIGN KEY ("organizationId", "submittedByActorType", "submittedByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reviewer_actor_fkey"
  FOREIGN KEY ("organizationId", "reviewerActorType", "reviewerActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_publisher_actor_fkey"
  FOREIGN KEY ("organizationId", "publishedByActorType", "publishedByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportVersion" ADD CONSTRAINT "IncidentReportVersion_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAttachment" ADD CONSTRAINT "IncidentReportAttachment_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAttachment" ADD CONSTRAINT "IncidentReportAttachment_revoker_actor_fkey"
  FOREIGN KEY ("organizationId", "revokedByActorType", "revokedByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportApproval" ADD CONSTRAINT "IncidentReportApproval_actor_fkey"
  FOREIGN KEY ("organizationId", "actorType", "actorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportExport" ADD CONSTRAINT "IncidentReportExport_creator_actor_fkey"
  FOREIGN KEY ("organizationId", "createdByActorType", "createdByActorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAuditEvent" ADD CONSTRAINT "IncidentReportAuditEvent_actor_fkey"
  FOREIGN KEY ("organizationId", "actorType", "actorId") REFERENCES "CoroActorIdentity"("organizationId", "actorType", "actorId") ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION "client01b_provenance_immutable_guard"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(OLD.*) IS DISTINCT FROM ROW(NEW.*) THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "IncidentReportApproval_append_only_guard"
BEFORE UPDATE ON "IncidentReportApproval" FOR EACH ROW
EXECUTE FUNCTION "client01b_provenance_immutable_guard"();
CREATE TRIGGER "IncidentReportAuditEvent_append_only_guard"
BEFORE UPDATE ON "IncidentReportAuditEvent" FOR EACH ROW
EXECUTE FUNCTION "client01b_provenance_immutable_guard"();

-- Operational modules: expand legacy USER-only provenance to typed actors.
-- Legacy columns remain for backward compatibility and are populated for USER
-- actors only; the typed triple is the canonical integrity boundary.
ALTER TABLE "OperationalLogEntry" ADD COLUMN "authorActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "authorActorId" TEXT;
UPDATE "OperationalLogEntry" SET "authorActorId" = "authorUserId";
ALTER TABLE "OperationalLogEntry" ALTER COLUMN "authorActorId" SET NOT NULL, ALTER COLUMN "authorUserId" DROP NOT NULL;

ALTER TABLE "OperationalShift"
  ADD COLUMN "responsibleActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "responsibleActorId" TEXT,
  ADD COLUMN "createdByActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "createdByActorId" TEXT,
  ADD COLUMN "closedByActorType" "CoroActorType", ADD COLUMN "closedByActorId" TEXT,
  ADD COLUMN "cancelledByActorType" "CoroActorType", ADD COLUMN "cancelledByActorId" TEXT;
UPDATE "OperationalShift" SET "responsibleActorId"="responsibleUserId", "createdByActorId"="createdByUserId",
 "closedByActorType"=CASE WHEN "closedByUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "closedByActorId"="closedByUserId",
 "cancelledByActorType"=CASE WHEN "cancelledByUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "cancelledByActorId"="cancelledByUserId";
ALTER TABLE "OperationalShift" ALTER COLUMN "responsibleActorId" SET NOT NULL, ALTER COLUMN "createdByActorId" SET NOT NULL,
 ALTER COLUMN "responsibleUserId" DROP NOT NULL, ALTER COLUMN "createdByUserId" DROP NOT NULL;

ALTER TABLE "OperationalShiftParticipant" ADD COLUMN "participantActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "participantActorId" TEXT;
UPDATE "OperationalShiftParticipant" SET "participantActorId"="userId";
ALTER TABLE "OperationalShiftParticipant" ALTER COLUMN "participantActorId" SET NOT NULL, ALTER COLUMN "userId" DROP NOT NULL;
DROP INDEX "OperationalShiftParticipant_shiftId_userId_key";
CREATE UNIQUE INDEX "OperationalShiftParticipant_shiftId_participant_actor_key" ON "OperationalShiftParticipant"("shiftId","participantActorType","participantActorId");

ALTER TABLE "OperationalShiftHistory" ADD COLUMN "actorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "actorId" TEXT;
UPDATE "OperationalShiftHistory" SET "actorId"="actorUserId";
ALTER TABLE "OperationalShiftHistory" ALTER COLUMN "actorId" SET NOT NULL, ALTER COLUMN "actorUserId" DROP NOT NULL;

ALTER TABLE "OperationalHandover"
  ADD COLUMN "outgoingActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "outgoingActorId" TEXT,
  ADD COLUMN "incomingActorType" "CoroActorType", ADD COLUMN "incomingActorId" TEXT;
UPDATE "OperationalHandover" SET "outgoingActorId"="outgoingUserId",
 "incomingActorType"=CASE WHEN "incomingUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "incomingActorId"="incomingUserId";
ALTER TABLE "OperationalHandover" ALTER COLUMN "outgoingActorId" SET NOT NULL, ALTER COLUMN "outgoingUserId" DROP NOT NULL;

ALTER TABLE "OperationalHandoverAction" ADD COLUMN "actorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "actorId" TEXT;
UPDATE "OperationalHandoverAction" SET "actorId"="actorUserId";
ALTER TABLE "OperationalHandoverAction" ALTER COLUMN "actorId" SET NOT NULL, ALTER COLUMN "actorUserId" DROP NOT NULL;

ALTER TABLE "OperationalDirective"
  ADD COLUMN "createdByActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "createdByActorId" TEXT,
  ADD COLUMN "approvedByActorType" "CoroActorType", ADD COLUMN "approvedByActorId" TEXT;
UPDATE "OperationalDirective" SET "createdByActorId"="createdByUserId",
 "approvedByActorType"=CASE WHEN "approvedByUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "approvedByActorId"="approvedByUserId";
ALTER TABLE "OperationalDirective" ALTER COLUMN "createdByActorId" SET NOT NULL, ALTER COLUMN "createdByUserId" DROP NOT NULL;

ALTER TABLE "OperationalDirectiveVersion" ADD COLUMN "authorActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "authorActorId" TEXT;
UPDATE "OperationalDirectiveVersion" SET "authorActorId"="authorUserId";
ALTER TABLE "OperationalDirectiveVersion" ALTER COLUMN "authorActorId" SET NOT NULL, ALTER COLUMN "authorUserId" DROP NOT NULL;

ALTER TABLE "OperationalDirectiveReceipt" ADD COLUMN "recipientActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "recipientActorId" TEXT;
UPDATE "OperationalDirectiveReceipt" SET "recipientActorId"="userId";
ALTER TABLE "OperationalDirectiveReceipt" ALTER COLUMN "recipientActorId" SET NOT NULL, ALTER COLUMN "userId" DROP NOT NULL;
DROP INDEX "OperationalDirectiveReceipt_versionId_userId_key";
CREATE UNIQUE INDEX "OperationalDirectiveReceipt_versionId_recipient_actor_key" ON "OperationalDirectiveReceipt"("versionId","recipientActorType","recipientActorId");

ALTER TABLE "OperationalFollowUp"
  ADD COLUMN "responsibleActorType" "CoroActorType", ADD COLUMN "responsibleActorId" TEXT,
  ADD COLUMN "verifiedByActorType" "CoroActorType", ADD COLUMN "verifiedByActorId" TEXT,
  ADD COLUMN "createdByActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "createdByActorId" TEXT;
UPDATE "OperationalFollowUp" SET
 "responsibleActorType"=CASE WHEN "responsibleUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "responsibleActorId"="responsibleUserId",
 "verifiedByActorType"=CASE WHEN "verifiedByUserId" IS NULL THEN NULL ELSE 'USER'::"CoroActorType" END, "verifiedByActorId"="verifiedByUserId",
 "createdByActorId"="createdByUserId";
ALTER TABLE "OperationalFollowUp" ALTER COLUMN "createdByActorId" SET NOT NULL, ALTER COLUMN "createdByUserId" DROP NOT NULL;

ALTER TABLE "OperationalFollowUpEvent" ADD COLUMN "actorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "actorId" TEXT;
UPDATE "OperationalFollowUpEvent" SET "actorId"="actorUserId";
ALTER TABLE "OperationalFollowUpEvent" ALTER COLUMN "actorId" SET NOT NULL, ALTER COLUMN "actorUserId" DROP NOT NULL;

ALTER TABLE "OperationalLogEntryRevision" ADD COLUMN "authorActorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "authorActorId" TEXT;
UPDATE "OperationalLogEntryRevision" SET "authorActorId"="authorUserId";
ALTER TABLE "OperationalLogEntryRevision" ALTER COLUMN "authorActorId" SET NOT NULL, ALTER COLUMN "authorUserId" DROP NOT NULL;

ALTER TABLE "OperationalLogAuditEvent" ADD COLUMN "actorType" "CoroActorType" NOT NULL DEFAULT 'USER', ADD COLUMN "actorId" TEXT;
UPDATE "OperationalLogAuditEvent" SET "actorId"="actorUserId";
ALTER TABLE "OperationalLogAuditEvent" ALTER COLUMN "actorId" SET NOT NULL, ALTER COLUMN "actorUserId" DROP NOT NULL;

-- Optional actor fields are all-or-none and every typed triple resolves to a
-- real tenant-scoped identity.
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_closed_actor_pair_check" CHECK (("closedByActorType" IS NULL)=("closedByActorId" IS NULL)), ADD CONSTRAINT "OperationalShift_cancelled_actor_pair_check" CHECK (("cancelledByActorType" IS NULL)=("cancelledByActorId" IS NULL));
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_incoming_actor_pair_check" CHECK (("incomingActorType" IS NULL)=("incomingActorId" IS NULL));
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_approved_actor_pair_check" CHECK (("approvedByActorType" IS NULL)=("approvedByActorId" IS NULL));
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_responsible_actor_pair_check" CHECK (("responsibleActorType" IS NULL)=("responsibleActorId" IS NULL)), ADD CONSTRAINT "OperationalFollowUp_verifier_actor_pair_check" CHECK (("verifiedByActorType" IS NULL)=("verifiedByActorId" IS NULL));

ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_author_actor_fkey" FOREIGN KEY ("organizationId","authorActorType","authorActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_responsible_actor_fkey" FOREIGN KEY ("organizationId","responsibleActorType","responsibleActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalShift_creator_actor_fkey" FOREIGN KEY ("organizationId","createdByActorType","createdByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalShift_closer_actor_fkey" FOREIGN KEY ("organizationId","closedByActorType","closedByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalShift_canceller_actor_fkey" FOREIGN KEY ("organizationId","cancelledByActorType","cancelledByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalShiftParticipant" ADD CONSTRAINT "OperationalShiftParticipant_actor_fkey" FOREIGN KEY ("organizationId","participantActorType","participantActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalShiftHistory" ADD CONSTRAINT "OperationalShiftHistory_actor_fkey" FOREIGN KEY ("organizationId","actorType","actorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_outgoing_actor_fkey" FOREIGN KEY ("organizationId","outgoingActorType","outgoingActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalHandover_incoming_actor_fkey" FOREIGN KEY ("organizationId","incomingActorType","incomingActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalHandoverAction" ADD CONSTRAINT "OperationalHandoverAction_actor_fkey" FOREIGN KEY ("organizationId","actorType","actorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_creator_actor_fkey" FOREIGN KEY ("organizationId","createdByActorType","createdByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalDirective_approver_actor_fkey" FOREIGN KEY ("organizationId","approvedByActorType","approvedByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalDirectiveVersion" ADD CONSTRAINT "OperationalDirectiveVersion_author_actor_fkey" FOREIGN KEY ("organizationId","authorActorType","authorActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_recipient_actor_fkey" FOREIGN KEY ("organizationId","recipientActorType","recipientActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_responsible_actor_fkey" FOREIGN KEY ("organizationId","responsibleActorType","responsibleActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalFollowUp_verifier_actor_fkey" FOREIGN KEY ("organizationId","verifiedByActorType","verifiedByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT, ADD CONSTRAINT "OperationalFollowUp_creator_actor_fkey" FOREIGN KEY ("organizationId","createdByActorType","createdByActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalFollowUpEvent" ADD CONSTRAINT "OperationalFollowUpEvent_actor_fkey" FOREIGN KEY ("organizationId","actorType","actorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalLogEntryRevision" ADD CONSTRAINT "OperationalLogEntryRevision_author_actor_fkey" FOREIGN KEY ("organizationId","authorActorType","authorActorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;
ALTER TABLE "OperationalLogAuditEvent" ADD CONSTRAINT "OperationalLogAuditEvent_actor_fkey" FOREIGN KEY ("organizationId","actorType","actorId") REFERENCES "CoroActorIdentity"("organizationId","actorType","actorId") ON DELETE RESTRICT;

CREATE TRIGGER "OperationalShiftHistory_append_only_guard" BEFORE UPDATE ON "OperationalShiftHistory" FOR EACH ROW EXECUTE FUNCTION "client01b_provenance_immutable_guard"();
CREATE TRIGGER "OperationalHandoverAction_append_only_guard" BEFORE UPDATE ON "OperationalHandoverAction" FOR EACH ROW EXECUTE FUNCTION "client01b_provenance_immutable_guard"();
CREATE TRIGGER "OperationalFollowUpEvent_append_only_guard" BEFORE UPDATE ON "OperationalFollowUpEvent" FOR EACH ROW EXECUTE FUNCTION "client01b_provenance_immutable_guard"();
CREATE TRIGGER "OperationalLogAuditEvent_append_only_guard" BEFORE UPDATE ON "OperationalLogAuditEvent" FOR EACH ROW EXECUTE FUNCTION "client01b_provenance_immutable_guard"();
