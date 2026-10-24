import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/auth-security.config';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import {
  UserManualClientController,
  UserManualInternalController,
} from './user-manual.controller';
import { UserManualService } from './user-manual.service';
@Module({
  imports: [PrismaModule, JwtModule.register({ secret: requireJwtSecret() })],
  controllers: [UserManualInternalController, UserManualClientController],
  providers: [ClientJwtGuard, UserManualService],
})
export class UserManualModule {}
