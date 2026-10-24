import { execFileSync } from 'child_process';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import JSZip from 'jszip';
import { KnowledgeExtractorService } from './knowledge-extractor.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeChunkerService } from './knowledge-chunker.service';
import { KnowledgeNormalizer } from './knowledge-normalizer';
const xlsx =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const docx =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
async function workbook(extra?: (zip: JSZip) => void) {
  const zip = new JSZip();
  zip.file(
    'xl/workbook.xml',
    '<workbook><sheets><sheet name="Équipements" r:id="rId1"/></sheets></workbook>',
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file(
    'xl/sharedStrings.xml',
    '<sst><si><t>Vanne principale</t></si></sst>',
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Local mécanique Z-42</t></is></c><c r="C1"><f>SUM(D1:D9)</f><v>99999</v></c></row></sheetData></worksheet>',
  );
  extra?.(zip);
  return zip.generateAsync({ type: 'nodebuffer' });
}
describe('Bounded real local office extraction', () => {
  const config = new KnowledgeConfig();
  const extractor = new KnowledgeExtractorService(config);
  it('reads sheets/cells with references and excludes cached formula values', async () => {
    const pages = await extractor.extract(await workbook(), xlsx);
    expect(pages[0].text).toContain('A1: Vanne principale');
    expect(pages[0].text).toContain('B1: Local mécanique Z-42');
    expect(pages[0].text).not.toContain('99999');
    expect(pages[0].sectionPath).toContain('Équipements');
    expect(
      new KnowledgeChunkerService(config, new KnowledgeNormalizer()).chunks(
        pages,
      )[0].sectionPath,
    ).toContain('Excel');
  });
  it('reads DOCX as logical blocks without inventing rendered page numbers', async () => {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    );
    zip.file(
      '_rels/.rels',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    );
    zip.file(
      'word/document.xml',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>La vanne principale se trouve au local mécanique Z-42.</w:t></w:r></w:p></w:body></w:document>',
    );
    const pages = await extractor.extract(
      await zip.generateAsync({ type: 'nodebuffer' }),
      docx,
    );
    expect(pages[0].text).toContain('Z-42');
    expect(pages[0].sectionPath).toContain('pagination logique');
  });
  it('rejects macros, external links and malformed archives', async () => {
    await expect(
      extractor.extract(
        await workbook((zip) => zip.file('xl/vbaProject.bin', 'unsafe')),
        xlsx,
      ),
    ).rejects.toThrow('OFFICE_ACTIVE_CONTENT_UNSUPPORTED');
    await expect(
      extractor.extract(
        await workbook((zip) =>
          zip.file(
            'xl/_rels/workbook.xml.rels',
            '<Relationships><Relationship Id="rId1" Target="https://example.invalid" TargetMode="External"/></Relationships>',
          ),
        ),
        xlsx,
      ),
    ).rejects.toThrow('OFFICE_INVALID');
    await expect(
      extractor.extract(Buffer.from('not-a-zip'), xlsx),
    ).rejects.toThrow('OFFICE_INVALID');
  });
  it('does not resolve XML entities', async () => {
    await expect(
      extractor.extract(
        await workbook((zip) =>
          zip.file(
            'xl/sharedStrings.xml',
            '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><sst><si><t>&x;</t></si></sst>',
          ),
        ),
        xlsx,
      ),
    ).rejects.toThrow('OFFICE_INVALID');
  });
  it('reports unsupported CAD extraction', async () => {
    await expect(
      extractor.extract(Buffer.from('DWG'), 'application/acad'),
    ).rejects.toThrow('non indexable');
  });
  it('preserves CSV headers and logical row references across quoted line breaks', async () => {
    const pages = await extractor.extract(
      Buffer.from(
        'Équipement;Emplacement\nVanne principale;"Local mécanique\nZ-42"\n',
      ),
      'text/csv',
    );
    expect(pages[0].text).toContain('Équipement : Vanne principale');
    expect(pages[0].text).toContain('Emplacement : Local mécanique\nZ-42');
    expect(pages[0].sectionPath).toContain('lignes 2');
    await expect(
      extractor.extract(Buffer.from('A,B\n"invalid'), 'text/csv'),
    ).rejects.toThrow('OFFICE_INVALID');
    await expect(
      extractor.extract(Buffer.from([0xff, 0xfe]), 'text/plain'),
    ).rejects.toThrow('TEXT_UTF8_REQUIRED');
  });
  it('reads an actual PNG locally with the existing OCR confidence threshold', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'coro-image-qa-'));
    try {
      execFileSync(
        'pdftoppm',
        [
          '-f',
          '1',
          '-l',
          '1',
          '-singlefile',
          '-scale-to',
          '1800',
          '-gray',
          '-png',
          join(__dirname, '../../assets/knowledge-qa/master-scanned.pdf'),
          join(dir, 'scan'),
        ],
        { timeout: 20000 },
      );
      const local = new KnowledgeExtractorService(
        Object.assign(new KnowledgeConfig(), { localOcrEnabled: true }),
      );
      const pages = await local.extract(
        await readFile(join(dir, 'scan.png')),
        'image/png',
      );
      expect(pages[0].text).toContain('CORO-SCAN-2026');
      expect(pages[0].extractionMethod).toBe('LOCAL_OCR');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
