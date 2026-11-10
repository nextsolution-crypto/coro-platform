const { PDFDocument, degrees, rgb } = require('pdf-lib');
const { execFileSync } = require('child_process');
const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const {
  DisplayPdfEngineService,
  DisplayPdfRejectedError,
} = require('../../coro-backend/dist/src/display-plans/display-pdf-engine.service.js');

async function pdf(pageCount = 1) {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    const page = doc.addPage([792, 612]);
    page.drawRectangle({ x: 10, y: 10, width: 100, height: 50, color: rgb(0.1, 0.2, 0.3), opacity: 0.5 });
    if (index === 0) page.setRotation(degrees(90));
  }
  return Buffer.from(await doc.save());
}

function encryptedPdf(source, password) {
  const directory = mkdtempSync(join(tmpdir(), 'coro-qpdf-'));
  try {
    const input = join(directory, 'plain.pdf');
    const output = join(directory, 'encrypted.pdf');
    writeFileSync(input, source);
    execFileSync('qpdf', ['--encrypt', password, password, '256', '--', input, output]);
    return readFileSync(output);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function excessiveDimensions() {
  const doc = await PDFDocument.create();
  doc.addPage([20_000, 20_000]);
  return Buffer.from(await doc.save());
}

function rawPdf(objects) {
  const chunks = [Buffer.from('%PDF-1.7\n')];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      Buffer.isBuffer(object) ? object : Buffer.from(object),
      Buffer.from('\nendobj\n'),
    ]);
    chunks.push(chunk);
    length += chunk.length;
  });
  const xref = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) trailer += `${String(offset).padStart(10, '0')} 00000 n \n`;
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.concat([...chunks, Buffer.from(trailer)]);
}

function deeplyNestedPdf() {
  const nested = `${'['.repeat(750)}null${']'.repeat(750)}`;
  return rawPdf([
    `<< /Type /Catalog /Pages 2 0 R /Synthetic ${nested} >>`,
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>',
  ]);
}

function largeImagePdf() {
  const pixels = Buffer.alloc(4096 * 4096);
  const image = Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width 4096 /Height 4096 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${pixels.length} >>\nstream\n`),
    pixels,
    Buffer.from('\nendstream'),
  ]);
  const content = Buffer.from('q 100 0 0 100 0 0 cm /Im0 Do Q');
  return rawPdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
    image,
    Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('\nendstream')]),
  ]);
}

async function classify(engine, bytes) {
  try {
    const result = await engine.render(bytes, 1, 150);
    return { outcome: 'ACCEPTED', width: result.width, height: result.height };
  } catch (error) {
    return {
      outcome: error instanceof DisplayPdfRejectedError ? 'REJECTED' : 'UNSUPPORTED',
      code: error instanceof DisplayPdfRejectedError ? error.code : 'UNKNOWN',
    };
  }
}

(async () => {
  const engine = new DisplayPdfEngineService();
  const valid = await pdf();
  const cases = {
    valid_rotated_transparency: valid,
    truncated: valid.subarray(0, Math.floor(valid.length / 2)),
    incorrect_signature: Buffer.from('NOTPDF synthetic'),
    corrupt_structure: Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog\n%%EOF'),
    active_javascript: Buffer.concat([valid, Buffer.from('\n/JavaScript')]),
    embedded_file: Buffer.concat([valid, Buffer.from('\n/EmbeddedFile')]),
    external_reference: Buffer.concat([valid, Buffer.from('\n/GoToR /URI')]),
    excessive_pages: await pdf(101),
    excessive_dimensions: await excessiveDimensions(),
    encrypted_aes256: encryptedPdf(valid, ''),
    password_protected_aes256: encryptedPdf(valid, 'synthetic-password'),
    deeply_nested_structure: deeplyNestedPdf(),
    extremely_large_embedded_image: largeImagePdf(),
    polyglot_synthetic: Buffer.concat([valid, Buffer.from('\nPK\x03\x04synthetic')]),
  };
  const results = {};
  for (const [name, bytes] of Object.entries(cases)) results[name] = await classify(engine, bytes);
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error instanceof Error ? error.message : 'corpus failure');
  process.exitCode = 1;
});
