import { Module } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { OccupancyController } from './occupancy.controller';
import { OccupancyEmployeesService } from './occupancy-employees.service';
import { OccupancyEmployeesController } from './occupancy-employees.controller';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OccupancyController, OccupancyEmployeesController, IncidentController],
  providers: [OccupancyService, OccupancyEmployeesService, IncidentService, PrismaService],
  exports: [OccupancyService, OccupancyEmployeesService, IncidentService],
})
export class OccupancyModule {}