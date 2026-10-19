-- Align advisor cost-rate lifecycle actors with canonical Platform Authority.
-- Forward-only function replacement: no table, data, or privilege changes.
CREATE OR REPLACE FUNCTION "validate_advisor_internal_cost_rate"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  advisor_org TEXT;
  actor_id TEXT;
  actor_ids TEXT[] := ARRAY[]::TEXT[];
  actor_is_active BOOLEAN;
  actor_role "UserRole";
  actor_org TEXT;
  actor_org_is_active BOOLEAN;
  actor_org_is_internal BOOLEAN;
  authority_status "PlatformAuthorityStatus";
  operator_org_id TEXT;
  founder_user_id TEXT;
  operator_org_is_active BOOLEAN;
  operator_org_is_internal BOOLEAN;
  founder_is_active BOOLEAN;
  founder_role "UserRole";
  founder_org_id TEXT;
  has_financial_grant BOOLEAN;
  overlap_id TEXT;
  replaced "AdvisorInternalCostRate"%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || NEW."userId" || ':' || NEW."currency", 0));

  SELECT "organizationId" INTO advisor_org
  FROM "User"
  WHERE "id" = NEW."userId" AND "isActive" = TRUE;
  IF advisor_org IS DISTINCT FROM NEW."organizationId" THEN
    RAISE EXCEPTION 'FINANCIAL_ADVISOR_TENANT_MISMATCH' USING ERRCODE = '23514';
  END IF;

  -- Validate every actor introduced by this transition. Revocation does not
  -- invalidate a prior, already audited lifecycle action.
  IF TG_OP = 'UPDATE' THEN
    IF NEW."proposedByUserId" IS DISTINCT FROM OLD."proposedByUserId" THEN
      actor_ids := array_append(actor_ids, NEW."proposedByUserId");
    END IF;
    IF NEW."approvedByUserId" IS DISTINCT FROM OLD."approvedByUserId" THEN
      actor_ids := array_append(actor_ids, NEW."approvedByUserId");
    END IF;
    IF NEW."rejectedByUserId" IS DISTINCT FROM OLD."rejectedByUserId" THEN
      actor_ids := array_append(actor_ids, NEW."rejectedByUserId");
    END IF;
    IF NEW."supersededByUserId" IS DISTINCT FROM OLD."supersededByUserId" THEN
      actor_ids := array_append(actor_ids, NEW."supersededByUserId");
    END IF;
  END IF;

  FOREACH actor_id IN ARRAY actor_ids LOOP
    CONTINUE WHEN actor_id IS NULL;
    SELECT u."isActive", u."role", u."organizationId", o."isActive", o."isInternal"
      INTO actor_is_active, actor_role, actor_org, actor_org_is_active, actor_org_is_internal
    FROM "User" u
    JOIN "Organization" o ON o."id" = u."organizationId"
    WHERE u."id" = actor_id;
    IF actor_is_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'FINANCIAL_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
    END IF;

    SELECT pac."status", pac."operatorOrganizationId", pac."founderUserId",
           operator_org."isActive", operator_org."isInternal",
           founder."isActive", founder."role", founder."organizationId"
      INTO authority_status, operator_org_id, founder_user_id,
           operator_org_is_active, operator_org_is_internal,
           founder_is_active, founder_role, founder_org_id
    FROM "PlatformAuthorityConfiguration" pac
    JOIN "Organization" operator_org ON operator_org."id" = pac."operatorOrganizationId"
    JOIN "User" founder ON founder."id" = pac."founderUserId"
    WHERE pac."id" = 'PRIMARY';

    -- Mirror the application compatibility policy before activation.
    IF authority_status IS NULL OR authority_status = 'DRAFT' THEN
      IF actor_role IS DISTINCT FROM 'SUPER_ADMIN'::"UserRole" THEN
        RAISE EXCEPTION 'FINANCIAL_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF authority_status IS DISTINCT FROM 'ACTIVE'::"PlatformAuthorityStatus"
         OR operator_org_is_active IS DISTINCT FROM TRUE
         OR operator_org_is_internal IS DISTINCT FROM TRUE
         OR founder_is_active IS DISTINCT FROM TRUE
         OR founder_role IS DISTINCT FROM 'SUPER_ADMIN'::"UserRole"
         OR founder_org_id IS DISTINCT FROM operator_org_id THEN
        RAISE EXCEPTION 'FINANCIAL_PLATFORM_AUTHORITY_INCONSISTENT' USING ERRCODE = '23514';
      END IF;

      IF actor_id IS DISTINCT FROM founder_user_id THEN
        IF actor_org IS DISTINCT FROM operator_org_id
           OR actor_org_is_active IS DISTINCT FROM TRUE
           OR actor_org_is_internal IS DISTINCT FROM TRUE THEN
          RAISE EXCEPTION 'FINANCIAL_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
        END IF;
        SELECT EXISTS (
          SELECT 1 FROM "PlatformPermissionGrant" grant_record
          WHERE grant_record."userId" = actor_id
            AND grant_record."permission" = 'FINANCIAL_ADVISOR_COST_MANAGE'::"PlatformPermission"
            AND grant_record."status" = 'ACTIVE'::"PlatformPermissionGrantStatus"
            AND grant_record."effectiveFrom" <= CURRENT_TIMESTAMP
            AND (
              (grant_record."scope" = 'GLOBAL'::"PlatformPermissionScope" AND grant_record."targetOrganizationId" IS NULL)
              OR
              (grant_record."scope" = 'ORGANIZATION'::"PlatformPermissionScope" AND grant_record."targetOrganizationId" = NEW."organizationId")
            )
        ) INTO has_financial_grant;
        IF has_financial_grant IS DISTINCT FROM TRUE THEN
          RAISE EXCEPTION 'FINANCIAL_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF NEW."status" = 'APPROVED' THEN
    IF NEW."supersedesRateId" IS NOT NULL THEN
      SELECT * INTO replaced FROM "AdvisorInternalCostRate" WHERE "id" = NEW."supersedesRateId" FOR UPDATE;
      IF replaced."id" IS NULL OR replaced."organizationId" <> NEW."organizationId" OR replaced."userId" <> NEW."userId" OR replaced."currency" <> NEW."currency" OR replaced."status" <> 'SUPERSEDED' OR replaced."supersededEffectiveAt" <> NEW."effectiveFrom" THEN RAISE EXCEPTION 'Invalid advisor cost rate supersession' USING ERRCODE = '23514'; END IF;
    END IF;
    SELECT r."id" INTO overlap_id FROM "AdvisorInternalCostRate" r
    WHERE r."id" <> NEW."id" AND r."organizationId" = NEW."organizationId" AND r."userId" = NEW."userId" AND r."currency" = NEW."currency" AND r."status" IN ('APPROVED', 'SUPERSEDED')
      AND daterange(r."effectiveFrom", LEAST(COALESCE(r."effectiveUntil", 'infinity'::date), COALESCE(r."supersededEffectiveAt", 'infinity'::date)), '[)')
       && daterange(NEW."effectiveFrom", COALESCE(NEW."effectiveUntil", 'infinity'::date), '[)') LIMIT 1;
    IF overlap_id IS NOT NULL THEN RAISE EXCEPTION 'Advisor cost rate effective periods overlap' USING ERRCODE = '23P01'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- Align governed ProjectMandate sale validation with the same canonical
-- Platform Authority boundary. This function replacement preserves every
-- pre-existing financial term and optimistic-lock invariant.
CREATE OR REPLACE FUNCTION "protect_project_mandate_financial_terms"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor_id TEXT;
  actor_is_active BOOLEAN;
  actor_role "UserRole";
  actor_org TEXT;
  actor_org_is_active BOOLEAN;
  actor_org_is_internal BOOLEAN;
  authority_status "PlatformAuthorityStatus";
  operator_org_id TEXT;
  founder_user_id TEXT;
  operator_org_is_active BOOLEAN;
  operator_org_is_internal BOOLEAN;
  founder_is_active BOOLEAN;
  founder_role "UserRole";
  founder_org_id TEXT;
  has_financial_grant BOOLEAN;
BEGIN
  IF ROW(NEW."soldAmountDecimal", NEW."soldCurrency", NEW."soldAt", NEW."soldValidatedByUserId")
     IS DISTINCT FROM
     ROW(OLD."soldAmountDecimal", OLD."soldCurrency", OLD."soldAt", OLD."soldValidatedByUserId") THEN
    actor_id := NEW."soldValidatedByUserId";
    SELECT u."isActive", u."role", u."organizationId", o."isActive", o."isInternal"
      INTO actor_is_active, actor_role, actor_org, actor_org_is_active, actor_org_is_internal
    FROM "User" u
    JOIN "Organization" o ON o."id" = u."organizationId"
    WHERE u."id" = actor_id;
    IF actor_is_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
    END IF;

    SELECT pac."status", pac."operatorOrganizationId", pac."founderUserId",
           operator_org."isActive", operator_org."isInternal",
           founder."isActive", founder."role", founder."organizationId"
      INTO authority_status, operator_org_id, founder_user_id,
           operator_org_is_active, operator_org_is_internal,
           founder_is_active, founder_role, founder_org_id
    FROM "PlatformAuthorityConfiguration" pac
    JOIN "Organization" operator_org ON operator_org."id" = pac."operatorOrganizationId"
    JOIN "User" founder ON founder."id" = pac."founderUserId"
    WHERE pac."id" = 'PRIMARY';

    IF authority_status IS NULL OR authority_status = 'DRAFT' THEN
      IF actor_role IS DISTINCT FROM 'SUPER_ADMIN'::"UserRole" THEN
        RAISE EXCEPTION 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF authority_status IS DISTINCT FROM 'ACTIVE'::"PlatformAuthorityStatus"
         OR operator_org_is_active IS DISTINCT FROM TRUE
         OR operator_org_is_internal IS DISTINCT FROM TRUE
         OR founder_is_active IS DISTINCT FROM TRUE
         OR founder_role IS DISTINCT FROM 'SUPER_ADMIN'::"UserRole"
         OR founder_org_id IS DISTINCT FROM operator_org_id THEN
        RAISE EXCEPTION 'FINANCIAL_PLATFORM_AUTHORITY_INCONSISTENT' USING ERRCODE = '23514';
      END IF;

      IF actor_id IS DISTINCT FROM founder_user_id THEN
        IF actor_org IS DISTINCT FROM operator_org_id
           OR actor_org_is_active IS DISTINCT FROM TRUE
           OR actor_org_is_internal IS DISTINCT FROM TRUE THEN
          RAISE EXCEPTION 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
        END IF;
        SELECT EXISTS (
          SELECT 1 FROM "PlatformPermissionGrant" grant_record
          WHERE grant_record."userId" = actor_id
            AND grant_record."permission" = 'FINANCIAL_SALE_VALIDATE'::"PlatformPermission"
            AND grant_record."status" = 'ACTIVE'::"PlatformPermissionGrantStatus"
            AND grant_record."effectiveFrom" <= CURRENT_TIMESTAMP
            AND (
              (grant_record."scope" = 'GLOBAL'::"PlatformPermissionScope" AND grant_record."targetOrganizationId" IS NULL)
              OR
              (grant_record."scope" = 'ORGANIZATION'::"PlatformPermissionScope" AND grant_record."targetOrganizationId" = NEW."organizationId")
            )
        ) INTO has_financial_grant;
        IF has_financial_grant IS DISTINCT FROM TRUE THEN
          RAISE EXCEPTION 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;

    IF NEW."financialLockVersion" <> OLD."financialLockVersion" + 1
       OR NEW."soldValidatedAt" IS NULL
       OR NEW."soldValidatedByUserId" IS NULL
       OR LENGTH(BTRIM(NEW."soldValidationReason")) = 0 THEN
      RAISE EXCEPTION 'Governed mandate sale changes require validation and lock increment' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
