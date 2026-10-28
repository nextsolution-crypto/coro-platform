import { Module } from '@nestjs/common';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GeneratorModule } from '../generator/generator.module';

@Module({
  imports: [PrismaModule, GeneratorModule],
  controllers: [VersionsController],
  providers: [VersionsService],
})
export class VersionsModule {}
