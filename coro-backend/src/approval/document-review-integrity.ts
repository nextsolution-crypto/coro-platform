import { createHash } from 'crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export interface ReviewSnapshotInput {
  project: {
    id: string;
    documentType: string;
    year: number;
    configData: unknown;
  };
  document: {
    id: string;
    title: string;
    status: string;
    version: number;
    lockVersion: number;
    content: unknown;
  };
}

export function createReviewSnapshot(input: ReviewSnapshotInput) {
  return canonicalize({
    schemaVersion: 1,
    project: input.project,
    document: input.document,
  }) as Record<string, unknown>;
}

export function hashReviewSnapshot(snapshot: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(snapshot)))
    .digest('hex');
}
