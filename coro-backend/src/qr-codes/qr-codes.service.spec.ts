import { BadRequestException, GoneException } from '@nestjs/common';
import { QrCodeStatus } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrCodesService } from './qr-codes.service';

const active = {
  id: 'qr-1',
  slug: 'contact',
  permanentPath: '/qr/contact',
  destinationUrl: 'https://getcoro.io/contact',
  status: QrCodeStatus.ACTIVE,
};

describe('QrCodesService', () => {
  it('resolves an active code and increments only the estimated human counter', async () => {
    const update = jest.fn().mockResolvedValue(active);
    const prisma = {
      qrCode: {
        findUnique: jest.fn().mockResolvedValue(active),
        update,
      },
    } as unknown as PrismaService;
    const service = new QrCodesService(
      prisma,
      {} as unknown as AdminAuditService,
    );
    await expect(
      service.resolve('contact', 'Mozilla/5.0 Mobile', 'GET'),
    ).resolves.toEqual({
      destinationUrl: 'https://getcoro.io/contact',
      redirectStatus: 307,
      classification: 'HUMAN_ESTIMATE',
      scope: 'GLOBAL',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'qr-1' },
      // Jest's asymmetric matcher is intentionally typed as `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { humanScanCount: { increment: 1 }, lastScanAt: expect.any(Date) },
    });
  });

  it('classifies HEAD and bot requests as technical', async () => {
    const update = jest.fn().mockResolvedValue(active);
    const prisma = {
      qrCode: {
        findUnique: jest.fn().mockResolvedValue(active),
        update,
      },
    } as unknown as PrismaService;
    const service = new QrCodesService(
      prisma,
      {} as unknown as AdminAuditService,
    );
    await expect(
      service.resolve('contact', 'Googlebot', 'HEAD'),
    ).resolves.toMatchObject({ classification: 'TECHNICAL' });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'qr-1' },
      data: { technicalRequestCount: { increment: 1 } },
    });
  });

  it('refuses disabled codes and external or looping destinations', async () => {
    const prisma = {
      qrCode: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...active, status: QrCodeStatus.DISABLED }),
      },
    } as unknown as PrismaService;
    const service = new QrCodesService(
      prisma,
      {} as unknown as AdminAuditService,
    );
    await expect(service.resolve('contact')).rejects.toBeInstanceOf(
      GoneException,
    );
    await expect(
      service.create(
        {
          slug: 'external',
          destinationUrl: 'https://evil.example/',
          reason: 'test',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        {
          slug: 'loop',
          destinationUrl: 'https://getcoro.io/qr/contact',
          reason: 'test',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    for (const destinationUrl of [
      '//getcoro.io/contact',
      'http://getcoro.io/contact',
      'https://user@getcoro.io/contact',
      'https://getcoro.io:444/contact',
      'https://getcoro.io/contact#fragment',
      'https://getcoro.io/%71r/contact',
      'https://getcoro.io/%2571r/contact',
    ]) {
      await expect(
        service.create(
          { slug: 'ambiguous', destinationUrl, reason: 'test' },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('rejects a stale concurrent update before writing an audit event', async () => {
    const transaction = {
      qrCode: {
        findUnique: jest.fn().mockResolvedValue({
          ...active,
          updatedAt: new Date('2026-11-01T12:00:00.000Z'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AdminAuditService;
    const service = new QrCodesService(prisma, audit);
    await expect(
      service.update(
        'contact',
        {
          destinationUrl: 'https://getcoro.io/contact?source=qr',
          expectedVersion: 1,
          reason: 'test concurrence',
        },
        'user-1',
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(audit.record).not.toHaveBeenCalled();
  });
});
