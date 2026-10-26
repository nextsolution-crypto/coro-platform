import { ForbiddenException } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController creation authorization', () => {
  const create = jest.fn();
  const controller = new ClientsController({ create } as unknown as ClientsService);
  beforeEach(() => jest.clearAllMocks());

  it.each(['ADMIN', 'SUPER_ADMIN'])('allows %s and imposes the server organization', async (role) => {
    create.mockResolvedValue({ id: 'client-new' });
    await expect(controller.create(
      { name: 'QA', organizationId: 'forged-org', contactEmail: 'qa@example.test' },
      { user: { userId: 'actor', role, organizationId: 'org-a' } },
    )).resolves.toEqual({ id: 'client-new' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-a' }));
  });

  it('refuses OPERATOR before any client, account, invitation or notification side effect', () => {
    expect(() => controller.create(
      { name: 'Forbidden', contactEmail: 'qa@example.test' },
      { user: { userId: 'operator', role: 'OPERATOR', organizationId: 'org-a' } },
    )).toThrow(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });
});
