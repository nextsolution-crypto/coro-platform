import { Module } from '@nestjs/common';
import { ClientsController, PlatformClientAdministrationController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientPortalModule } from '../client-portal/client-portal.module';
import { ClientInvitationOutboxService } from './client-invitation-outbox.service';

@Module({
  imports: [ClientPortalModule],
  controllers: [ClientsController, PlatformClientAdministrationController],
  providers: [ClientsService, ClientInvitationOutboxService],
  exports: [ClientsService, ClientInvitationOutboxService],
})
export class ClientsModule {}
