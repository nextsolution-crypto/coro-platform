-- Execute while authenticated as coro_public_knowledge_runtime.
SELECT current_user;
SHOW default_transaction_read_only;
SHOW statement_timeout;

SELECT COUNT(*) AS public_source_count FROM public."PublicKnowledgeSource";
SELECT COUNT(*) AS public_chunk_count FROM public."PublicKnowledgeChunk";
SELECT COUNT(*) AS public_capability_count FROM public."PublicKnowledgeCapability";

SELECT
  has_table_privilege(current_user, 'public."PublicKnowledgeSource"', 'SELECT') AS source_select,
  has_table_privilege(current_user, 'public."PublicKnowledgeSource"', 'INSERT,UPDATE,DELETE') AS source_write,
  has_table_privilege(current_user, 'public."ProjectFile"', 'SELECT') AS project_file_select,
  has_table_privilege(current_user, 'public."Organization"', 'SELECT') AS organization_select,
  has_table_privilege(current_user, 'public."Building"', 'SELECT') AS building_select;
