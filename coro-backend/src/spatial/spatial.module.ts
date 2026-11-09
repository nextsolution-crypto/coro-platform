import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialAuthorizationService } from './spatial-authorization.service';
import { SpatialController } from './spatial.controller';
import { SpatialService } from './spatial.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [SpatialController],
  providers: [SpatialService, SpatialAuthorizationService],
  exports: [SpatialService, SpatialAuthorizationService],
})
export class SpatialModule {}
