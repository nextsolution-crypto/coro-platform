import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../client-portal/email.service';
import { OrganizationUserInvitationOutboxService } from './organization-user-invitation-outbox.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, EmailService, OrganizationUserInvitationOutboxService],
  exports: [UsersService],
})
export class UsersModule {}
