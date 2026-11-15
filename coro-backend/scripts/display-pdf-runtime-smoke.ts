import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DisplayPdfEngineService } from '../src/display-plans/display-pdf-engine.service';

async function main() {
  const document = await PDFDocument.create();
  const page = document.addPage([17 * 72, 11 * 72]);
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  page.drawText('CORO DISPLAY PDF NATIVE - SYNTHETIC', {
    x: 72,
    y: 11 * 72 - 108,
    size: 36,
    font,
    color: rgb(0.05, 0.15, 0.3),
  });
  const source = Buffer.from(await document.save({ useObjectStreams: false }));
  const rendered = await new DisplayPdfEngineService().render(source, 1, 150);
  if (
    rendered.bytes.subarray(1, 4).toString('ascii') !== 'PNG' ||
    rendered.width !== 2550 ||
    rendered.height !== 1650 ||
    rendered.pageCount !== 1 ||
    rendered.engine !== 'POPPLER'
  ) {
    throw new Error('DISPLAY_PDF_RUNTIME_SMOKE_FAILED');
  }
  process.stdout.write(
    `${JSON.stringify({
      status: 'PASS',
      test: 'DISPLAY_PDF_NATIVE_17X11',
      width: rendered.width,
      height: rendered.height,
      pageCount: rendered.pageCount,
      engine: rendered.engine,
      engineVersion: rendered.engineVersion,
      outputSha256: DisplayPdfEngineService.sha256(rendered.bytes),
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'DISPLAY_PDF_RUNTIME_SMOKE_FAILED'}\n`,
  );
  process.exit(1);
});
