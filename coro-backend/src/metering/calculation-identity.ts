import { createHash } from 'crypto';
import { CalculationTarget, NormalizedSourceFact } from './metering.types';

export const SOURCE_FINGERPRINT_SCHEMA_VERSION = '1';
export const CALCULATION_KEY_SCHEMA_VERSION = '1';

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(',')}}`;
};
const sha256 = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex');

export const sourceFingerprint = (input: {
  metricCode: string;
  metricVersion: string;
  policyVersion: string;
  target: CalculationTarget;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
  facts: NormalizedSourceFact[];
}) =>
  sha256({
    schemaVersion: SOURCE_FINGERPRINT_SCHEMA_VERSION,
    metricCode: input.metricCode,
    metricVersion: input.metricVersion,
    policyVersion: input.policyVersion,
    target: {
      organizationId: input.target.organizationId,
      scope: input.target.scope,
      clientId: input.target.clientId ?? null,
      buildingId: input.target.buildingId ?? null,
    },
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    timezone: input.timezone,
    facts: [...input.facts].sort((a, b) =>
      canonical(a).localeCompare(canonical(b)),
    ),
  });

export const calculationKey = (input: {
  capabilityCode: string;
  metricCode: string;
  metricVersion: string;
  policyVersion: string;
  target: CalculationTarget;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
  sourceFingerprint: string;
}) =>
  sha256({
    schemaVersion: CALCULATION_KEY_SCHEMA_VERSION,
    organizationId: input.target.organizationId,
    scope: input.target.scope,
    clientId: input.target.clientId ?? null,
    buildingId: input.target.buildingId ?? null,
    capabilityCode: input.capabilityCode,
    metricCode: input.metricCode,
    metricVersion: input.metricVersion,
    policyVersion: input.policyVersion,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    timezone: input.timezone,
    sourceFingerprint: input.sourceFingerprint,
  });

export const canonicalJson = canonical;
