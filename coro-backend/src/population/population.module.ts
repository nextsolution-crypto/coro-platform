import { Module } from '@nestjs/common';
import { PopulationPublicController } from './population-public.controller';
import { PopulationService } from './population.service';
import { PopulationGeospatialService } from './population-geospatial.service';
import { PopulationDeliveryService } from './population-delivery.service';

@Module({
  controllers: [PopulationPublicController],
  providers: [
  PopulationService,
  PopulationGeospatialService,
  PopulationDeliveryService,
],
  exports: [PopulationService],
})
export class PopulationModule {}