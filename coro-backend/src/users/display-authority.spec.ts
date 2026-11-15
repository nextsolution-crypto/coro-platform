/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/require-await */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisplayPermission, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDisplayAuthorityDto } from './dto/update-display-authority.dto';
import { UsersService } from './users.service';

describe('Display authority administration', () => {
  const actor = { userId: 'admin-1', role: UserRole.ADMIN };

  it('valide un contrat bornÃ© et rejette les champs forgÃ©s', async () => {
    const dto = plainToInstance(UpdateDisplayAuthorityDto, {
      displayPermissions: [DisplayPermission.DISPLAY_READ],
      displayBuildingIds: ['a615ee8e-d758-43ff-a2d5-3dfde28b0298'],
      reason: 'Pilote Display autorisÃ©',
      organizationId: 'other-org',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((error) => error.property === 'organizationId')).toBe(
      true,
    );
  });

  it('refuse les permissions d urgence avant toute transaction', async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const service = new UsersService(
      prisma,
      {} as any,
      { normalizeReason: jest.fn(() => 'Motif valide Display') } as any,
    );
    await expect(
      service.updateDisplayAuthority(
        'user-1',
        'org-1',
        {
          displayPermissions: [
            DisplayPermission.DISPLAY_READ,
            DisplayPermission.DISPLAY_EMERGENCY_ACTIVATE,
          ],
          displayBuildingIds: ['a615ee8e-d758-43ff-a2d5-3dfde28b0298'],
          reason: 'Motif valide Display',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('exige DISPLAY_READ et une affectation ensemble', async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const service = new UsersService(
      prisma,
      {} as any,
      { normalizeReason: jest.fn(() => 'Motif valide Display') } as any,
    );
    await expect(
      service.updateDisplayAuthority(
        'user-1',
        'org-1',
        {
          displayPermissions: [DisplayPermission.DISPLAY_PLAN_READ],
          displayBuildingIds: [],
          reason: 'Motif valide Display',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persiste atomiquement, audite et rÃ©voque les sessions', async () => {
    const updated = {
      id: 'user-1',
      email: 'demo@example.test',
      displayPermissions: [DisplayPermission.DISPLAY_READ],
      displayBuildingIds: ['a615ee8e-d758-43ff-a2d5-3dfde28b0298'],
    };
    const tx = {
      $executeRaw: jest.fn(),
      user: {
        findFirst: jest.fn(async () => ({
          id: 'user-1',
          email: 'demo@example.test',
          isActive: true,
          displayPermissions: [],
          displayBuildingIds: [],
        })),
        update: jest.fn(async () => updated),
      },
      building: {
        findMany: jest.fn(async () => [
          { id: 'a615ee8e-d758-43ff-a2d5-3dfde28b0298' },
        ]),
      },
      refreshToken: { updateMany: jest.fn() },
    };
    const audit = {
      normalizeReason: jest.fn(() => 'Pilote Display autorisÃ©'),
      record: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as any;
    const service = new UsersService(prisma, {} as any, audit as any);

    await expect(
      service.updateDisplayAuthority(
        'user-1',
        'org-1',
        {
          displayPermissions: [DisplayPermission.DISPLAY_READ],
          displayBuildingIds: ['a615ee8e-d758-43ff-a2d5-3dfde28b0298'],
          reason: 'Pilote Display autorisÃ©',
        },
        actor,
      ),
    ).resolves.toEqual(updated);
    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1', organizationId: 'org-1' },
      }),
    );
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'DISPLAY_AUTHORITY_UPDATED' }),
    );
  });

  it('refuse un batiment hors tenant sans modifier le membre', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      user: {
        findFirst: jest.fn(async () => ({
          id: 'user-1',
          email: 'demo@example.test',
          isActive: true,
          displayPermissions: [],
          displayBuildingIds: [],
        })),
        update: jest.fn(),
      },
      building: { findMany: jest.fn(async () => []) },
      refreshToken: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as any;
    const service = new UsersService(
      prisma,
      {} as any,
      {
        normalizeReason: jest.fn(() => 'Motif valide Display'),
        record: jest.fn(),
      } as any,
    );
    await expect(
      service.updateDisplayAuthority(
        'user-1',
        'org-1',
        {
          displayPermissions: [DisplayPermission.DISPLAY_READ],
          displayBuildingIds: ['a615ee8e-d758-43ff-a2d5-3dfde28b0298'],
          reason: 'Motif valide Display',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
