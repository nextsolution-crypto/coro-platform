/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { Organization360Service } from './organization-360.service';

describe('Organization360Service observation boundaries', () => {
  const organization = {
    id: 'org-a',
    name: 'A',
    isInternal: false,
    licenseType: 'STANDARD',
    isActive: true,
    sector: null,
    employeeCount: null,
    operatingHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('force le filtre organizationId cible et redacte les événements', async () => {
    const event = {
      id: 'evt',
      actorUserId: 'actor',
      actorDisplayName: 'Admin',
      actorRole: 'SUPER_ADMIN',
      action: 'TEST',
      targetType: 'User',
      targetId: 'u',
      targetLabel: 'private.user@example.test',
      organizationId: 'org-a',
      reason: null,
      requestId: 'req',
      beforeData: { password: 'hash' },
      afterData: { role: 'ADMIN' },
      schemaVersion: 1,
      createdAt: new Date(),
    };
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue(organization) },
      adminAuditEvent: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([event]),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as any;
    const result = await new Organization360Service(prisma).auditEvents(
      'org-a',
      { page: 1, pageSize: 25, order: 'desc' },
    );
    expect(prisma.adminAuditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-a' }),
      }),
    );
    expect(result.items[0]).toMatchObject({
      targetLabel: 'pri***@example.test',
      beforeData: { password: '[REDACTED]' },
    });
    expect(result.readOnly).toBe(true);
  });

  it('distingue signaux observés et entitlement commercial', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue(organization) },
      project: { count },
      projectActivity: { count },
      booking: { count },
      exerciseReport: { count },
      timelogEntry: { count },
      incidentEvent: { count },
      building: { count },
      occupancyRecord: { count },
      populationProgram: { count },
      populationSubscriber: { count },
      populationAlertDelivery: { count },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as any;
    const result = await new Organization360Service(prisma).capabilities(
      'org-a',
    );
    expect(result).toHaveLength(9);
    expect(
      result.every(
        (item) =>
          item.commercialEntitlement === 'NOT_CONFIGURED' &&
          item.observationOnly,
      ),
    ).toBe(true);
    expect(
      result.find((item) => item.code === 'SENTINELLE_POPULATION')
        ?.observedSignals,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PROGRAMS',
          classification: 'CANONICAL',
        }),
      ]),
    );
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'org-a' } }),
    );
  });

  it('marque toute métrique inférée comme non facturable', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue(organization) },
      user: { count },
      client: { count },
      project: { count },
      projectActivity: { count },
      booking: { count },
      exerciseReport: { count },
      timelogEntry: { count },
      incidentEvent: { count },
      building: { count },
      occupancyRecord: { count },
      populationProgram: { count },
      populationSubscriber: { count },
      populationAlertDelivery: { count },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as any;
    const result = await new Organization360Service(prisma).usage('org-a');
    expect(
      result.metrics
        .filter((metric) => metric.classification === 'INFERRED')
        .every((metric) => !metric.billable && !metric.billingUsage),
    ).toBe(true);
    expect(
      result.metrics
        .filter((metric) => metric.classification === 'NOT_AVAILABLE')
        .every((metric) => metric.value === null),
    ).toBe(true);
  });
});
