import { CapabilityCode } from '@prisma/client';

/** M11-01 — one contract check for every family sold as an option. */
export type EnforcementMode = 'OFF' | 'AUDIT' | 'ENFORCE';

export function capabilityEnforcementMode(): EnforcementMode {
  const value = process.env.CAPABILITY_ENFORCEMENT?.trim().toUpperCase();
  return value === 'OFF' || value === 'ENFORCE' ? value : 'AUDIT';
}

export const ENFORCED_FAMILIES = [
  'SENTINELLE',
  'SENTINELLE_POPULATION',
  'INCIDENT',
] as const satisfies readonly CapabilityCode[];
export type EnforcedFamily = (typeof ENFORCED_FAMILIES)[number];

/**
 * Life-safety actions are never blocked by a billing check: raising or
 * accounting an evacuation, panic, triggering an incident, reading what is
 * active right now, ending or cancelling a population alert.
 */
const LIFE_SAFETY = [
  /^buildings\/[^/]+\/panic(\/|$)/,
  /^incidents\/trigger$/,
  /^incidents\/buildings\/[^/]+\/active(-all)?$/,
  /^buildings\/[^/]+\/sentinelle\/evacuation\/(active|trigger)$/,
  /^buildings\/[^/]+\/sentinelle\/evacuations\/[^/]+\/(account|resolve)$/,
  /^buildings\/[^/]+\/population\/alerts\/[^/]+\/(end|cancel)$/,
  /^buildings\/[^/]+\/population\/operational-events\/active$/,
];

const FAMILY_ROUTES: Array<[RegExp, EnforcedFamily]> = [
  [/^buildings\/[^/]+\/population(\/|$)/, 'SENTINELLE_POPULATION'],
  [/^buildings\/[^/]+\/sentinelle(\/|$)/, 'SENTINELLE'],
  [/^buildings\/[^/]+\/resilience-(history|snapshot)$/, 'SENTINELLE'],
  [/^intelligence(\/|$)/, 'SENTINELLE'],
  [/^incidents(\/|$)/, 'INCIDENT'],
];

/** Family a client-portal route belongs to, or null (not gated / life safety). */
export function familyForClientPortalPath(path: string): {
  family: EnforcedFamily;
  buildingId: string | null;
} | null {
  const match = /\/client-portal\/(.+?)\/?(\?.*)?$/.exec(path);
  if (!match) return null;
  const relative = match[1];
  if (LIFE_SAFETY.some((rule) => rule.test(relative))) return null;
  const entry = FAMILY_ROUTES.find(([rule]) => rule.test(relative));
  if (!entry) return null;
  const building = /^(?:incidents\/)?buildings\/([^/]+)/.exec(relative);
  return { family: entry[1], buildingId: building?.[1] ?? null };
}
