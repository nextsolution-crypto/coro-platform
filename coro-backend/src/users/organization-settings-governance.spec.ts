import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Module1TemplateController } from '../organizations/module1-template.controller';

describe('Organization settings governance', () => {
  it('rejects operator directory and logo commands before any service call', async () => {
    const users = { findByOrganization: jest.fn(), updateOrganizationLogo: jest.fn() } as any;
    const controller = new UsersController(users);
    await expect(controller.getOrganizationUsers({ user: { role: 'OPERATOR', organizationId: 'org-a' } })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.updateLogo({ user: { role: 'OPERATOR', organizationId: 'org-a' } }, { companyLogoB64: 'data:image/png;base64,AA==' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.findByOrganization).not.toHaveBeenCalled();
    expect(users.updateOrganizationLogo).not.toHaveBeenCalled();
  });

  it('rejects operator Module 1 mutation before persistence', async () => {
    const service = { saveTemplate: jest.fn() } as any;
    const controller = new Module1TemplateController(service);
    await expect(controller.save({ user: { role: 'OPERATOR', organizationId: 'org-a' } }, { sections: [] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.saveTemplate).not.toHaveBeenCalled();
  });

  it('requires the current password and revokes every existing session after success', async () => {
    const password = await bcrypt.hash('Current1!', 4);
    const tx = {
      user: { update: jest.fn().mockResolvedValue({ id: 'user-a' }), findUnique: jest.fn() },
      refreshToken: { updateMany: jest.fn() }, trustedDevice: { deleteMany: jest.fn() },
      platformMfaChallenge: { deleteMany: jest.fn() }, adminAuditEvent: { create: jest.fn() },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ password, isActive: true }) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    } as any;
    const audit = { record: jest.fn(), normalizeReason: jest.fn() } as any;
    const service = new UsersService(prisma, {} as any, audit);
    await expect(service.changePassword('user-a', 'Wrong1!', 'NewPassword2!')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    await service.changePassword('user-a', 'Current1!', 'NewPassword2!');
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-a' }, data: { isRevoked: true } });
    expect(tx.trustedDevice.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-a' } });
    expect(tx.platformMfaChallenge.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-a' } });
    expect(audit.record).toHaveBeenCalled();
  });
});
