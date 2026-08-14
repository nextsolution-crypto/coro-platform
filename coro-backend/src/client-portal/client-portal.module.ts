import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [
    PrismaModule,
    ExportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'coro-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ClientPortalController, ClientAuthController],
  providers: [ClientPortalService, ClientAuthService, EmailService],
  exports: [ClientPortalService, EmailService],
})
export class ClientPortalModule {}