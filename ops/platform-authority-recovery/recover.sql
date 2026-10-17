\set QUIET 1
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(hashtextextended('platform-authority:founder-recovery', 0));
SELECT set_config('coro.recovery.operation', :'operation', true);
SELECT set_config('coro.recovery.incident_id', :'incident_id', true);
SELECT set_config('coro.recovery.authorization_reference', :'authorization_reference', true);
SELECT set_config('coro.recovery.operator_reference', :'operator_reference', true);
SELECT set_config('coro.recovery.authorizing_user_id', :'authorizing_user_id', true);
SELECT set_config('coro.recovery.expected_founder_user_id', :'expected_founder_user_id', true);
SELECT set_config('coro.recovery.expected_operator_organization_id', :'expected_operator_organization_id', true);
SELECT set_config('coro.recovery.target_founder_user_id', :'target_founder_user_id', true);
SELECT set_config('coro.recovery.target_operator_organization_id', :'target_operator_organization_id', true);
SELECT set_config('coro.recovery.expected_lock_version', :'expected_lock_version', true);
SELECT set_config('coro.recovery.reason', :'reason', true);
SELECT set_config('coro.recovery.approval_expires_at', :'approval_expires_at', true);
SELECT set_config('coro.recovery.apply', :'apply', true);

DO $recovery$
DECLARE
  authority_record "PlatformAuthorityConfiguration"%ROWTYPE;
  authorizer "User"%ROWTYPE;
  target_founder "User"%ROWTYPE;
  target_operator "Organization"%ROWTYPE;
  active_super_admins integer;
  before_hash text;
  after_hash text;
  operation_name text := current_setting('coro.recovery.operation');
BEGIN
  IF current_setting('coro.recovery.apply') <> 'true' THEN RAISE EXCEPTION 'apply flag is required'; END IF;
  IF current_setting('coro.recovery.approval_expires_at')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'recovery approval expired'; END IF;
  SELECT * INTO authority_record FROM "PlatformAuthorityConfiguration" WHERE id = 'PRIMARY' FOR UPDATE;
  IF NOT FOUND OR authority_record.status <> 'ACTIVE' THEN RAISE EXCEPTION 'exactly one ACTIVE authority is required'; END IF;
  IF authority_record."lockVersion" <> current_setting('coro.recovery.expected_lock_version')::integer
    OR authority_record."founderUserId" <> current_setting('coro.recovery.expected_founder_user_id')
    OR authority_record."operatorOrganizationId" <> current_setting('coro.recovery.expected_operator_organization_id')
  THEN RAISE EXCEPTION 'stale or mismatched authority state'; END IF;
  SELECT * INTO authorizer FROM "User" WHERE id = current_setting('coro.recovery.authorizing_user_id');
  IF NOT FOUND THEN RAISE EXCEPTION 'authorizing user not found'; END IF;
  IF authorizer.id <> current_setting('coro.recovery.expected_founder_user_id')
    OR authorizer."organizationId" NOT IN (
      current_setting('coro.recovery.expected_operator_organization_id'),
      current_setting('coro.recovery.target_operator_organization_id')
    )
  THEN RAISE EXCEPTION 'authorizing Founder identity mismatch'; END IF;
  SELECT * INTO target_founder FROM "User" WHERE id = current_setting('coro.recovery.target_founder_user_id');
  SELECT * INTO target_operator FROM "Organization" WHERE id = current_setting('coro.recovery.target_operator_organization_id');
  IF NOT FOUND THEN RAISE EXCEPTION 'target organization not found'; END IF;
  SELECT encode(sha256(convert_to(jsonb_build_object(
    'authority', to_jsonb(authority_record), 'founder', to_jsonb(target_founder),
    'operator', to_jsonb(target_operator))::text, 'UTF8')), 'hex') INTO before_hash;

  IF operation_name = 'RESTORE_FOUNDER_STATUS' THEN
    IF current_setting('coro.recovery.target_founder_user_id') <> authority_record."founderUserId"
      OR target_founder."organizationId" <> authority_record."operatorOrganizationId"
    THEN RAISE EXCEPTION 'founder status target mismatch'; END IF;
    UPDATE "User" SET "isActive" = true, role = 'SUPER_ADMIN'
      WHERE id = authority_record."founderUserId";
    ALTER TABLE "PlatformAuthorityConfiguration" DISABLE TRIGGER "PlatformAuthorityConfiguration_protect";
    UPDATE "PlatformAuthorityConfiguration" SET "lockVersion" = "lockVersion" + 1,
      "updatedAt" = clock_timestamp() WHERE id = 'PRIMARY';
    ALTER TABLE "PlatformAuthorityConfiguration" ENABLE TRIGGER "PlatformAuthorityConfiguration_protect";
  ELSIF operation_name = 'RESTORE_OPERATOR_STATUS' THEN
    IF current_setting('coro.recovery.target_operator_organization_id') <> authority_record."operatorOrganizationId"
      OR target_operator."isInternal" IS NOT TRUE
    THEN RAISE EXCEPTION 'operator status target mismatch'; END IF;
    UPDATE "Organization" SET "isActive" = true WHERE id = authority_record."operatorOrganizationId";
    ALTER TABLE "PlatformAuthorityConfiguration" DISABLE TRIGGER "PlatformAuthorityConfiguration_protect";
    UPDATE "PlatformAuthorityConfiguration" SET "lockVersion" = "lockVersion" + 1,
      "updatedAt" = clock_timestamp() WHERE id = 'PRIMARY';
    ALTER TABLE "PlatformAuthorityConfiguration" ENABLE TRIGGER "PlatformAuthorityConfiguration_protect";
  ELSIF operation_name = 'REBIND_FOUNDER' THEN
    IF target_founder.id IS NULL OR target_founder."isActive" IS NOT TRUE
      OR target_founder.role <> 'SUPER_ADMIN'
      OR target_founder."organizationId" <> authority_record."operatorOrganizationId"
    THEN RAISE EXCEPTION 'replacement Founder is ineligible'; END IF;
    ALTER TABLE "PlatformAuthorityConfiguration" DISABLE TRIGGER "PlatformAuthorityConfiguration_protect";
    UPDATE "PlatformAuthorityConfiguration" SET "founderUserId" = target_founder.id,
      "lockVersion" = "lockVersion" + 1, "updatedAt" = clock_timestamp() WHERE id = 'PRIMARY';
    ALTER TABLE "PlatformAuthorityConfiguration" ENABLE TRIGGER "PlatformAuthorityConfiguration_protect";
  ELSIF operation_name = 'REBIND_OPERATOR' THEN
    IF target_operator.id IS NULL OR target_operator."isActive" IS NOT TRUE
      OR target_operator."isInternal" IS NOT TRUE
      OR target_founder.id <> authority_record."founderUserId"
      OR target_founder."organizationId" <> target_operator.id
    THEN RAISE EXCEPTION 'replacement operator is ineligible'; END IF;
    ALTER TABLE "PlatformAuthorityConfiguration" DISABLE TRIGGER "PlatformAuthorityConfiguration_protect";
    UPDATE "PlatformAuthorityConfiguration" SET "operatorOrganizationId" = target_operator.id,
      "lockVersion" = "lockVersion" + 1, "updatedAt" = clock_timestamp() WHERE id = 'PRIMARY';
    ALTER TABLE "PlatformAuthorityConfiguration" ENABLE TRIGGER "PlatformAuthorityConfiguration_protect";
  ELSE
    RAISE EXCEPTION 'operation is not permitted';
  END IF;

  SELECT COUNT(*) INTO active_super_admins FROM "User" WHERE role = 'SUPER_ADMIN' AND "isActive" = true;
  IF active_super_admins <> 1 THEN RAISE EXCEPTION 'exactly one active SUPER_ADMIN is required after recovery'; END IF;
  SELECT encode(sha256(convert_to(jsonb_build_object(
    'authority', (SELECT to_jsonb(a) FROM "PlatformAuthorityConfiguration" a WHERE id = 'PRIMARY'),
    'founder', (SELECT to_jsonb(u) FROM "User" u WHERE id = current_setting('coro.recovery.target_founder_user_id')),
    'operator', (SELECT to_jsonb(o) FROM "Organization" o WHERE id = current_setting('coro.recovery.target_operator_organization_id')))::text, 'UTF8')), 'hex') INTO after_hash;
  INSERT INTO "AdminAuditEvent" (id, "actorUserId", "actorDisplayName", "actorRole", action,
    "targetType", "targetId", "organizationId", reason, "beforeData", "afterData", "createdAt")
  VALUES (current_setting('coro.recovery.incident_id'), authorizer.id, CONCAT(authorizer."firstName", ' ', authorizer."lastName"), authorizer.role::text,
    'PLATFORM_AUTHORITY_FOUNDER_RECOVERY', 'PlatformAuthorityConfiguration', 'PRIMARY', current_setting('coro.recovery.target_operator_organization_id'),
    current_setting('coro.recovery.reason'), jsonb_build_object('stateHash', before_hash, 'authorizationReference', current_setting('coro.recovery.authorization_reference')),
    jsonb_build_object('stateHash', after_hash, 'operation', operation_name, 'operatorReference', current_setting('coro.recovery.operator_reference'),
      'outcome', 'SUCCEEDED'), clock_timestamp());
END
$recovery$;

SELECT json_build_object('outcome','SUCCEEDED','incidentId',:'incident_id','operation',:'operation');
COMMIT;
