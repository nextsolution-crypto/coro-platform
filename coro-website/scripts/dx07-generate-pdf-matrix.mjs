import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateDiagnosticPdf } from '../lib/diagnostic/pdf.ts';
import { buildDiagnosticResult } from '../lib/diagnostic/results.ts';

const output = resolve('output/pdf/dx07');
const generatedAt = new Date('2026-10-27T15:00:00-04:00');
const logo = await readFile(resolve('public/coro-logo.png'));
const logoDataUrl = `data:image/png;base64,${logo.toString('base64')}`;
const responses = (answers) => Object.fromEntries(answers.map((answer, index) => [`D${index + 1}`, answer]));
const cases = [
  ['100', responses(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'])],
  ['79', responses(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C'])],
  ['0', responses(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'])],
  ['insufficient', responses(['A', 'B', 'C', 'D', 'D', 'E', 'E', 'E'])],
  ['unknown', responses(['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'])],
  ['not-applicable', responses(['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E'])],
];

await mkdir(output, { recursive: true });
const manifest = [];
for (const locale of ['fr', 'en']) {
  for (const [name, answerSet] of cases) {
    const model = buildDiagnosticResult(answerSet);
    const filename = `coro-diagnostic-express-${locale}-${name}.pdf`;
    const bytes = generateDiagnosticPdf({ model, responses: answerSet, locale, generatedAt, logoDataUrl });
    await writeFile(resolve(output, filename), bytes);
    manifest.push({ filename, bytes: bytes.length, score: model.evaluation.score, coverage: model.evaluation.coveragePercent, level: model.evaluation.level, definitive: model.evaluation.isDefinitive });
  }
}
await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
