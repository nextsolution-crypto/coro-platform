import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';

export function fixturePdf() {
  const content = 'BT /F1 12 Tf 72 720 Td (CORO-KNOWLEDGE-2026) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(content, 'ascii') + ' >>\nstream\n' + content + 'endstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'ascii');
}

async function main() {
  const extractor = new KnowledgeExtractorService(new KnowledgeConfig());
  const pages = await extractor.extract(fixturePdf(), 'application/pdf');
  if (pages.length !== 1 || pages[0].pageNumber !== 1 || !pages[0].text.includes('CORO-KNOWLEDGE-2026')) {
    throw new Error('KNOWLEDGE_COMPILED_PDF_SMOKE_FAILED');
  }
  console.log(JSON.stringify({ status: 'PASS', test: 'KNOWLEDGE_COMPILED_PDF', pages: 1, codeFound: true }));
}

if (require.main === module) main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'KNOWLEDGE_COMPILED_PDF_SMOKE_FAILED');
  process.exitCode = 1;
});
