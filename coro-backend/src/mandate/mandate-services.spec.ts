import { ForbiddenException } from '@nestjs/common';
import { MandateController } from './mandate.controller';

describe('Mandate commercial services controller access', () => {
  const commercial: any = { list: jest.fn().mockResolvedValue({ services: [], revision: 'r' }),
    save: jest.fn().mockResolvedValue({ services: [], revision: 'r' }) };
  const preview: any = { preview: jest.fn().mockResolvedValue({ commercialRevision: 'r', operations: [] }) };
  const apply: any = { apply: jest.fn().mockResolvedValue({ commercialRevision: 'r', applied: [] }) };
  const controller = new MandateController({} as any, commercial, preview, apply);
  const request = (role: string) => ({ user: { userId: 'user-a', organizationId: 'org-a', role } });

  beforeEach(() => jest.clearAllMocks());

  it('allows an Operator with project access to read through the scoped service', async () => {
    await expect(controller.getMandateServices('project-a', request('OPERATOR'))).resolves.toMatchObject({ revision: 'r' });
    expect(commercial.list).toHaveBeenCalledWith('project-a', request('OPERATOR').user);
  });

  it('allows tenant administrators to save the commercial offer', async () => {
    const dto: any = { expectedRevision: 'r', services: [] };
    await expect(controller.saveMandateServices('project-a', dto, request('ADMIN'))).resolves.toMatchObject({ revision: 'r' });
    expect(commercial.save).toHaveBeenCalledWith('project-a', request('ADMIN').user, dto);
  });

  it('refuses Operator writes and Client reads before calling the service', () => {
    expect(() => controller.saveMandateServices('project-a', {} as any, request('OPERATOR'))).toThrow(ForbiddenException);
    expect(() => controller.getMandateServices('project-a', request('CLIENT'))).toThrow(ForbiddenException);
    expect(commercial.save).not.toHaveBeenCalled();
    expect(commercial.list).not.toHaveBeenCalled();
  });

  it('allows internal preview and refuses Client preview', async () => {
    const dto: any = { expectedRevision: 'a'.repeat(64) };
    await expect(controller.previewMandateServiceOperations('project-a', dto, request('OPERATOR')))
      .resolves.toMatchObject({ commercialRevision: 'r' });
    expect(preview.preview).toHaveBeenCalledWith('project-a', request('OPERATOR').user, dto.expectedRevision);
    expect(() => controller.previewMandateServiceOperations('project-a', dto, request('CLIENT'))).toThrow(ForbiddenException);
  });

  it('allows only tenant administrators to apply operational decisions', async () => {
    const dto: any = { idempotencyKey: 'key', expectedRevision: 'a'.repeat(64), decisions: [] };
    await expect(controller.applyMandateServiceOperations('project-a', dto, request('ADMIN')))
      .resolves.toMatchObject({ commercialRevision: 'r' });
    expect(apply.apply).toHaveBeenCalledWith('project-a', request('ADMIN').user, dto);
    expect(() => controller.applyMandateServiceOperations('project-a', dto, request('OPERATOR')))
      .toThrow(ForbiddenException);
    expect(() => controller.applyMandateServiceOperations('project-a', dto, request('CLIENT')))
      .toThrow(ForbiddenException);
  });
});
