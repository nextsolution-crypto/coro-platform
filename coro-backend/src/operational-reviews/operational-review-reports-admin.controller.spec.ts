import { ForbiddenException } from '@nestjs/common';
import { OperationalReviewReportsAdminController } from './operational-review-reports-admin.controller';

describe('OperationalReviewReportsAdminController', () => {
  const reports = { supersede: jest.fn().mockResolvedValue({ reportVersion: 2 }), findByReference: jest.fn() };
  const controller = new OperationalReviewReportsAdminController(reports as any);
  const dto = { reason: 'TECHNICAL_CORRECTION', comment: 'Correction des polices.' } as any;

  beforeEach(() => jest.clearAllMocks());

  it('transmet une supersession exclusivement pour le SUPER_ADMIN réel', async () => {
    await expect(controller.supersede('report-1', dto, { user: { userId: 'admin-1', role: 'SUPER_ADMIN' } })).resolves.toMatchObject({ reportVersion: 2 });
    expect(reports.supersede).toHaveBeenCalledWith('report-1', dto.reason, dto.comment, 'admin-1');
  });

  it.each(['ADMIN', 'CLIENT_USER'])('refuse %s avant tout appel métier', (role) => {
    expect(() => controller.supersede('report-1', dto, { user: { userId: 'actor', role } })).toThrow(ForbiddenException);
    expect(reports.supersede).not.toHaveBeenCalled();
  });
});
