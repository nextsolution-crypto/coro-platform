import { Module } from '@nestjs/common';
import { CustomProceduresController } from './custom-procedures.controller';
import { CustomProceduresService } from './custom-procedures.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomProceduresController],
  providers: [CustomProceduresService],
  exports: [CustomProceduresService],
})
export class CustomProceduresModule {}