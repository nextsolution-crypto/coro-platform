import { Module } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { OccupancyController } from './occupancy.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OccupancyController],
  providers: [OccupancyService, PrismaService],
  exports: [OccupancyService],
})
export class OccupancyModule {}