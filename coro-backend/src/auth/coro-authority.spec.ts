import { clientAuthorityFromCanonicalIdentity } from './coro-authority';

describe('typed CORO authority', () => {
  it('derives CLIENT_USER authority from the canonical server identity', () => {
    const authority = clientAuthorityFromCanonicalIdentity({
      id: 'client-user-a',
      clientId: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      sessionVersion: 4,
      operationalPermissions: ['INCIDENT_REPORT_READ'],
      operationalAssignments: [{ buildingId: 'building-a' }],
    });

    expect(authority).toEqual({
      actorType: 'CLIENT_USER',
      actorId: 'client-user-a',
      clientId: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      sessionVersion: 4,
      permissions: ['INCIDENT_REPORT_READ'],
      buildingIds: ['building-a'],
    });
    expect(Object.isFrozen(authority)).toBe(true);
  });

  it('does not accept a browser-declared actor type', () => {
    const authority = clientAuthorityFromCanonicalIdentity({
      id: 'client-user-a',
      clientId: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      sessionVersion: 1,
      operationalPermissions: [],
      operationalAssignments: [],
      actorType: 'USER',
    } as never);

    expect(authority.actorType).toBe('CLIENT_USER');
  });
});
