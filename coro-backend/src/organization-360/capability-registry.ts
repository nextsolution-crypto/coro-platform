export type CapabilityLifecycle = 'CURRENT' | 'FUTURE';
export type PlatformAvailability = 'AVAILABLE' | 'NOT_AVAILABLE';

export type CapabilityDefinition = Readonly<{
  code:
    | 'COMPLIANCE_OPERATIONS'
    | 'PERFORMANCE'
    | 'INCIDENT'
    | 'KNOWLEDGE'
    | 'AI'
    | 'NETWORK'
    | 'SENTINELLE'
    | 'SENTINELLE_POPULATION'
    | 'CAMPUS';
  label: string;
  platformAvailability: PlatformAvailability;
  lifecycle: CapabilityLifecycle;
}>;

export const CAPABILITY_REGISTRY: readonly CapabilityDefinition[] =
  Object.freeze([
    {
      code: 'COMPLIANCE_OPERATIONS',
      label: 'Compliance & Operations',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'PERFORMANCE',
      label: 'Performance',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'INCIDENT',
      label: 'Incident',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'KNOWLEDGE',
      label: 'Knowledge',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'AI',
      label: 'AI',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'NETWORK',
      label: 'Network',
      platformAvailability: 'NOT_AVAILABLE',
      lifecycle: 'FUTURE',
    },
    {
      code: 'SENTINELLE',
      label: 'Sentinelle',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'SENTINELLE_POPULATION',
      label: 'Sentinelle Population',
      platformAvailability: 'AVAILABLE',
      lifecycle: 'CURRENT',
    },
    {
      code: 'CAMPUS',
      label: 'Campus',
      platformAvailability: 'NOT_AVAILABLE',
      lifecycle: 'FUTURE',
    },
  ]);
