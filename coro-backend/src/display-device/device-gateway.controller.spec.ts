import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';

describe('DeviceGatewayController HTTP contracts', () => {
  const gateway = {
    challenge: jest.fn(async () => ({
      nonce: 'n'.repeat(32),
      expiresAt: new Date().toISOString(),
    })),
    enroll: jest.fn(),
    manifest: jest.fn(),
    render: jest.fn(),
    confirm: jest.fn(),
    telemetry: jest.fn(),
  };

  it('uses strict DTO validation and does not rely on an administrative session', async () => {
    const module = await Test.createTestingModule({
      controllers: [DeviceGatewayController],
      providers: [{ provide: DeviceGatewayService, useValue: gateway }],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    try {
      await request(app.getHttpServer())
        .post('/device-gateway/challenge')
        .send({
          deviceId: 'device-a',
          operation: 'telemetry',
          method: 'POST',
          path: '/device-gateway/telemetry',
          bodySha256: 'a'.repeat(64),
          unexpected: 'forbidden',
        })
        .expect(400);
      await request(app.getHttpServer())
        .post('/device-gateway/challenge')
        .send({
          deviceId: 'device-a',
          operation: 'telemetry',
          method: 'POST',
          path: '/device-gateway/telemetry',
          bodySha256: 'a'.repeat(64),
        })
        .expect(200);
      expect(gateway.challenge).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
