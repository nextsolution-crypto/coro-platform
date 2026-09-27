import { ForbiddenException } from '@nestjs/common';
import { MandateController } from './mandate.controller';

describe('Mandate commercial services controller access', () => {
  const commercial: any = { list: jest.fn().mockResolvedValue({ services: [], revision: 'r' }),
    save: jest.fn().mockResolvedValue({ services: [], revision: 'r' }) };
  const controller = new MandateController({} as any, commercial);
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
});
