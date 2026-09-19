import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { PopulationModule } from './population.module';
import { PopulationReadinessService } from './population-readiness.service';
import { PopulationBrevoWebhookService } from './population-brevo-webhook.service';
import { PopulationOperationalEventsService } from './population-operational-events.service';

describe('PopulationModule dependency injection', () => {
  it('compiles and resolves PopulationReadinessService through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, PopulationModule],
    }).compile();

    expect(moduleRef.get(PopulationReadinessService)).toBeInstanceOf(
      PopulationReadinessService,
    );
    expect(moduleRef.get(PopulationBrevoWebhookService)).toBeInstanceOf(
      PopulationBrevoWebhookService,
    );
    expect(moduleRef.get(PopulationOperationalEventsService)).toBeInstanceOf(
      PopulationOperationalEventsService,
    );

    await moduleRef.close();
  });
});
