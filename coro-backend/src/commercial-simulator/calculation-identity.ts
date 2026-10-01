import { createHash } from 'crypto';

export const SIMULATOR_FINGERPRINT_VERSION = 'simulator-input/v2';

function canonical(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  const serializable = value as { toJSON?: () => unknown };
  if (typeof serializable.toJSON === 'function')
    return canonical(serializable.toJSON());
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]),
  );
}

export function canonicalSimulatorJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

export function simulatorFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(
      `${SIMULATOR_FINGERPRINT_VERSION}\n${canonicalSimulatorJson(value)}`,
    )
    .digest('hex');
}
