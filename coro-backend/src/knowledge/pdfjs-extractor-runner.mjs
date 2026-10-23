import { readFile } from 'node:fs/promises';
import { Console } from 'node:console';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ocrPage } from './local-ocr-runner.mjs';

// stdout is a JSON protocol; dependency diagnostics belong on stderr.
const diagnostics = new Console({ stdout: process.stderr, stderr: process.stderr });
for (const method of ['log', 'info', 'debug', 'warn']) {
  console[method] = diagnostics[method].bind(diagnostics);
}

const [, , input, maxPagesRaw, ocrRaw] = process.argv;
const ocr = ocrRaw ? JSON.parse(ocrRaw) : { enabled: false };
try {
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = await readFile(input);
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useWorkerFetch: false,
    verbosity: 0,
    standardFontDataUrl: fileURLToPath(
      new URL('./standard_fonts/', import.meta.resolve('pdfjs-dist/package.json')),
    ),
  });
  const document = await loadingTask.promise;
  if (document.numPages > Number(maxPagesRaw))
    throw new Error('PAGE_LIMIT_EXCEEDED');
  const pages = [];
  let ocrCount = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => 'str' in item).slice(0, 10000);
    let text = items
        .map((item) => `${String(item.str)}${item.hasEOL ? '\n' : ' '}`)
        .join('');
    let extractionMethod = 'NATIVE_TEXT';
    if (text.trim().length < 120) {
      const operators = await page.getOperatorList();
      const imageOps = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject];
      if (operators.fnArray.some(operation => imageOps.includes(operation))) {
        if (!ocr.enabled) throw new Error('OCR_DISABLED');
        if (++ocrCount > ocr.maxPages) throw new Error('OCR_PAGE_LIMIT_EXCEEDED');
        text = await ocrPage(input, dirname(input), pageNumber, ocr);
        extractionMethod = 'LOCAL_OCR';
      }
    }
    pages.push({ pageNumber, text, extractionMethod });
    page.cleanup();
  }
  await loadingTask.destroy();
  process.stdout.write(JSON.stringify({ pages }));
} catch (error) {
  const message = error instanceof Error ? error.message : 'PDF_INVALID';
  process.stderr.write(/^(PAGE_LIMIT_EXCEEDED|OCR_[A-Z_]+)$/.test(message) ? message : 'PDF_INVALID');
  process.exitCode = 2;
}
