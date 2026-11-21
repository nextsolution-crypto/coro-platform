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
    name?: string;
    documentType: string;
    year: number;
    configData: unknown;
    client?: unknown;
    building?: unknown;
    adviser?: unknown;
    plans?: unknown[];
  };
  document: {
    id: string;
    title: string;
    status: string;
    version: number;
    lockVersion: number;
    content: unknown;
  };
  /** Données hors document lues par le PDF, figées (audit M1-01). */
  exportData?: unknown;
}

export function createReviewSnapshot(input: ReviewSnapshotInput) {
  if (input.exportData === undefined) {
    return canonicalize({
      schemaVersion: 2,
      project: input.project,
      document: input.document,
    }) as Record<string, unknown>;
  }
  return canonicalize({
    schemaVersion: 3,
    project: input.project,
    document: input.document,
    exportData: input.exportData,
  }) as Record<string, unknown>;
}

export function hashReviewSnapshot(snapshot: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(snapshot)))
    .digest('hex');
}
