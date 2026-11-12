import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';
import {
  DISPLAY_MANIFEST_SIGNER,
  EnvironmentManifestSigner,
} from './manifest-signer';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [DeviceGatewayController],
  providers: [
    DeviceGatewayService,
    EnvironmentManifestSigner,
    {
      provide: DISPLAY_MANIFEST_SIGNER,
      useExisting: EnvironmentManifestSigner,
    },
  ],
  exports: [DeviceGatewayService, DISPLAY_MANIFEST_SIGNER],
})
export class DisplayDeviceModule {}
