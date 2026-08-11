import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'coro-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ClientPortalController, ClientAuthController],
  providers: [ClientPortalService, ClientAuthService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}