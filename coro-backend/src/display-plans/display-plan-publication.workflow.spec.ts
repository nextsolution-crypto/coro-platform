/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { DisplayPermission } from '@prisma/client';
import { DisplayPlanPublicationService } from './display-plan-publication.service';

const actor = { userId: 'reviewer-b', organizationId: 'org-1' } as any;
const dto = {
  expectedLockVersion: 4,
  reason: 'Approbation et publication du plan vérifié',
  requestId: 'request-1',
  sourceVersion: 1,
  sourceSha256: 'a'.repeat(64),
  variantVersion: 2,
  variantSha256: 'b'.repeat(64),
  profile: 'SCREEN_16X9' as const,
  locationId: '7bde7d4a-f710-44a0-b774-4ee708492b63',
};

const row = (
  status: string,
  lockVersion: number,
  reviewedById: string | null,
) =>
  ({
    id: 'publication-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    createdById: 'creator-a',
    status,
    lockVersion,
    reviewedById,
  }) as any;

describe('Display two-level approval workflow', () => {
  const makeService = () => {
    const authorization = { require: jest.fn().mockResolvedValue(undefined) };
    const service = new DisplayPlanPublicationService(
      {} as any,
      {} as any,
      authorization as any,
      {} as any,
      {} as any,
    );
    return { service, authorization };
  };

  it('requires review, approval and publication before the first mutation', async () => {
    const { service, authorization } = makeService();
    jest
      .spyOn(service as any, 'load')
      .mockResolvedValue(row('REVIEW', 4, null));
    jest
      .spyOn(service, 'markReviewed')
      .mockResolvedValue(row('REVIEW', 5, actor.userId));
    jest
      .spyOn(service, 'approve')
      .mockResolvedValue(row('APPROVED', 6, actor.userId));
    jest
      .spyOn(service, 'publish')
      .mockResolvedValue(row('PUBLISHED', 7, actor.userId));

    await service.approveAndPublish(
      'org-1',
      'building-1',
      'publication-1',
      dto,
      actor,
    );

    expect(authorization.require.mock.calls.map((call) => call[3])).toEqual([
      DisplayPermission.DISPLAY_PLAN_REVIEW,
      DisplayPermission.DISPLAY_PLAN_APPROVE,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    ]);
    expect(service.markReviewed).toHaveBeenCalledWith(
      'org-1',
      'building-1',
      'publication-1',
      expect.objectContaining({ requestId: 'request-1:review' }),
      actor,
    );
    expect(service.approve).toHaveBeenCalledWith(
      'org-1',
      'building-1',
      'publication-1',
      expect.objectContaining({
        requestId: 'request-1:approve',
        expectedLockVersion: 5,
      }),
      actor,
    );
    expect(service.publish).toHaveBeenCalledWith(
      'org-1',
      'building-1',
      'publication-1',
      expect.objectContaining({
        requestId: 'request-1:publish',
        expectedLockVersion: 6,
      }),
      actor,
    );
  });

  it('keeps the approval recoverable when publication fails', async () => {
    const { service } = makeService();
    jest
      .spyOn(service as any, 'load')
      .mockResolvedValue(row('REVIEW', 4, actor.userId));
    jest
      .spyOn(service, 'approve')
      .mockResolvedValue(row('APPROVED', 5, actor.userId));
    jest
      .spyOn(service, 'publish')
      .mockRejectedValue(new Error('transport unavailable'));

    await expect(
      service.approveAndPublish(
        'org-1',
        'building-1',
        'publication-1',
        dto,
        actor,
      ),
    ).rejects.toThrow('transport unavailable');
    expect(service.approve).toHaveBeenCalledTimes(1);
    expect(service.publish).toHaveBeenCalledWith(
      'org-1',
      'building-1',
      'publication-1',
      expect.objectContaining({ expectedLockVersion: 5 }),
      actor,
    );
  });

  it('resumes an approved publication without repeating approval', async () => {
    const { service } = makeService();
    jest
      .spyOn(service as any, 'load')
      .mockResolvedValue(row('APPROVED', 4, actor.userId));
    const approve = jest.spyOn(service, 'approve');
    jest
      .spyOn(service, 'publish')
      .mockResolvedValue(row('PUBLISHED', 5, actor.userId));

    await service.approveAndPublish(
      'org-1',
      'building-1',
      'publication-1',
      dto,
      actor,
    );

    expect(approve).not.toHaveBeenCalled();
    expect(service.publish).toHaveBeenCalledTimes(1);
  });
});
