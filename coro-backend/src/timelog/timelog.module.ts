import { Module } from '@nestjs/common';
import { TimelogController } from './timelog.controller';
import { TimelogService } from './timelog.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimelogController],
  providers: [TimelogService],
  exports: [TimelogService],
})
export class TimelogModule {}