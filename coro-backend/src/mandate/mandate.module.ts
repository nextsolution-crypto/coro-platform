import { Module } from '@nestjs/common';
import { MandateController } from './mandate.controller';
import { MandateService } from './mandate.service';
import { RendementController } from './rendement.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MandateController, RendementController],
  providers: [MandateService],
  exports: [MandateService],
})
export class MandateModule {}