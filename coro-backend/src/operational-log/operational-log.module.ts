import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationalLogAccessService } from './operational-log-access.service';
import { OperationalLogController } from './operational-log.controller';
import { OperationalLogService } from './operational-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperationalLogController],
  providers: [OperationalLogService, OperationalLogAccessService],
  exports: [OperationalLogService],
})
export class OperationalLogModule {}
