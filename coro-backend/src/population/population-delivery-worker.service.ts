import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PopulationAlertStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  POPULATION_DELIVERY_DEFAULT_BATCH_SIZE,
  POPULATION_DELIVERY_MAX_BATCH_SIZE,
  PopulationService,
} from './population.service';

const DEFAULT_ALERTS_PER_TICK = 4;
const MAX_ALERTS_PER_TICK = 20;

function boundedInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

@Injectable()
export class PopulationDeliveryWorkerService {
  private readonly logger = new Logger(PopulationDeliveryWorkerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly population: PopulationService,
  ) {}

  /**
   * Continue les campagnes deja autorisees et placees en SENDING.
   *
   * Les claims compare-and-set de PopulationService demeurent l'autorite
   * anti-double-envoi. Le verrou local evite qu'un tick lent se chevauche
   * avec le suivant dans un meme processus; plusieurs replicas peuvent
   * cooperer sans reclamer deux fois la meme livraison.
   */
  @Cron('*/5 * * * * *')
  async processTick(): Promise<void> {
    if (process.env.POPULATION_DELIVERY_WORKER_ENABLED === 'false') return;
    if (this.running) return;

    this.running = true;
    try {
      const batchSize = boundedInteger(
        process.env.POPULATION_DELIVERY_BATCH_SIZE,
        POPULATION_DELIVERY_DEFAULT_BATCH_SIZE,
        POPULATION_DELIVERY_MAX_BATCH_SIZE,
      );
      const alertLimit = boundedInteger(
        process.env.POPULATION_DELIVERY_ALERTS_PER_TICK,
        DEFAULT_ALERTS_PER_TICK,
        MAX_ALERTS_PER_TICK,
      );

      const alerts = await this.prisma.populationAlert.findMany({
        where: { status: PopulationAlertStatus.SENDING },
        orderBy: [{ sendingAt: 'asc' }, { id: 'asc' }],
        take: alertLimit,
        select: {
          id: true,
          programId: true,
          program: {
            select: {
              rueFacilityProfile: { select: { buildingId: true } },
            },
          },
        },
      });

      for (const alert of alerts) {
        try {
          await this.population.processSendingAlertBatch(
            alert.program.rueFacilityProfile.buildingId,
            alert.id,
            alert.programId,
            batchSize,
          );
        } catch (error) {
          // Ne jamais journaliser une destination, un message ou un payload.
          this.logger.error(
            `Population delivery batch failed for alert ${alert.id}`,
            error instanceof Error ? error.message : 'unknown error',
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
