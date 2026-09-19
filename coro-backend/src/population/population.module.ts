import { Module } from '@nestjs/common';
import { PopulationPublicController } from './population-public.controller';
import { PopulationService } from './population.service';
import { PopulationGeospatialService } from './population-geospatial.service';
import { PopulationDeliveryService } from './population-delivery.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { PopulationReadinessController } from './population-readiness.controller';
import { PopulationBrevoWebhookController } from './population-brevo-webhook.controller';
import { PopulationBrevoWebhookService } from './population-brevo-webhook.service';
import { PopulationOperationalEventsService } from './population-operational-events.service';
import {
  POPULATION_ENVIRONMENT,
  PopulationReadinessService,
} from './population-readiness.service';

@Module({
  imports: [GeocodingModule],
  controllers: [
    PopulationPublicController,
    PopulationReadinessController,
    PopulationBrevoWebhookController,
  ],
  providers: [
    PopulationService,
    PopulationGeospatialService,
    PopulationDeliveryService,
    {
      provide: POPULATION_ENVIRONMENT,
      useFactory: () => process.env,
    },
    PopulationReadinessService,
    PopulationBrevoWebhookService,
    PopulationOperationalEventsService,
  ],
  exports: [
    PopulationService,
    PopulationReadinessService,
    PopulationOperationalEventsService,
  ],
})
export class PopulationModule {}
