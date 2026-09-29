import { ForbiddenException, Logger } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';

describe('ActivitiesController legacy mandate generation', () => {
  const service = { generateFromMandate: jest.fn() };
  const taskLists = {};
  const request = (role: string) => ({
    user: {
      userId: `${role.toLowerCase()}-user`,
      organizationId: 'org-a',
      role,
    },
  });
  let controller: ActivitiesController;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ActivitiesController(service as never, taskLists as never);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => warn.mockRestore());

  it('rejects OPERATOR before any legacy mutation', async () => {
    await expect(
      controller.generateFromMandate(
        'project-a',
        { services: [] },
        request('OPERATOR'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.generateFromMandate).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'SUPER_ADMIN'])(
    'keeps the deprecated compatibility path for %s and logs success',
    async (role) => {
      service.generateFromMandate.mockResolvedValue([{ id: 'activity-a' }]);
      await expect(
        controller.generateFromMandate(
          'project-a',
          { services: [] },
          request(role),
        ),
      ).resolves.toEqual([{ id: 'activity-a' }]);
      expect(service.generateFromMandate).toHaveBeenCalledWith(
        'project-a',
        request(role).user,
        [],
      );
      expect(warn).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          event: 'LEGACY_MANDATE_GENERATION_CALLED',
          projectId: 'project-a',
          organizationId: 'org-a',
          role,
        }),
      );
      expect(warn).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: 'LEGACY_MANDATE_GENERATION_SUCCEEDED',
          projectId: 'project-a',
          role,
        }),
      );
    },
  );

  it('logs an authorized failure without swallowing or changing the error', async () => {
    const failure = new Error('rollback');
    service.generateFromMandate.mockRejectedValue(failure);
    await expect(
      controller.generateFromMandate(
        'project-a',
        {
          services: [
            { activityTypeId: 'sensitive-type-id', isRecurring: true },
          ],
        },
        request('ADMIN'),
      ),
    ).rejects.toBe(failure);
    expect(warn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'LEGACY_MANDATE_GENERATION_FAILED',
        projectId: 'project-a',
        role: 'ADMIN',
        errorType: 'Error',
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('sensitive-type-id');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('isRecurring');
  });

  it('keeps CLIENT forbidden without calling the legacy service', async () => {
    await expect(
      controller.generateFromMandate(
        'project-a',
        { services: [] },
        request('CLIENT'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.generateFromMandate).not.toHaveBeenCalled();
  });
});
