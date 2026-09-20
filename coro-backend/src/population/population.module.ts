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
import { PopulationEvidenceService } from './population-evidence.service';
import { PopulationEvidenceReportService } from './population-evidence-report.service';
import { StorageModule } from '../storage/storage.module';
import {
  POPULATION_ENVIRONMENT,
  PopulationReadinessService,
} from './population-readiness.service';

@Module({
  imports: [GeocodingModule, StorageModule],
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
    PopulationEvidenceService,
    PopulationEvidenceReportService,
  ],
  exports: [
    PopulationService,
    PopulationReadinessService,
    PopulationOperationalEventsService,
    PopulationEvidenceService,
    PopulationEvidenceReportService,
  ],
})
export class PopulationModule {}
