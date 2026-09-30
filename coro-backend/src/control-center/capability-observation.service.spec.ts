/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { CapabilityObservationService } from './capability-observation.service';

describe('CapabilityObservationService', () => {
  it('uses one bounded transaction for all nine capabilities', async () => {
    const counts = Array.from({ length: 11 }, () => Promise.resolve(0));
    const prisma = {
      $transaction: jest.fn().mockResolvedValue(Array(11).fill(0)),
      project: { count: jest.fn() },
      projectActivity: { count: jest.fn() },
      booking: { count: jest.fn() },
      exerciseReport: { count: jest.fn() },
      timelogEntry: { count: jest.fn() },
      incidentEvent: { count: jest.fn() },
      occupancyRecord: { count: jest.fn() },
      populationProgram: { count: jest.fn() },
      populationSubscriber: { count: jest.fn() },
      populationAlertDelivery: { count: jest.fn() },
    } as any;
    Object.values(prisma).forEach((value: any) =>
      value?.count?.mockReturnValue(Promise.resolve(0)),
    );
    const result = await new CapabilityObservationService(
      prisma,
    ).observeOrganization('org');
    expect(Object.keys(result)).toHaveLength(9);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(counts).toHaveLength(11);
    expect(result.AI.configured.quality).toBe('NOT_AVAILABLE');
    expect(result.SENTINELLE_POPULATION.configured.quality).toBe('CANONICAL');
  });
});
