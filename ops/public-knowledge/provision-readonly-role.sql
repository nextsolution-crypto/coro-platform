-- Review before execution. This script does not set or print a password.
-- Run through the governed PostgreSQL administration path only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coro_public_knowledge_runtime') THEN
    CREATE ROLE coro_public_knowledge_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

ALTER ROLE coro_public_knowledge_runtime SET default_transaction_read_only = on;
ALTER ROLE coro_public_knowledge_runtime SET statement_timeout = '10s';
ALTER ROLE coro_public_knowledge_runtime SET lock_timeout = '2s';

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO coro_public_knowledge_runtime',
    current_database()
  );
END $$;
GRANT USAGE ON SCHEMA public TO coro_public_knowledge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM coro_public_knowledge_runtime;
GRANT SELECT ON TABLE
  public."PublicKnowledgeSource",
  public."PublicKnowledgeChunk",
  public."PublicKnowledgeCapability"
TO coro_public_knowledge_runtime;

-- Supply and rotate the login secret through the approved secret channel.
-- Do not add ALTER ROLE ... PASSWORD to this file or shell history.
