import { readFileSync } from 'fs';
import { join } from 'path';
import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';

async function main() {
  const config = Object.assign(new KnowledgeConfig(), { localOcrEnabled: true });
  const pages = await new KnowledgeExtractorService(config).extract(
    readFileSync(join(process.cwd(), 'assets/knowledge-qa/master-mixed.pdf')), 'application/pdf',
  );
  if (pages.length !== 2 || pages[0].extractionMethod !== 'NATIVE_TEXT' ||
      pages[1].extractionMethod !== 'LOCAL_OCR' || !pages[1].text.includes('CORO-SCAN-2026'))
    throw new Error('KNOWLEDGE_LOCAL_OCR_SMOKE_FAILED');
  console.log(JSON.stringify({ status: 'PASS', test: 'KNOWLEDGE_LOCAL_OCR', syntheticOnly: true, pages: 2 }));
}
main().catch(() => { console.error('KNOWLEDGE_LOCAL_OCR_SMOKE_FAILED'); process.exitCode = 1; });
