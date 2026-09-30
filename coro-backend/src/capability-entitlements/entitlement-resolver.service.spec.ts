/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { EntitlementResolver } from './entitlement-resolver.service';

describe('EntitlementResolver batch mode', () => {
  it('uses one capability query and one grant query for nine capabilities', async () => {
    const capabilities = [
      'COMPLIANCE_OPERATIONS',
      'PERFORMANCE',
      'INCIDENT',
      'KNOWLEDGE',
      'AI',
      'NETWORK',
      'SENTINELLE',
      'SENTINELLE_POPULATION',
      'CAMPUS',
    ].map((code) => ({
      id: code,
      code,
      lifecycle: code === 'NETWORK' || code === 'CAMPUS' ? 'FUTURE' : 'CURRENT',
      isAvailable: code !== 'NETWORK' && code !== 'CAMPUS',
    }));
    const prisma = {
      commercialCapability: {
        findMany: jest.fn().mockResolvedValue(capabilities),
      },
      capabilityEntitlement: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const result = await new EntitlementResolver(prisma).resolveMany({
      organizationId: 'org',
      capabilityCodes: capabilities.map((item) => item.code) as any,
      atTime: new Date('2026-01-01T00:00:00Z'),
    });
    expect(Object.keys(result)).toHaveLength(9);
    expect(prisma.commercialCapability.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.capabilityEntitlement.findMany).toHaveBeenCalledTimes(1);
  });
});
