import { Injectable } from '@nestjs/common';

function integer(name: string, fallback: number, min: number, max: number) {
  const value = process.env[name] ? Number(process.env[name]) : fallback;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} invalide`);
  return value;
}

@Injectable()
export class KnowledgeConfig {
  readonly maxPages = integer('KNOWLEDGE_MAX_PAGES', 500, 1, 5000);
  readonly extractionTimeoutMs = integer(
    'KNOWLEDGE_EXTRACTION_TIMEOUT_MS',
    120_000,
    1000,
    3_600_000,
  );
  readonly chunkTargetCharacters = integer(
    'KNOWLEDGE_CHUNK_TARGET_CHARACTERS',
    2500,
    200,
    20_000,
  );
  readonly chunkOverlapCharacters = integer(
    'KNOWLEDGE_CHUNK_OVERLAP_CHARACTERS',
    300,
    0,
    4000,
  );
  readonly maxResults = integer('KNOWLEDGE_MAX_RESULTS', 12, 1, 50);
  readonly pipelineVersion = 'PROJECTFILE_KNOWLEDGE_V1';
}
