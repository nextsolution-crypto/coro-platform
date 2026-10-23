import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [, , input, maxPagesRaw] = process.argv;
try {
  const bytes = await readFile(input);
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useWorkerFetch: false,
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
