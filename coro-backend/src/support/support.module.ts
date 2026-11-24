import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/auth-security.config';
import { EmailService } from '../client-portal/email.service';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { DemoEnvironmentModule } from '../demo-environment/demo-environment.module';
import { IncidentReportAttachmentScanner } from '../incident-reports/incident-report-attachment-scanner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SupportClientController } from './support-client.controller';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    DemoEnvironmentModule,
    // ClientJwtGuard (portail) exige JwtModule dans le module qui l'utilise.
    JwtModule.register({ secret: requireJwtSecret(), signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [SupportController, SupportClientController],
  providers: [SupportService, EmailService, IncidentReportAttachmentScanner, ClientJwtGuard],
})
export class SupportModule {}
