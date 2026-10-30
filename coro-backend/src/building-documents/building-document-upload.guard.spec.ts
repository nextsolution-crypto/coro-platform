import { ForbiddenException } from '@nestjs/common';
import { BuildingDocumentUploadGuard } from './building-document-upload.guard';

describe('BuildingDocumentUploadGuard', () => {
  const context = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it('authorizes an internal upload before multipart processing', async () => {
    const service: any = { access: jest.fn().mockResolvedValue({ canUpload: true }) };
    const guard = new BuildingDocumentUploadGuard(service);
    const request: any = {
      params: { buildingId: 'building' },
      user: { userId: 'user', organizationId: 'org', role: 'OPERATOR' },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(service.access).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INTERNAL_USER', id: 'user', organizationId: 'org' }),
      'building',
    );
  });

  it('fails closed before multipart processing when upload is forbidden', async () => {
    const service: any = { access: jest.fn().mockResolvedValue({ canUpload: false }) };
    const guard = new BuildingDocumentUploadGuard(service);
    const request: any = {
      params: { buildingId: 'building' },
      clientUser: { sub: 'client-user', organizationId: 'org', role: 'CLIENT_CORPORATE' },
    };
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
