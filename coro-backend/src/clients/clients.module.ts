import { Module } from '@nestjs/common';
import { ClientsController, PlatformClientAdministrationController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientPortalModule } from '../client-portal/client-portal.module';

@Module({
  imports: [ClientPortalModule],
  controllers: [ClientsController, PlatformClientAdministrationController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
