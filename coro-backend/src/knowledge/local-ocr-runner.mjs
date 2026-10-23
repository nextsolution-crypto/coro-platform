import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

const execute = promisify(execFile);

export function parseOcrTsv(tsv, minimumConfidence) {
  const words = tsv.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const fields = line.split('\t');
    return { level: Number(fields[0]), line: fields.slice(1, 5).join(':'),
      confidence: Number(fields[10]), text: fields.slice(11).join('\t').trim() };
  }).filter(word => word.level === 5 && word.text);
  const size = words.reduce((sum, word) => sum + word.text.length, 0);
  const confidence = size ? words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / size : 0;
  if (size < 20 || !Number.isFinite(confidence) || confidence < minimumConfidence ||
      words.some(word => !Number.isFinite(word.confidence) || word.confidence < 0))
    throw new Error('OCR_LOW_CONFIDENCE');
  let previous;
  return words.map(word => { const prefix = previous && previous !== word.line ? '\n' : ' ';
    previous = word.line; return prefix + word.text; }).join('').trim();
}

export async function ocrPage(input, directory, pageNumber, policy) {
  const prefix = join(directory, `ocr-${pageNumber}`);
  const options = { timeout: policy.timeoutMs, maxBuffer: 2 * 1024 * 1024,
    killSignal: 'SIGKILL', windowsHide: true,
    env: { PATH: process.env.PATH, LANG: 'C.UTF-8', OMP_THREAD_LIMIT: '1',
      ...(process.env.TESSDATA_PREFIX ? { TESSDATA_PREFIX: process.env.TESSDATA_PREFIX } : {}) } };
  try {
    // Fixed rendering dimensions bound memory even for unusually large PDF pages.
    await execute('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber), '-singlefile',
      '-scale-to', '1800', '-gray', '-png', input, prefix], options);
    const result = await execute('tesseract', [prefix + '.png', 'stdout', '-l', 'fra+eng', '--psm', '3', '-c', 'tessedit_create_tsv=1'], options);
    return parseOcrTsv(result.stdout, policy.minConfidence);
  } catch (error) {
    if (error.message === 'OCR_LOW_CONFIDENCE') throw error;
    throw new Error(error.killed ? 'OCR_TIMEOUT' : 'OCR_UNAVAILABLE');
  } finally {
    await rm(prefix + '.png', { force: true });
  }
}
