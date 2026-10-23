import { readFile } from 'node:fs/promises';
import { Console } from 'node:console';
import { fileURLToPath } from 'node:url';

// stdout is a JSON protocol; dependency diagnostics belong on stderr.
const diagnostics = new Console({ stdout: process.stderr, stderr: process.stderr });
for (const method of ['log', 'info', 'debug', 'warn']) {
  console[method] = diagnostics[method].bind(diagnostics);
}

const [, , input, maxPagesRaw] = process.argv;
try {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
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
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => 'str' in item).slice(0, 10000);
    pages.push({
      pageNumber,
      text: items
        .map((item) => `${String(item.str)}${item.hasEOL ? '\n' : ' '}`)
        .join(''),
    });
    page.cleanup();
  }
  await loadingTask.destroy();
  process.stdout.write(JSON.stringify({ pages }));
} catch (error) {
  const message = error instanceof Error ? error.message : 'PDF_INVALID';
  process.stderr.write(message.slice(0, 4096));
  process.exitCode = 2;
}
