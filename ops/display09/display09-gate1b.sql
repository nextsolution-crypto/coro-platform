\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  migration_count integer;
  display_permission_count integer;
  invalid_spatial_rows bigint;
  invalid_device_capabilities bigint;
BEGIN
  SELECT count(*) INTO migration_count
  FROM "_prisma_migrations"
  WHERE finished_at IS NOT NULL
    AND rolled_back_at IS NULL
    AND migration_name IN (
      '20261129010000_coro_display_spatial_foundations',
      '20261130010000_coro_display_plan_publication',
      '20261201010000_display_pdf_render_jobs',
      '20261202010000_display_client_portal',
      '20261203010000_display_client_portal_review_hardening',
      '20261204010000_display_observation_professional_workflow',
      '20261205010000_display_connected_player',
      '20261205020000_display_device_scope_hardening',
      '20261205030000_display_operational_heartbeat',
      '20261206010000_display_emergency_orchestration',
      '20261207010000_display_permanent_url_web_player'
    );
  IF migration_count <> 11 THEN RAISE EXCEPTION 'GATE_1B_MIGRATIONS_%', migration_count; END IF;

  SELECT count(*) INTO display_permission_count
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'DisplayPermission';
  IF display_permission_count < 26 THEN RAISE EXCEPTION 'GATE_1B_PERMISSIONS_%', display_permission_count; END IF;

  SELECT count(*) INTO invalid_spatial_rows FROM (
    SELECT f.id FROM "BuildingFloor" f LEFT JOIN "Building" b ON b.id=f."buildingId" AND b."organizationId"=f."organizationId" WHERE b.id IS NULL
    UNION ALL
    SELECT z.id FROM "BuildingZone" z LEFT JOIN "BuildingFloor" f ON f.id=z."floorId" AND f."organizationId"=z."organizationId" AND f."buildingId"=z."buildingId" WHERE f.id IS NULL
    UNION ALL
    SELECT l.id FROM "DisplayLocation" l LEFT JOIN "BuildingFloor" f ON f.id=l."floorId" AND f."organizationId"=l."organizationId" AND f."buildingId"=l."buildingId" WHERE f.id IS NULL
  ) invalid;
  IF invalid_spatial_rows <> 0 THEN RAISE EXCEPTION 'GATE_1B_SPATIAL_SCOPE_%', invalid_spatial_rows; END IF;

  SELECT count(*) INTO invalid_device_capabilities FROM "DisplayWebSession" WHERE capability <> 'WEB_VIEW_ONLY';
  IF invalid_device_capabilities <> 0 THEN RAISE EXCEPTION 'GATE_1B_DEVICE_CAPABILITY_%', invalid_device_capabilities; END IF;
END $$;

SELECT 'GATE_1B=PASS' AS result;
ROLLBACK;
