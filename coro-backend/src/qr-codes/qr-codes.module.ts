import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QrCodesController } from './qr-codes.controller';
import { QrCodesService } from './qr-codes.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [QrCodesController],
  providers: [QrCodesService],
})
export class QrCodesModule {}
