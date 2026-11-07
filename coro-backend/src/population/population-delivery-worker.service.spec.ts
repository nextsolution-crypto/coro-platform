import { PopulationAlertStatus } from '@prisma/client';
import { PopulationDeliveryWorkerService } from './population-delivery-worker.service';

describe('PopulationDeliveryWorkerService', () => {
  const prisma = {
    populationAlert: { findMany: jest.fn() },
  } as any;
  const population = {
    processSendingAlertBatch: jest.fn(),
  } as any;
  let worker: PopulationDeliveryWorkerService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.POPULATION_DELIVERY_WORKER_ENABLED;
    delete process.env.POPULATION_DELIVERY_BATCH_SIZE;
    delete process.env.POPULATION_DELIVERY_ALERTS_PER_TICK;
    worker = new PopulationDeliveryWorkerService(prisma, population);
  });

  afterEach(() => {
    delete process.env.POPULATION_DELIVERY_WORKER_ENABLED;
    delete process.env.POPULATION_DELIVERY_BATCH_SIZE;
    delete process.env.POPULATION_DELIVERY_ALERTS_PER_TICK;
  });

  it('ne traite que les alertes SENDING dans des lots bornes', async () => {
    process.env.POPULATION_DELIVERY_BATCH_SIZE = '1000';
    process.env.POPULATION_DELIVERY_ALERTS_PER_TICK = '1000';
    prisma.populationAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        programId: 'program-1',
        program: { rueFacilityProfile: { buildingId: 'building-1' } },
      },
    ]);

    await worker.processTick();

    expect(prisma.populationAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: PopulationAlertStatus.SENDING },
        take: 20,
      }),
    );
    expect(population.processSendingAlertBatch).toHaveBeenCalledWith(
      'building-1',
      'alert-1',
      'program-1',
      100,
    );
  });

  it('reste desactive explicitement sans toucher la base', async () => {
    process.env.POPULATION_DELIVERY_WORKER_ENABLED = 'false';

    await worker.processTick();

    expect(prisma.populationAlert.findMany).not.toHaveBeenCalled();
  });

  it('isole l echec d une campagne et poursuit les suivantes', async () => {
    prisma.populationAlert.findMany.mockResolvedValue([
      {
        id: 'alert-failed',
        programId: 'program-1',
        program: { rueFacilityProfile: { buildingId: 'building-1' } },
      },
      {
        id: 'alert-ok',
        programId: 'program-2',
        program: { rueFacilityProfile: { buildingId: 'building-2' } },
      },
    ]);
    population.processSendingAlertBatch
      .mockRejectedValueOnce(new Error('controlled failure'))
      .mockResolvedValueOnce({ status: PopulationAlertStatus.SENDING });

    await worker.processTick();

    expect(population.processSendingAlertBatch).toHaveBeenCalledTimes(2);
  });

  it('ignore un tick concurrent dans le meme processus', async () => {
    let release!: () => void;
    prisma.populationAlert.findMany.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve([]);
      }),
    );

    const first = worker.processTick();
    const second = worker.processTick();
    release();
    await Promise.all([first, second]);

    expect(prisma.populationAlert.findMany).toHaveBeenCalledTimes(1);
  });

  it.each([1, 10, 100, 1_000])(
    'vide une campagne simulee de %i livraisons sans doublon',
    async (volume) => {
      process.env.POPULATION_DELIVERY_BATCH_SIZE = '25';
      const pending = Array.from(
        { length: volume },
        (_, index) => `delivery-${index}`,
      );
      const processed = new Set<string>();
      let duplicateCount = 0;

      prisma.populationAlert.findMany.mockImplementation(async () =>
        pending.length > 0
          ? [
              {
                id: 'alert-load',
                programId: 'program-load',
                program: {
                  rueFacilityProfile: { buildingId: 'building-load' },
                },
              },
            ]
          : [],
      );
      population.processSendingAlertBatch.mockImplementation(
        async (
          _buildingId: string,
          _alertId: string,
          _programId: string,
          size: number,
        ) => {
          const claimed = pending.splice(0, size);
          for (const deliveryId of claimed) {
            if (processed.has(deliveryId)) duplicateCount += 1;
            processed.add(deliveryId);
          }
          return {
            status:
              pending.length === 0
                ? PopulationAlertStatus.ACTIVE
                : PopulationAlertStatus.SENDING,
          };
        },
      );

      const startedAt = performance.now();
      while (pending.length > 0) await worker.processTick();
      const elapsedMs = performance.now() - startedAt;

      expect(processed.size).toBe(volume);
      expect(duplicateCount).toBe(0);
      expect(population.processSendingAlertBatch).toHaveBeenCalledTimes(
        Math.ceil(volume / 25),
      );
      // Ce seuil detecte une regression algorithmique locale, pas un SLA fournisseur.
      expect(elapsedMs).toBeLessThan(2_000);
    },
  );
});
