import { Module } from '@nestjs/common';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { ValidationService } from './validation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GeneratorController],
  providers: [GeneratorService, ValidationService],
  exports: [GeneratorService, ValidationService],
})
export class GeneratorModule {}