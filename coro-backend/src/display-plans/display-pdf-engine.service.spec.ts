import {
  DisplayPdfEngineService,
  DisplayPdfRejectedError,
} from './display-pdf-engine.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

  it('rejects a polyglot payload appended after the final EOF marker', () => {
    expect(
      codeOf(() =>
        service.validateEnvelope(
          Buffer.concat([minimal(), Buffer.from('PK\x03\x04archive')]),
          1,
          300,
        ),
      ),
    ).toBe('PDF_TRAILING_DATA');
  });

  const realPopplerTest = process.platform === 'win32' ? it.skip : it;

  realPopplerTest(
    'renders a real 17 x 11 PDF page to a legible PNG',
    async () => {
      const document = await PDFDocument.create();
      const page = document.addPage([17 * 72, 11 * 72]);
      const font = await document.embedFont(StandardFonts.HelveticaBold);
      page.drawText('PLAN D EVACUATION - SYNTHETIQUE', {
        x: 72,
        y: 11 * 72 - 108,
        size: 36,
        font,
        color: rgb(0.05, 0.15, 0.3),
      });
      const bytes = Buffer.from(
        await document.save({ useObjectStreams: false }),
      );
      const rendered = await service.render(bytes, 1, 150);
      expect(rendered.bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(rendered.width).toBe(2550);
      expect(rendered.height).toBe(1650);
      expect(rendered.pageCount).toBe(1);
      expect(rendered.parameters).toEqual({
        pageNumber: 1,
        dpi: 150,
        format: 'PNG',
      });
      expect(rendered.engine).toBe('POPPLER');
    },
    45_000,
  );
});
