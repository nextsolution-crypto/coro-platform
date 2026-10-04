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
import { PopulationReadinessService } from './population-readiness.service';
import { POPULATION_ENVIRONMENT } from './population-environment';
import { PopulationContactCryptoService } from './population-contact-crypto.service';
import { PhoneNumberService } from '../common/phone/phone-number.service';
import { PopulationBrevoSmsWebhookController } from './population-brevo-sms-webhook.controller';
import { PopulationBrevoSmsWebhookService } from './population-brevo-sms-webhook.service';
import { PopulationSmsSuppressionService } from './population-sms-suppression.service';

@Module({
  imports: [GeocodingModule, StorageModule],
  controllers: [
    PopulationPublicController,
    PopulationReadinessController,
    PopulationBrevoWebhookController,
    PopulationBrevoSmsWebhookController,
  ],
  providers: [
    PopulationService,
    PhoneNumberService,
    PopulationGeospatialService,
    PopulationDeliveryService,
    {
      provide: POPULATION_ENVIRONMENT,
      useFactory: () => process.env,
    },
    PopulationReadinessService,
    PopulationContactCryptoService,
    PopulationBrevoWebhookService,
    PopulationBrevoSmsWebhookService,
    PopulationSmsSuppressionService,
    PopulationOperationalEventsService,
    PopulationEvidenceService,
    PopulationEvidenceReportService,
  ],
  exports: [
    PopulationService,
    PopulationReadinessService,
    PopulationContactCryptoService,
    PopulationOperationalEventsService,
    PopulationEvidenceService,
    PopulationEvidenceReportService,
  ],
})
export class PopulationModule {}
