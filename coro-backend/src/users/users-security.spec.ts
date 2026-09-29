import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

describe('Platform user command security', () => {
  it('retire les champs administratifs d un profil forge', async () => {
    const dto = plainToInstance(UpdateProfileDto, { firstName: 'Safe', role: 'SUPER_ADMIN', organizationId: 'other', isActive: false, authVersion: 99, password: 'secret' });
    await validate(dto, { whitelist: true });
    expect(dto).toEqual({ firstName: 'Safe' });
  });

  it('interdit a ADMIN de creer SUPER_ADMIN avant toute ecriture', async () => {
    const prisma = { organization: { findUnique: jest.fn() }, user: { findUnique: jest.fn() } } as any;
    const service = new UsersService(prisma, {} as any, { normalizeReason: jest.fn() } as any);
    await expect(service.createInOrganization('org', { email: 'x@example.test', password: 'Password1!', firstName: 'X', lastName: 'Y', role: UserRole.SUPER_ADMIN }, { userId: 'admin', role: UserRole.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });
});
