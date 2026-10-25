import { Module } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { OccupancyController } from './occupancy.controller';
import { OccupancyEmployeesService } from './occupancy-employees.service';
import { OccupancyEmployeesController } from './occupancy-employees.controller';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PopulationModule } from '../population/population.module';
import { IncidentNotificationDispatcherService } from './incident-notification-dispatcher.service';
import { PresenceFlowService } from './presence-flow.service';

@Module({
  imports: [PopulationModule],
  controllers: [
    OccupancyController,
    OccupancyEmployeesController,
    IncidentController,
  ],
  providers: [
    OccupancyService,
    OccupancyEmployeesService,
    PresenceFlowService,
    IncidentService,
    IncidentNotificationDispatcherService,
    PrismaService,
  ],
  exports: [
    OccupancyService,
    OccupancyEmployeesService,
    PresenceFlowService,
    IncidentService,
    IncidentNotificationDispatcherService,
  ],
})
export class OccupancyModule {}
