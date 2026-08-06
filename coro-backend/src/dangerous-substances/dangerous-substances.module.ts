import { Module } from '@nestjs/common';
import { DangerousSubstancesController } from './dangerous-substances.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DangerousSubstancesController],
})
export class DangerousSubstancesModule {}