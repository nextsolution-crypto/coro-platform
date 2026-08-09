import { Module } from '@nestjs/common';
import { MandateController } from './mandate.controller';
import { MandateService } from './mandate.service';
import { RendementController } from './rendement.controller';
import { PortfolioController } from './portfolio.controller';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MandateController, RendementController, PortfolioController, CapacityController],
  providers: [MandateService, CapacityService],
  exports: [MandateService],
})
export class MandateModule {}