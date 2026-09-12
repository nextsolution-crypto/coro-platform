import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OccupancyModule } from '../occupancy/occupancy.module';

@Module({
  imports: [PrismaModule, OccupancyModule],
  providers: [RemindersService],
})
export class RemindersModule {}