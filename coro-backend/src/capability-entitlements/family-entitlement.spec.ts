import { capabilityEnforcementMode, familyForClientPortalPath } from './family-entitlement';
import { FamilyEntitlementService } from './family-entitlement.service';

describe('M11-01 — contrôle de droit par famille', () => {
  afterEach(() => delete process.env.CAPABILITY_ENFORCEMENT);

  it('classe les routes du portail par famille', () => {
    expect(familyForClientPortalPath('/api/client-portal/buildings/b1/sentinelle/employees')).toEqual({ family: 'SENTINELLE', buildingId: 'b1' });
    expect(familyForClientPortalPath('/api/client-portal/buildings/b1/population/scenarios?x=1')).toEqual({ family: 'SENTINELLE_POPULATION', buildingId: 'b1' });
    expect(familyForClientPortalPath('/api/client-portal/intelligence/overview')).toEqual({ family: 'SENTINELLE', buildingId: null });
    expect(familyForClientPortalPath('/api/client-portal/projects')).toBeNull();
  });

  it('ne bloque jamais une action de sécurité des personnes', () => {
    for (const path of [
      '/api/client-portal/buildings/b1/panic',
      '/api/client-portal/buildings/b1/panic/p1',
      '/api/client-portal/incidents/trigger',
      '/api/client-portal/incidents/buildings/b1/active',
      '/api/client-portal/buildings/b1/sentinelle/evacuation/trigger',
      '/api/client-portal/buildings/b1/sentinelle/evacuation/active',
      '/api/client-portal/buildings/b1/sentinelle/evacuations/e1/account',
      '/api/client-portal/buildings/b1/population/alerts/a1/end',
      '/api/client-portal/buildings/b1/population/alerts/a1/cancel',
    ])
      expect(familyForClientPortalPath(path)).toBeNull();
  });

  it('mode audit par défaut, application explicite seulement', () => {
    expect(capabilityEnforcementMode()).toBe('AUDIT');
    process.env.CAPABILITY_ENFORCEMENT = 'enforce';
    expect(capabilityEnforcementMode()).toBe('ENFORCE');
  });

  it('accepte un droit au niveau du site, du client ou de l’organisation', async () => {
    const effective = { availability: { isAvailable: true }, licensed: true, enabled: true, effectiveState: 'EFFECTIVE' };
    const none = { availability: { isAvailable: true }, licensed: false, enabled: false, effectiveState: 'EXPIRED' };
    const resolver = { resolve: jest.fn().mockResolvedValueOnce(none).mockResolvedValueOnce(none).mockResolvedValueOnce(effective) };
    const prisma = { building: { findFirst: jest.fn().mockResolvedValue({ id: 'b1' }) } };
    const service = new FamilyEntitlementService(prisma as any, resolver as any);
    await expect(service.isEntitled({ organizationId: 'o', clientId: 'c', family: 'SENTINELLE', buildingId: 'b1' })).resolves.toBe(true);
    expect(resolver.resolve).toHaveBeenNthCalledWith(1, expect.objectContaining({ clientId: 'c', buildingId: 'b1' }));
    expect(resolver.resolve).toHaveBeenNthCalledWith(3, { organizationId: 'o', capabilityCode: 'SENTINELLE' });
  });

  it('refuse sans droit et en cas d’erreur', async () => {
    const resolver = { resolve: jest.fn().mockRejectedValue(new Error('NO_CAPABILITY')) };
    const service = new FamilyEntitlementService({ building: { findFirst: jest.fn() } } as any, resolver as any);
    await expect(service.isEntitled({ organizationId: 'o', clientId: 'c', family: 'INCIDENT' })).resolves.toBe(false);
  });
});
