import { Module } from '@nestjs/common';
import { PopulationPublicController } from './population-public.controller';
import { PopulationService } from './population.service';
import { PopulationGeospatialService } from './population-geospatial.service';
import { PopulationDeliveryService } from './population-delivery.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { PopulationReadinessController } from './population-readiness.controller';
import {
  POPULATION_ENVIRONMENT,
  PopulationReadinessService,
} from './population-readiness.service';

@Module({
  imports: [GeocodingModule],
  controllers: [PopulationPublicController, PopulationReadinessController],
  providers: [
  PopulationService,
  PopulationGeospatialService,
  PopulationDeliveryService,
  {
    provide: POPULATION_ENVIRONMENT,
    useFactory: () => process.env,
  },
  PopulationReadinessService,
],
  exports: [PopulationService, PopulationReadinessService],
})
export class PopulationModule {}
