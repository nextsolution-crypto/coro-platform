import {
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  AuthenticatedDeviceRequestDto,
  ConfirmDisplaySyncDto,
  DeviceChallengeDto,
  DeviceTelemetryDto,
  EnrollDisplayDeviceDto,
} from './dto/device-gateway.dto';
import { DeviceGatewayService } from './device-gateway.service';

@Controller('device-gateway')
@Throttle({ short: { limit: 30, ttl: 60_000 } })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DeviceGatewayController {
  constructor(private readonly gateway: DeviceGatewayService) {}

  @Post('enroll')
  @HttpCode(200)
  enroll(@Body() dto: EnrollDisplayDeviceDto) {
    return this.gateway.enroll(dto);
  }

  @Post('challenge')
  @HttpCode(200)
  challenge(@Body() dto: DeviceChallengeDto) {
    return this.gateway.challenge(dto);
  }

  @Post('manifest')
  @HttpCode(200)
  manifest(@Body() dto: AuthenticatedDeviceRequestDto) {
    return this.gateway.manifest(dto);
  }

  @Post('renders/:publicationId')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  async render(
    @Param('publicationId') publicationId: string,
    @Body() dto: AuthenticatedDeviceRequestDto,
    @Res() response: Response,
  ) {
    const result = await this.gateway.render(dto, publicationId);
    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('X-Content-SHA256', result.sha256);
    response.setHeader('Content-Length', result.bytes.length);
    response.send(result.bytes);
  }

  @Post('sync/confirm')
  @HttpCode(200)
  confirm(@Body() dto: ConfirmDisplaySyncDto) {
    return this.gateway.confirm(dto);
  }

  @Post('telemetry')
  @HttpCode(202)
  telemetry(@Body() dto: DeviceTelemetryDto) {
    return this.gateway.telemetry(dto);
  }
}
