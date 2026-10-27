import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateDiagnosticPdf } from '../lib/diagnostic/pdf.ts';
import { buildDiagnosticResult } from '../lib/diagnostic/results.ts';

const output = resolve('output/pdf/dx05');
const generatedAt = new Date('2026-10-27T12:00:00-04:00');
const logo = await readFile(resolve('public/coro-logo.png'));
const logoDataUrl = `data:image/png;base64,${logo.toString('base64')}`;
const responses = (answers) => Object.fromEntries(answers.map((answer, index) => [`D${index + 1}`, answer]));
const samples = [
  { filename: 'coro-diagnostic-express-fr-79.pdf', locale: 'fr', responses: responses(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C']) },
  { filename: 'coro-diagnostic-express-en-insufficient.pdf', locale: 'en', responses: responses(['A', 'B', 'C', 'D', 'D', 'E', 'E', 'E']) },
];

await mkdir(output, { recursive: true });
for (const sample of samples) {
  const model = buildDiagnosticResult(sample.responses);
  const bytes = generateDiagnosticPdf({ model, responses: sample.responses, locale: sample.locale, generatedAt, logoDataUrl });
  await writeFile(resolve(output, sample.filename), bytes);
  console.log(`${sample.filename}: ${bytes.length} bytes, score=${model.evaluation.score}, coverage=${model.evaluation.coveragePercent}`);
}
