\set ON_ERROR_STOP on

INSERT INTO "Organization" (id, name, "createdAt", "updatedAt")
VALUES ('61000000-0000-4000-8000-000000000001', 'P61 historical tenant', now(), now());

INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "organizationId", "createdAt", "updatedAt")
VALUES ('61000000-0000-4000-8000-000000000002', 'historical@p61.invalid', 'not-a-login', 'Historical', 'Actor', 'OPERATOR', '61000000-0000-4000-8000-000000000001', now(), now());

INSERT INTO "AdminAuditEvent" (id, "actorUserId", "actorDisplayName", "actorRole", action, "targetType", "targetId", "organizationId", "createdAt")
VALUES ('61000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000002', 'Historical Actor', 'OPERATOR', 'P61_COMPATIBILITY', 'P61', 'historical', '61000000-0000-4000-8000-000000000001', now());

DO $$
BEGIN
  IF (SELECT "actorType" FROM "AdminAuditEvent" WHERE id = '61000000-0000-4000-8000-000000000003') <> 'INTERNAL_USER'::"AuditActorType" THEN
    RAISE EXCEPTION 'historical actor type default was not preserved';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO "AdminAuditEvent" (id, "actorType", "actorDisplayName", "actorRole", action, "targetType", "targetId", "createdAt")
    VALUES ('61000000-0000-4000-8000-000000000004', 'CLIENT_USER', 'Invalid', 'CLIENT_MANAGER', 'INVALID', 'P61', 'missing-actor', now());
    RAISE EXCEPTION 'missing actor unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO "AdminAuditEvent" (id, "actorType", "actorUserId", "actorClientUserId", "actorDisplayName", "actorRole", action, "targetType", "targetId", "createdAt")
    VALUES ('61000000-0000-4000-8000-000000000005', 'INTERNAL_USER', '61000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000099', 'Invalid', 'OPERATOR', 'INVALID', 'P61', 'mixed-actor', now());
    RAISE EXCEPTION 'mixed actor unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

INSERT INTO "AdminAuditEvent" (id, "actorType", "systemActorKey", "actorDisplayName", "actorRole", action, "targetType", "targetId", "createdAt")
VALUES ('61000000-0000-4000-8000-000000000006', 'SYSTEM', 'P61_QA', 'P61_QA', 'SYSTEM', 'P61_SYSTEM_EVENT', 'P61', 'system', now());

SELECT 'P61_POSTGRES_PROVENANCE_PASS' AS result;
