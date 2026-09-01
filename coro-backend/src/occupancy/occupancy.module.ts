import { Module } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { OccupancyController } from './occupancy.controller';
import { OccupancyEmployeesService } from './occupancy-employees.service';
import { OccupancyEmployeesController } from './occupancy-employees.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OccupancyController, OccupancyEmployeesController],
  providers: [OccupancyService, OccupancyEmployeesService, PrismaService],
  exports: [OccupancyService, OccupancyEmployeesService],
})
export class OccupancyModule {}