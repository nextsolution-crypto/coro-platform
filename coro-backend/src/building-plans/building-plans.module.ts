import { Module } from '@nestjs/common';
import { BuildingPlansController } from './building-plans.controller';
import { BuildingPlansService } from './building-plans.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BuildingPlansController],
  providers: [BuildingPlansService],
  exports: [BuildingPlansService],
})
export class BuildingPlansModule {}