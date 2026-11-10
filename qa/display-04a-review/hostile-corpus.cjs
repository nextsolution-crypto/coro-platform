const { PDFDocument, degrees, rgb } = require('pdf-lib');
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
    polyglot_synthetic: Buffer.concat([valid, Buffer.from('\nPK\x03\x04synthetic')]),
  };
  const results = {};
  for (const [name, bytes] of Object.entries(cases)) results[name] = await classify(engine, bytes);
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error instanceof Error ? error.message : 'corpus failure');
  process.exitCode = 1;
});
