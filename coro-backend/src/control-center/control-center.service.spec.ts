/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { ControlCenterService } from './control-center.service';

describe('ControlCenterService', () => {
  it('returns observation-only, non-enforcing read models with one asOf', async () => {
    const prisma = {
      $transaction: jest
        .fn()
        .mockResolvedValue([
          1,
          2,
          [],
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          [],
          [],
        ]),
      organization: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      commercialProposal: { count: jest.fn() },
      organizationContract: { count: jest.fn() },
      capabilityEntitlementRevision: { count: jest.fn() },
      capabilityEntitlement: { count: jest.fn() },
      building: { count: jest.fn() },
      incidentEvent: { count: jest.fn() },
      populationProgram: { count: jest.fn() },
      correctiveAction: { count: jest.fn() },
      adminAuditEvent: { findMany: jest.fn() },
      meteringResult: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const operationalState = {
      incident: jest
        .fn()
        .mockResolvedValue({ count: 12, quality: 'CANONICAL' }),
      evacuation: jest
        .fn()
        .mockResolvedValue({ count: 0, quality: 'CANONICAL' }),
      population: jest
        .fn()
        .mockResolvedValue({ operation: { count: 0, quality: 'CANONICAL' } }),
    } as any;
    const asOf = new Date('2026-01-01T00:00:00Z');
    const result = await new ControlCenterService(
      prisma,
      operationalState,
    ).overview(asOf, 10, 30);
    expect(result).toMatchObject({
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
    });
  });
});
