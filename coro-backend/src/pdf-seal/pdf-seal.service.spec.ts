import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { PdfSealService, buildTimestampRequest, timestampGranted } from './pdf-seal.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const forge = require('node-forge');

function makeP12(passphrase: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 86400000);
  const attrs = [{ name: 'commonName', value: 'CORO test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], passphrase, { algorithm: '3des' });
  return Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
}

async function samplePdf() {
  const doc = await PDFDocument.create();
  doc.addPage().drawText('CORO');
  return Buffer.from(await doc.save());
}

describe('M8-04 — sceau CORO', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('signe le PDF avec la clé de la plateforme', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'seal-'));
    writeFileSync(join(dir, 'seal.p12'), makeP12('pw'));
    process.env.CORO_PDF_SEAL_P12_PATH = join(dir, 'seal.p12');
    process.env.CORO_PDF_SEAL_P12_PASSPHRASE = 'pw';
    process.env.CORO_PDF_TIMESTAMP_DISABLED = 'true';
    const result = await new PdfSealService().seal(await samplePdf(), { reason: 'Version approuvée v1' });
    expect(result.signed).toBe(true);
    expect(result.pdf.includes('/ByteRange')).toBe(true);
    expect(result.pdf.includes('adbe.pkcs7.detached')).toBe(true);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  }, 30000);

  it('sans clé : PDF inchangé, jamais bloquant', async () => {
    delete process.env.CORO_PDF_SEAL_P12_PATH;
    process.env.CORO_PDF_TIMESTAMP_DISABLED = 'true';
    const pdf = await samplePdf();
    const result = await new PdfSealService().seal(pdf, { reason: 'x' });
    expect(result.signed).toBe(false);
    expect(result.pdf.equals(pdf)).toBe(true);
    expect(result.timestampToken).toBeNull();
  });

  it('construit une demande RFC 3161 valide (SHA-256, nonce, certReq)', () => {
    const req = forge.asn1.fromDer(buildTimestampRequest(Buffer.alloc(32, 7)).toString('binary'));
    expect(req.value).toHaveLength(4);
    expect(forge.asn1.derToOid(req.value[1].value[0].value[0].value)).toBe('2.16.840.1.101.3.4.2.1');
    expect(req.value[1].value[1].value.length).toBe(32);
  });

  it('reconnaît une réponse accordée ou refusée', () => {
    const asn1 = forge.asn1;
    const response = (status: number, withToken: boolean) => Buffer.from(asn1.toDer(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, String.fromCharCode(status))]),
      ...(withToken ? [asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [])] : []),
    ])).getBytes(), 'binary');
    expect(timestampGranted(response(0, true))).toBe(true);
    expect(timestampGranted(response(2, false))).toBe(false);
  });
});
