-- QA ONLY. Removes the disposable CORO Démo QA schema.
DO $$
BEGIN
  IF current_database() <> 'coro_demo_qa' THEN
    RAISE EXCEPTION 'QA_DATABASE_GUARD_FAILED';
  END IF;
END $$;

DROP SCHEMA public CASCADE;
CREATE SCHEMA public AUTHORIZATION coro_demo;
GRANT ALL ON SCHEMA public TO coro_demo;
