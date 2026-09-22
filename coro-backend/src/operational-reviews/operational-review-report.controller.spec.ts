import { OperationalReviewsController } from './operational-reviews.controller';

describe('OperationalReviewsController report download', () => {
  it('returns private PDF bytes with safe download headers', async () => {
    const bytes = Buffer.from('%PDF-1.7');
    const reports = { download: jest.fn().mockResolvedValue({ bytes, filename: 'REX-2026-000001_v1_FR.pdf' }) };
    const controller = new OperationalReviewsController({} as any, {} as any, reports as any, {} as any);
    const actor = { sub: 'user', organizationId: 'org' };
    const response = { set: jest.fn(), send: jest.fn() };
    await controller.downloadReport('review', { clientUser: actor } as any, response as any);
    expect(reports.download).toHaveBeenCalledWith('review', actor);
    expect(response.set).toHaveBeenCalledWith(expect.objectContaining({
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.length),
      'Content-Disposition': `attachment; filename="REX-2026-000001_v1_FR.pdf"; filename*=UTF-8''REX-2026-000001_v1_FR.pdf`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    }));
    expect(response.send).toHaveBeenCalledWith(bytes);
  });
});
