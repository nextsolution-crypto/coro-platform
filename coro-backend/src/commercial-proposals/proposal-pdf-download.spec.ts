import { createHash } from 'crypto';
import { ProposalPdfService } from './proposal-pdf.service';

jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));

describe('ProposalPdfService private download', () => {
  const bytes = Buffer.from('%PDF-1.4 private test');
  const document = {
    id: 'document-a',
    proposalRevisionId: 'revision-a',
    status: 'FINALIZED',
    storageKey: 'private/proposal.pdf',
    mimeType: 'application/pdf',
    fileName: 'proposal.pdf',
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  const prisma = { proposalDocument: { findFirst: jest.fn() } };
  const storage = { downloadPrivate: jest.fn() };
  const service = new ProposalPdfService(
    prisma as never,
    storage as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('requires the exact relation and verifies the downloaded bytes', async () => {
    prisma.proposalDocument.findFirst.mockResolvedValue(document);
    storage.downloadPrivate.mockResolvedValue(bytes);
    await expect(
      service.download('proposal-a', 'revision-a', 'document-a'),
    ).resolves.toEqual({
      buffer: bytes,
      mimeType: 'application/pdf',
      fileName: 'proposal.pdf',
    });
    expect(prisma.proposalDocument.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'document-a',
        proposalRevisionId: 'revision-a',
        status: 'FINALIZED',
        proposalRevision: { proposalId: 'proposal-a' },
      },
    });
  });

  it('rejects unknown or mismatched documents before storage access', async () => {
    prisma.proposalDocument.findFirst.mockResolvedValue(null);
    await expect(
      service.download('proposal-b', 'revision-a', 'document-a'),
    ).rejects.toThrow('Document introuvable');
    expect(storage.downloadPrivate).not.toHaveBeenCalled();
  });

  it('rejects corrupted private bytes', async () => {
    prisma.proposalDocument.findFirst.mockResolvedValue(document);
    storage.downloadPrivate.mockResolvedValue(Buffer.from('different'));
    await expect(
      service.download('proposal-a', 'revision-a', 'document-a'),
    ).rejects.toThrow('Intégrité');
  });
});
