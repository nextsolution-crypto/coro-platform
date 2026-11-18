import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationalDirectivesAccessService } from './operational-directives-access.service';
import { OperationalDirectivesController } from './operational-directives.controller';
import { OperationalDirectivesService } from './operational-directives.service';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';

@Module({
  imports: [PrismaModule, CapabilityEntitlementsModule],
  controllers: [OperationalDirectivesController],
  providers: [OperationalDirectivesService, OperationalDirectivesAccessService],
  exports: [OperationalDirectivesService],
})
export class OperationalDirectivesModule {}
