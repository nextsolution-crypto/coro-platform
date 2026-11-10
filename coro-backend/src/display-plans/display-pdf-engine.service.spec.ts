import {
  DisplayPdfEngineService,
  DisplayPdfRejectedError,
} from './display-pdf-engine.service';

describe('DisplayPdfEngineService', () => {
  const service = new DisplayPdfEngineService();
  const minimal = (extra = '') =>
    Buffer.from(`%PDF-1.7\n1 0 obj\n<<>>\nendobj\n${extra}\n%%EOF`, 'latin1');
  const codeOf = (operation: () => void) => {
    try {
      operation();
      return null;
    } catch (error) {
      return error instanceof DisplayPdfRejectedError ? error.code : 'UNKNOWN';
    }
  };

  it('accepts a bounded passive envelope', () => {
    expect(() => service.validateEnvelope(minimal(), 1, 300)).not.toThrow();
  });

  it.each([
    ['/JavaScript', 'PDF_ACTIVE_CONTENT'],
    ['/EmbeddedFile', 'PDF_ACTIVE_CONTENT'],
    ['/XFA', 'PDF_ACTIVE_CONTENT'],
  ])('rejects active content %s', (token, code) => {
    expect(codeOf(() => service.validateEnvelope(minimal(token), 1, 300))).toBe(
      code,
    );
  });

  it('rejects spoofed files and unsafe parameters', () => {
    expect(
      codeOf(() => service.validateEnvelope(Buffer.from('not a pdf'), 1, 300)),
    ).toBe('PDF_MAGIC');
    expect(codeOf(() => service.validateEnvelope(minimal(), 0, 300))).toBe(
      'PDF_PAGE_RANGE',
    );
    expect(codeOf(() => service.validateEnvelope(minimal(), 1, 301))).toBe(
      'PDF_DPI',
    );
  });
});
