import { Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { sourceFingerprint } from './calculation-identity';
import { MeteringService } from './metering.service';

describe('MeteringService integrity retry', () => {
  it('rejects an exact-source retry when the persisted calculation key differs', async () => {
    const organizationId = '00000000-0000-4000-8000-000000000001';
    const clientId = '00000000-0000-4000-8000-000000000002';
    const buildingId = '00000000-0000-4000-8000-000000000003';
    const periodStart = new Date('2039-01-01T00:00:00.000Z');
    const periodEnd = new Date('2039-02-01T00:00:00.000Z');
    const fingerprint = sourceFingerprint({
      metricCode: 'INCIDENTS_STARTED',
      metricVersion: '1',
      policyVersion: '1',
      target: { organizationId, clientId, buildingId, scope: 'SITE' },
      periodStart,
      periodEnd,
      timezone: 'UTC',
      facts: [],
    });
    const current = {
      id: 'result',
      organizationId,
      clientId,
      buildingId,
      capabilityCode: 'INCIDENT' as const,
      scope: 'SITE' as const,
      metricCode: 'INCIDENTS_STARTED',
      metricVersion: '1',
      policyVersion: '1',
      periodStart,
      periodEnd,
      timezone: 'UTC',
      quantity: new Prisma.Decimal(0),
      unit: 'INCIDENT',
      sourceQuality: 'CANONICAL' as const,
      sourceCount: 0n,
      sourceFingerprint: fingerprint,
      sourceSummary: {
        schemaVersion: '1',
        sourceModels: [],
        contributingRows: '0',
        aggregation: 'COUNT',
        warningCodes: [],
      },
      calculatedAt: new Date(),
      calculationKey: '0'.repeat(64),
      supersedesResultId: null,
      correctionReason: null,
      createdByUserId: null,
      createdByDisplayName: null,
      createdAt: new Date(),
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      incidentEvent: { findMany: jest.fn().mockResolvedValue([]) },
      meteringResult: { findFirst: jest.fn().mockResolvedValue(current) },
    };
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: organizationId }),
      },
      client: { findFirst: jest.fn().mockResolvedValue({ id: clientId }) },
      building: { findFirst: jest.fn().mockResolvedValue({ id: buildingId }) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new MeteringService(prisma, new AdminAuditService());

    await expect(
      service.calculate(
        organizationId,
        {
          metricCode: 'INCIDENTS_STARTED',
          scope: 'SITE',
          clientId,
          buildingId,
          periodStart,
          periodEnd,
          timezone: 'UTC',
        },
        { userId: 'actor', role: 'SUPER_ADMIN' },
      ),
    ).rejects.toMatchObject({
      response: { code: 'CALCULATION_INTEGRITY_CONFLICT' },
    });
  });
});
