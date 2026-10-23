import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseOcrTsv } from '../../coro-backend/src/knowledge/local-ocr-runner.mjs';

const require = createRequire(import.meta.url);
const { KnowledgeConfig } = require('../../coro-backend/dist/src/knowledge/knowledge.config.js');
const { KnowledgeExtractorService } = require('../../coro-backend/dist/src/knowledge/knowledge-extractor.service.js');
const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../coro-backend/assets/knowledge-qa');
const bytes = name => readFileSync(join(fixtures, name));
const extractor = options => new KnowledgeExtractorService(Object.assign(new KnowledgeConfig(), options));

test('corpus fingerprints are reproducible and every fixture is explicitly synthetic', () => {
  const inventory = JSON.parse(bytes('inventory.json'));
  assert.equal(inventory.syntheticOnly, true);
  for (const file of inventory.files) {
    assert.equal(createHash('sha256').update(bytes(file.name)).digest('hex'), file.sha256);
    assert.equal(bytes(file.name).length, file.bytes);
  }
});
test('compiled extractor preserves the multipage table, page number and distinct revisions', async () => {
  for (const [name, code] of [['master-native-v1.pdf','CODE-ORME-031'],['master-native-v2.pdf','CODE-ORME-047']]) {
    const pages = await extractor({ localOcrEnabled: false }).extract(bytes(name), 'application/pdf');
    assert.equal(pages.length, 3);
    assert.equal(pages[1].pageNumber, 2);
    assert.ok(pages[1].text.includes(code));
    assert.equal(pages[1].extractionMethod, 'NATIVE_TEXT');
  }
});
test('scanned and mixed documents fail closed when OCR is disabled', async () => {
  for (const name of ['master-scanned.pdf','master-mixed.pdf'])
    await assert.rejects(() => extractor({localOcrEnabled:false}).extract(bytes(name),'application/pdf'), /OCR_DISABLED/);
});
test('local French/English OCR reads a real raster PDF and preserves native pages', async () => {
  for (const name of ['master-scanned.pdf','master-mixed.pdf']) {
    const pages = await extractor({localOcrEnabled:true}).extract(bytes(name),'application/pdf');
    const scanned = pages.at(-1);
    assert.equal(scanned.pageNumber, name === 'master-mixed.pdf' ? 2 : 1);
    assert.equal(scanned.extractionMethod,'LOCAL_OCR');
    assert.ok(scanned.text.includes('CORO-SCAN-2026'), scanned.text);
    if (pages.length === 2) assert.equal(pages[0].extractionMethod,'NATIVE_TEXT');
  }
});
test('limits and malformed PDFs cannot produce a partial successful extraction', async () => {
  await assert.rejects(() => extractor({maxPages:1}).extract(bytes('master-native-v1.pdf'),'application/pdf'), /PAGE_LIMIT_EXCEEDED/);
  await assert.rejects(() => extractor({localOcrEnabled:true,ocrMaxPages:0}).extract(bytes('master-scanned.pdf'),'application/pdf'), /OCR_PAGE_LIMIT_EXCEEDED/);
  await assert.rejects(() => extractor({}).extract(Buffer.from('%PDF-invalid'),'application/pdf'), /PDF_INVALID/);
  assert.throws(() => parseOcrTsv('header\n5\t1\t1\t1\t1\t1\t0\t0\t1\t1\t5\tuncertain text with more than twenty chars',80), /OCR_LOW_CONFIDENCE/);
});
test('worker concurrency and overall deadline are bounded without retaining a partial result', async () => {
  const service = extractor({localOcrEnabled:false});
  const first = service.extract(bytes('master-native-v1.pdf'),'application/pdf');
  const second = service.extract(bytes('master-native-v2.pdf'),'application/pdf');
  await assert.rejects(() => service.extract(bytes('master-native-v1.pdf'),'application/pdf'), /EXTRACTOR_BUSY/);
  const results = await Promise.all([first,second]);
  assert.deepEqual(results.map(pages => pages.length),[3,3]);
  await assert.rejects(() => extractor({extractionTimeoutMs:1}).extract(bytes('master-native-v1.pdf'),'application/pdf'), /EXTRACTION_TIMEOUT/);
});
