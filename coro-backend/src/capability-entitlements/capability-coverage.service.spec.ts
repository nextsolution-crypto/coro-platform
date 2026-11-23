import { CapabilityCoverageService, COVERAGE_OFFERS } from './capability-coverage.service';

const resolution = (ok: boolean) => ({
  availability: { isAvailable: ok },
  licensed: ok,
  enabled: ok,
  effectiveState: ok ? 'EFFECTIVE' : 'NONE',
});

describe('CapabilityCoverageService (M8-07)', () => {
  const prisma: any = {
    client: {
      findMany: jest.fn(async () => [
        {
          id: 'client-a',
          name: 'Client A',
          buildings: [
            { id: 'b1', name: 'Tour 1' },
            { id: 'b2', name: 'Tour 2' },
          ],
        },
      ]),
    },
  };

  it('résout par bâtiment, client et organisation, et signale les écarts avec le site', async () => {
    const resolver: any = {
      resolve: jest.fn(async (input: any) => {
        // Sentinelle sur le bâtiment b1 seulement ; Poste de sécurité au niveau client.
        if (input.capabilityCode === 'SENTINELLE') return resolution(input.buildingId === 'b1');
        if (input.capabilityCode === 'SECURITY_WORKSTATION') return resolution(input.clientId === 'client-a' && !input.buildingId);
        if (input.capabilityCode === 'NETWORK') throw new Error('unknown capability');
        return resolution(false);
      }),
    };
    delete process.env.INCIDENT_REPORTS_ENABLED;
    const report = await new CapabilityCoverageService(prisma, resolver).coverage('org-1');
    const client = report.clients[0];
    expect(client.offers.SENTINELLE).toBe(false);
    expect(client.buildings.find((b) => b.id === 'b1')!.offers.SENTINELLE).toBe(true);
    expect(client.buildings.find((b) => b.id === 'b2')!.offers.SENTINELLE).toBe(false);
    expect(client.offers.SECURITY_WORKSTATION).toBe(true);
    expect(client.buildings.every((b) => b.offers.SECURITY_WORKSTATION)).toBe(true);
    expect(client.offers.NETWORK).toBe(false);

    const kinds = report.gaps.map((gap) => `${gap.offer}:${gap.kind}`);
    expect(kinds).toContain('INCIDENT:PROMISED_NOT_ACTIVE');
    expect(kinds).toContain('SECURITY_WORKSTATION:ACTIVE_NOT_ON_SITE');
    expect(kinds).toContain('SECURITY_WORKSTATION:LICENSED_NOT_DEPLOYED');
    expect(kinds).not.toContain('SENTINELLE:PROMISED_NOT_ACTIVE');
    expect(report.offers).toHaveLength(COVERAGE_OFFERS.length);
  });

  it('ne fait que lire', async () => {
    const resolver: any = { resolve: jest.fn(async () => resolution(false)) };
    await new CapabilityCoverageService(prisma, resolver).coverage('org-1');
    expect(Object.keys(prisma)).toEqual(['client']);
    expect(Object.keys(prisma.client)).toEqual(['findMany']);
  });
});
