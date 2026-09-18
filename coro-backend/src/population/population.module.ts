import { Module } from '@nestjs/common';
import { PopulationPublicController } from './population-public.controller';
import { PopulationService } from './population.service';
import { PopulationGeospatialService } from './population-geospatial.service';
import { PopulationDeliveryService } from './population-delivery.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { PopulationReadinessController } from './population-readiness.controller';
import { PopulationReadinessService } from './population-readiness.service';

@Module({
  imports: [GeocodingModule],
  controllers: [PopulationPublicController, PopulationReadinessController],
  providers: [
  PopulationService,
  PopulationGeospatialService,
  PopulationDeliveryService,
  PopulationReadinessService,
],
  exports: [PopulationService, PopulationReadinessService],
})
export class PopulationModule {}
