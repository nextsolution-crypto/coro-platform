import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { requireJwtSecret } from '../auth/auth-security.config';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CustomerNetworkAdminController,
  CustomerNetworkClientController,
} from './customer-network.controller';
import { CustomerNetworkService } from './customer-network.service';

@Module({
  imports: [
    PrismaModule,
    AdminAuditModule,
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    CustomerNetworkAdminController,
    CustomerNetworkClientController,
  ],
  providers: [CustomerNetworkService, ClientJwtGuard],
  exports: [CustomerNetworkService],
})
export class CustomerNetworkModule {}
