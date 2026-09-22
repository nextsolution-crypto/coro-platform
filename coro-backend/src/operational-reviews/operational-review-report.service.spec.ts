import { OperationalReviewReportStatus } from '@prisma/client';
import { OperationalReviewReportService } from './operational-review-report.service';

describe('OperationalReviewReportService current version', () => {
  const actor = { sub: 'client-1', organizationId: 'org-1', role: 'CLIENT_MANAGER' };
  const review = { reference: 'REX-2026-000001', version: 1 };
  const r1 = { id: 'r1', reportVersion: 1, status: OperationalReviewReportStatus.FINALIZED };
  const r2 = { id: 'r2', reportVersion: 2, status: OperationalReviewReportStatus.FINALIZED };

  it('garde R1 courante tant que R2 est GENERATING, puis bascule vers R2 finalisée', async () => {
    let latestFinalized: any = r1;
    const prisma = { operationalReviewReport: { findFirst: jest.fn(async ({ where }: any) => where.status === OperationalReviewReportStatus.FINALIZED ? latestFinalized : { ...r2, status: OperationalReviewReportStatus.GENERATING }) } };
    const reviews = { authorizeReport: jest.fn().mockResolvedValue(review) };
    const service = new OperationalReviewReportService(prisma as any, {} as any, reviews as any);
    expect((await service.get('review-1', actor))?.id).toBe('r1');
    latestFinalized = r2;
    expect((await service.get('review-1', actor))?.id).toBe('r2');
    expect(prisma.operationalReviewReport.findFirst).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { reportVersion: 'desc' } }));
  });
});
