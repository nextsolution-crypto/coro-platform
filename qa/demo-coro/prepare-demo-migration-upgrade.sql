-- QA ONLY: reconstruct the exact predecessor state before
-- 20261122010000_demo_environment_governance.
-- The caller must verify current_database() = 'coro_demo_qa'.
DO $$
BEGIN
  IF current_database() <> 'coro_demo_qa' THEN
    RAISE EXCEPTION 'QA_DATABASE_GUARD_FAILED';
  END IF;
END $$;

DROP TABLE IF EXISTS "DemoCommunicationEvent";
DROP TABLE IF EXISTS "DemoFixtureRecord";
DROP TABLE IF EXISTS "DemoEnvironment";
DROP TYPE IF EXISTS "DemoCommunicationChannel";
DROP TYPE IF EXISTS "DemoFixtureState";
DROP TYPE IF EXISTS "DemoCommunicationMode";
DROP TYPE IF EXISTS "DemoEnvironmentStatus";
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20261122010000_demo_environment_governance';
