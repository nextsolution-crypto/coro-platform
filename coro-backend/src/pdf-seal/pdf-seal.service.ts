import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Sceau CORO (audit M8-04) — gratuit et vérifiable par un tiers :
 * 1. signature numérique du PDF par la clé de la plateforme (PAdES de base) :
 *    toute modification ultérieure du fichier est signalée par Adobe ;
 * 2. horodatage RFC 3161 de l'empreinte du PDF scellé par une autorité
 *    externe gratuite : prouve que ce fichier exact existait à cette date.
 *
 * Sans clé configurée, le PDF est rendu tel quel (comportement antérieur) :
 * le sceau ne bloque jamais la production d'un document.
 */
export type SealResult = {
  pdf: Buffer;
  sha256: string;
  signed: boolean;
  timestampToken: Buffer | null;
  timestampAuthority: string | null;
};

const DEFAULT_TSA = ['http://timestamp.digicert.com', 'https://freetsa.org/tsr'];

@Injectable()
export class PdfSealService {
  private readonly logger = new Logger(PdfSealService.name);
  private p12: Buffer | null | undefined;

  private loadP12(): Buffer | null {
    if (this.p12 !== undefined) return this.p12;
    const path = process.env.CORO_PDF_SEAL_P12_PATH?.trim();
    try {
      this.p12 = path && existsSync(path) ? readFileSync(path) : null;
    } catch {
      this.p12 = null;
    }
    return this.p12;
  }

  async seal(pdf: Buffer, meta: { reason: string; location?: string }): Promise<SealResult> {
    let output = pdf;
    let signed = false;
    const p12 = this.loadP12();
    if (p12) {
      try {
        output = await this.sign(pdf, p12, meta);
        signed = true;
      } catch (error) {
        this.logger.warn(`Signature du PDF impossible : ${error instanceof Error ? error.message : 'erreur'}`);
        output = pdf;
      }
    }
    const digest = createHash('sha256').update(output).digest();
    const stamp = await this.timestamp(digest).catch(() => null);
    return {
      pdf: output,
      sha256: digest.toString('hex'),
      signed,
      timestampToken: stamp?.token ?? null,
      timestampAuthority: stamp?.authority ?? null,
    };
  }

  private async sign(pdf: Buffer, p12: Buffer, meta: { reason: string; location?: string }) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { PDFDocument } = require('pdf-lib');
    const { pdflibAddPlaceholder } = require('@signpdf/placeholder-pdf-lib');
    const { P12Signer } = require('@signpdf/signer-p12');
    const signpdf = require('@signpdf/signpdf').default;
    /* eslint-enable @typescript-eslint/no-var-requires */
    const document = await PDFDocument.load(pdf, { updateMetadata: false });
    pdflibAddPlaceholder({
      pdfDoc: document,
      reason: meta.reason,
      contactInfo: 'getcoro.io',
      name: 'CORO',
      location: meta.location ?? 'Québec, Canada',
      signatureLength: 16384,
    });
    const withPlaceholder = Buffer.from(await document.save({ useObjectStreams: false }));
    const signer = new P12Signer(p12, { passphrase: process.env.CORO_PDF_SEAL_P12_PASSPHRASE ?? '' });
    return Buffer.from(await signpdf.sign(withPlaceholder, signer));
  }

  /** Demande d'horodatage RFC 3161 (TimeStampReq) sur l'empreinte SHA-256. */
  async timestamp(digest: Buffer): Promise<{ token: Buffer; authority: string } | null> {
    if (process.env.CORO_PDF_TIMESTAMP_DISABLED === 'true') return null;
    const authorities = (process.env.CORO_PDF_TIMESTAMP_URLS?.split(',').map((u) => u.trim()).filter(Boolean)) ?? DEFAULT_TSA;
    const request = buildTimestampRequest(digest);
    for (const authority of authorities) {
      try {
        const response = await fetch(authority, {
          method: 'POST',
          headers: { 'Content-Type': 'application/timestamp-query' },
          body: new Uint8Array(request),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) continue;
        const body = Buffer.from(await response.arrayBuffer());
        if (timestampGranted(body)) return { token: body, authority };
      } catch {
        // autorité suivante
      }
    }
    this.logger.warn('Horodatage RFC 3161 indisponible : PDF scellé sans jeton de date.');
    return null;
  }
}

/** TimeStampReq DER (RFC 3161 §2.4.1), SHA-256, nonce aléatoire, certReq=true. */
export function buildTimestampRequest(digest: Buffer): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const forge = require('node-forge');
  const asn1 = forge.asn1;
  const sha256Oid = asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes();
  const nonce = randomBytes(8);
  nonce[0] &= 0x7f; // entier positif
  const der = asn1.toDer(
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, String.fromCharCode(1)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, sha256Oid),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''),
        ]),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest.toString('binary')),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, nonce.toString('binary')),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false, String.fromCharCode(0xff)),
    ]),
  );
  return Buffer.from(der.getBytes(), 'binary');
}

/** TimeStampResp : PKIStatus 0 (granted) ou 1 (grantedWithMods) avec jeton. */
export function timestampGranted(body: Buffer): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const forge = require('node-forge');
    const resp = forge.asn1.fromDer(body.toString('binary'));
    const statusInfo = resp.value[0];
    const status = statusInfo.value[0].value.charCodeAt(0);
    return (status === 0 || status === 1) && resp.value.length > 1;
  } catch {
    return false;
  }
}
