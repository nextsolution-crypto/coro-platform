import { CapabilityCode } from '@prisma/client';
import { COMMERCIAL_FAMILY_REGISTRY } from '../commercial-simulator/commercial-family.registry';
import { FIRST_WAVE_COMPONENTS } from '../commercial-simulator/first-wave-commercial.registry';

export const COMMERCIAL_FUNCTIONAL_FEATURES = Object.freeze([
  'CLIENTS_BUILDINGS',
  'COMPLIANCE_DOCUMENTS',
  'PMU_PSI_PCA',
  'PROJECTS_MANDATES',
  'ACTIVITIES_TASKS_ASSIGNMENTS',
  'BOOKING',
  'PLANNER_AVAILABILITY',
  'EXERCISES_SIMULATIONS',
  'EXERCISE_REPORTS',
  'REX',
  'CORRECTIVE_ACTIONS',
  'CLIENT_PORTAL',
  'USER_ROLE_MANAGEMENT',
  'PERFORMANCE_CORO_INDEX',
  'BUILDING_BRIDGE',
] as const);

const targets = {
  FAMILY: new Set<string>(COMMERCIAL_FAMILY_REGISTRY.map((item) => item.code)),
  CAPABILITY: new Set<string>(Object.values(CapabilityCode)),
  COMPONENT: new Set<string>(Object.keys(FIRST_WAVE_COMPONENTS)),
  FUNCTIONAL_FEATURE: new Set<string>(COMMERCIAL_FUNCTIONAL_FEATURES),
};

export function isKnownCommercialContentTarget(
  type: keyof typeof targets,
  code: string,
) {
  return targets[type].has(code);
}
