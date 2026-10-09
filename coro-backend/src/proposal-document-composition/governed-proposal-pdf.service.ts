import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalDocumentCompositionReadiness } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import puppeteer from 'puppeteer';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type {
  CompositionDiagnostic,
  ProposalDocumentCompositionContent,
} from './proposal-document-composition.types';

export const GOVERNED_PROPOSAL_PDF_TEMPLATE_VERSION =
  'governed-proposal-offer/v2';
export const GOVERNED_PROPOSAL_PDF_GENERATOR_VERSION = 'puppeteer/v2';

const scalarText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  )
    return value.toString();
  if (value instanceof Date) return value.toISOString();
  return '';
};

const escapeHtml = (value: unknown) =>
  scalarText(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const list = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];

const money = (value: unknown, currency: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const minor = BigInt(scalarText(value));
  const absolute = minor < 0n ? -minor : minor;
  const major = (absolute / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${minor < 0n ? '-' : ''}${major},${(absolute % 100n)
    .toString()
    .padStart(2, '0')} $ ${escapeHtml(currency)}`;
};

const nonZeroMoney = (value: unknown, currency: unknown) =>
  value !== null && value !== undefined && BigInt(scalarText(value)) !== 0n
    ? money(value, currency)
    : null;

const text = (source: Record<string, unknown>, key: string) =>
  typeof source[key] === 'string' ? source[key] : '';

export function renderGovernedProposalHtml(
  content: ProposalDocumentCompositionContent,
  diagnostics: readonly CompositionDiagnostic[],
  readiness: ProposalDocumentCompositionReadiness,
) {
  const fr = content.language === 'FR';
  const ready = readiness === 'ISSUANCE_READY';
  const economics = record(content.economics);
  const totals = record(economics.totals);
  const currency = economics.currency ?? 'CAD';
  const recipient = record(content.recipient);
  const issuer = ready ? record(content.issuer) : {};
  const labels = fr
    ? {
        title: 'Offre de service',
        preparedFor: 'Préparée pour',
        solution: 'Solution proposée',
        included: 'Fonctionnalités incluses',
        implementation: 'Mise en œuvre',
        services: 'Services professionnels',
        investment: 'Investissement',
        component: 'Composant',
        quantity: 'Quantité',
        cadence: 'Cadence',
        amount: 'Montant',
        oneTime: 'Frais ponctuels',
        annual: 'Récurrent annuel',
        firstYear: 'Engagement première année',
        terms: 'Conditions commerciales',
        acceptance: 'Acceptation',
        diagnostic: 'Diagnostics de préparation',
        draft: 'BROUILLON INTERNE — NON APPROUVÉ — NE PAS TRANSMETTRE',
        noClauses:
          'Les clauses juridiques et la signature sont volontairement exclues de ce brouillon interne.',
      }
    : {
        title: 'Service proposal',
        preparedFor: 'Prepared for',
        solution: 'Proposed solution',
        included: 'Included features',
        implementation: 'Implementation',
        services: 'Professional services',
        investment: 'Investment',
        component: 'Component',
        quantity: 'Quantity',
        cadence: 'Cadence',
        amount: 'Amount',
        oneTime: 'One-time fees',
        annual: 'Annual recurring',
        firstYear: 'First-year commitment',
        terms: 'Commercial terms',
        acceptance: 'Acceptance',
        diagnostic: 'Readiness diagnostics',
        draft: 'INTERNAL DRAFT — NOT APPROVED — DO NOT DISTRIBUTE',
        noClauses:
          'Legal clauses and signature are intentionally excluded from this internal draft.',
      };
  const sectionMap = new Map(
    content.sections.map((section) => [section.code, section.content]),
  );
  const solutions = list(sectionMap.get('PROPOSED_SOLUTION'))
    .map((value) => record(value))
    .map(
      (item) =>
        `<article class="feature"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`,
    )
    .join('');
  const included = list(sectionMap.get('INCLUDED_FEATURES_EXCLUSIONS'))
    .map((value) => record(value))
    .map(
      (item) =>
        `<li><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.deliveryMaturity)}</small></li>`,
    )
    .join('');
  const lineRows = list(economics.lines)
    .map((value) => record(value))
    .map((line) => {
      const label = fr
        ? text(line, 'labelFr')
        : text(line, 'labelEn') || text(line, 'labelFr');
      const quantityLabel = fr
        ? text(line, 'quantityLabelFr')
        : text(line, 'quantityLabelEn') || text(line, 'quantityLabelFr');
      return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(line.quantity)} ${escapeHtml(quantityLabel)}</td><td>${escapeHtml(fr ? line.cadenceFr : line.cadenceEn)}</td><td class="money">${escapeHtml(money(line.offeredExtendedAmountMinor, currency) ?? '—')}</td></tr>`;
    })
    .join('');
  const totalRows = [
    [labels.oneTime, nonZeroMoney(totals.oneTimeMinor, currency)],
    [labels.annual, nonZeroMoney(totals.annualRecurringMinor, currency)],
    [labels.firstYear, money(totals.firstYearMinor, currency)],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value], index, rows) =>
        `<div class="total ${index === rows.length - 1 ? 'grand' : ''}"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`,
    )
    .join('');
  const clauses = ready
    ? content.clauses
        .map((value) => record(value))
        .map(
          (clause) =>
            `<article class="clause"><h3>${escapeHtml(clause.title)}</h3><p>${escapeHtml(clause.text)}</p></article>`,
        )
        .join('')
    : '';
  const diagnosticList = diagnostics
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.severity)}</strong> · ${escapeHtml(item.code)}${item.subject ? ` · ${escapeHtml(item.subject)}` : ''}</li>`,
    )
    .join('');
  const issuerBlock = ready
    ? `<div class="issuer"><strong>${escapeHtml(issuer.tradeName || issuer.legalName)}</strong><br>${escapeHtml(issuer.legalName)}<br>${escapeHtml([issuer.addressLine1, issuer.addressLine2, issuer.city, issuer.subdivision, issuer.postalCode].filter(Boolean).join(', '))}<br>${escapeHtml(issuer.officialEmail)} ${escapeHtml(issuer.officialPhone)}</div>`
    : '';
  const acceptance = ready
    ? `<section class="page-break"><h2>${labels.acceptance}</h2><p>${escapeHtml(fr ? economics.commercialTerms && record(economics.commercialTerms).termsFr : economics.commercialTerms && record(economics.commercialTerms).termsEn)}</p><div class="signatures"><div>Nom / Name<br><span></span></div><div>Signature<br><span></span></div><div>Date<br><span></span></div></div></section>`
    : `<section class="draft-panel"><h2>${labels.diagnostic}</h2><p>${labels.noClauses}</p><ul>${diagnosticList || '<li>INTERNAL_DRAFT</li>'}</ul></section>`;

  return `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><head><meta charset="utf-8"><style>
  @page{size:Letter;margin:22mm 17mm 20mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#17233b;font-size:10.5pt;line-height:1.48;margin:0}h1{font-size:30pt;line-height:1.05;margin:0 0 12px;color:#11324d}h2{font-size:17pt;color:#11324d;border-bottom:2px solid #15a58b;padding-bottom:6px;margin:24px 0 12px}h3{font-size:11.5pt;margin:0 0 5px}p{white-space:pre-wrap;margin:0 0 10px}.cover{min-height:215mm;display:flex;flex-direction:column;justify-content:space-between}.brand{font-size:22pt;font-weight:800;letter-spacing:3px;color:#0a806f}.eyebrow{color:#0a806f;text-transform:uppercase;letter-spacing:1.5px;font-weight:700}.reference{font-size:11pt;color:#526273}.recipient{border-left:5px solid #15a58b;padding:14px 18px;background:#eff9f7}.issuer{text-align:right;color:#526273;font-size:9pt;max-width:70%;margin-left:auto;overflow-wrap:anywhere}.feature,.clause{break-inside:avoid;margin-bottom:14px}.feature{padding:12px 14px;background:#f3f7fa;border-left:3px solid #15a58b}.features{columns:2;column-gap:18px}.features li{break-inside:avoid;margin-bottom:8px}.features small{display:block;color:#667789}table{width:100%;border-collapse:collapse;margin:10px 0 16px}th{background:#11324d;color:#fff;text-align:left}th,td{padding:8px;border:1px solid #dce3e8;vertical-align:top}.money{text-align:right;white-space:nowrap}.totals{margin-left:auto;width:58%;background:#eff9f7;padding:10px 15px}.total{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #c7ddd8}.total.grand{font-size:13pt;border-top:2px solid #0a806f;border-bottom:0;margin-top:5px;padding-top:10px}.signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px}.signatures span{display:block;border-bottom:1px solid #17233b;height:38px}.page-break{break-before:page}.draft-mark{position:fixed;inset:43% -18% auto;transform:rotate(-28deg);font-size:31pt;font-weight:800;color:rgba(176,32,32,.13);text-align:center;z-index:-1}.draft-banner{background:#9f1d1d;color:#fff;padding:10px;text-align:center;font-weight:800;margin-bottom:16px}.draft-panel{border:3px solid #9f1d1d;padding:16px;background:#fff5f5}.meta{font-size:8.5pt;color:#647386;margin-top:24px;word-break:break-all}
  </style></head><body>${ready ? '' : `<div class="draft-mark">${labels.draft}</div><div class="draft-banner">${labels.draft}</div>`}<section class="cover"><div><div class="brand">CORO</div><p class="eyebrow">${escapeHtml(content.template.code)}</p><h1>${labels.title}</h1><p class="reference">${escapeHtml(content.proposalReference)} · v${content.proposalRevisionNumber}</p></div><div class="recipient"><small>${labels.preparedFor}</small><h2>${escapeHtml(recipient.displayName || recipient.legalName)}</h2><p>${escapeHtml(recipient.legalName)}</p></div>${issuerBlock}<p class="meta">Snapshot ${escapeHtml(content.proposalRevisionId)} · ${escapeHtml(content.schemaVersion)}</p></section>${solutions ? `<section class="page-break"><h2>${labels.solution}</h2>${solutions}</section>` : ''}${included ? `<section><h2>${labels.included}</h2><ul class="features">${included}</ul></section>` : ''}<section class="page-break"><h2>${labels.investment}</h2><table><thead><tr><th>${labels.component}</th><th>${labels.quantity}</th><th>${labels.cadence}</th><th>${labels.amount}</th></tr></thead><tbody>${lineRows}</tbody></table><div class="totals">${totalRows}</div></section>${ready && clauses ? `<section class="page-break"><h2>${labels.terms}</h2>${clauses}</section>` : ''}${acceptance}</body></html>`;
}

@Injectable()
export class GovernedProposalPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AdminAuditService,
  ) {}

  async generate(
    proposalId: string,
    revisionId: string,
    snapshotId: string,
    idempotencyKey: string,
    actor: { userId: string },
  ) {
    const snapshot =
      await this.prisma.proposalDocumentCompositionSnapshot.findFirst({
        where: {
          id: snapshotId,
          proposalRevisionId: revisionId,
          proposalRevision: { proposalId },
        },
        include: { proposalRevision: { include: { proposal: true } } },
      });
    if (!snapshot) throw new NotFoundException('Composition introuvable.');
    if (snapshot.templateCode !== 'CORO_PROFESSIONAL')
      throw new ConflictException('D01 supporte CORO_PROFESSIONAL uniquement.');
    const normalizedKey = idempotencyKey.trim();
    if (!normalizedKey)
      throw new ConflictException("Clé d'idempotence PDF requise.");
    const generationKey = `${snapshot.id}:GOVERNED_PDF_V2:${normalizedKey}`;
    const lockKey = `${snapshot.id}:GOVERNED_PDF_V2`;
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const existing = await tx.proposalDocument.findUnique({
        where: { generationKey },
      });
      if (existing) {
        const leaseExpired =
          existing.status === 'GENERATING' &&
          existing.generationLeaseUntil !== null &&
          existing.generationLeaseUntil.getTime() <= Date.now();
        if (existing.status !== 'FAILED' && !leaseExpired)
          return { document: existing, generate: false };
        return {
          document: await tx.proposalDocument.update({
            where: { id: existing.id },
            data: {
              status: 'GENERATING',
              failedAt: null,
              failureCode: null,
              generationStartedAt: new Date(),
              generationLeaseUntil: new Date(Date.now() + 120000),
            },
          }),
          generate: true,
        };
      }
      const version =
        (
          await tx.proposalDocument.aggregate({
            where: {
              proposalRevisionId: revisionId,
              type: 'OFFER',
              language: snapshot.language,
            },
            _max: { artifactVersion: true },
          })
        )._max.artifactVersion ?? 0;
      const id = randomUUID();
      const artifactVersion = version + 1;
      return {
        document: await tx.proposalDocument.create({
          data: {
            id,
            proposalRevisionId: revisionId,
            type: 'OFFER',
            language: snapshot.language,
            artifactVersion,
            status: 'GENERATING',
            fileName: `${snapshot.proposalRevision.proposal.reference}-${snapshot.language}-V2-${artifactVersion}.pdf`,
            mimeType: 'application/pdf',
            storageKey: `commercial-proposals/${proposalId}/${revisionId}/governed-v2/${id}.pdf`,
            templateVersion: GOVERNED_PROPOSAL_PDF_TEMPLATE_VERSION,
            generatorVersion: GOVERNED_PROPOSAL_PDF_GENERATOR_VERSION,
            generationKey,
            generationStartedAt: new Date(),
            generationLeaseUntil: new Date(Date.now() + 120000),
            createdByUserId: actor.userId,
            compositionSnapshotId: snapshot.id,
            compositionSnapshotHash: snapshot.canonicalHash,
            compositionReadiness: snapshot.readiness,
          },
        }),
        generate: true,
      };
    });
    if (!reservation.generate) {
      if (reservation.document.status !== 'GENERATING')
        return reservation.document;
      return this.waitForGeneration(reservation.document.id);
    }
    try {
      const content =
        snapshot.snapshot as unknown as ProposalDocumentCompositionContent;
      const diagnostics =
        snapshot.diagnostics as unknown as CompositionDiagnostic[];
      const html = renderGovernedProposalHtml(
        content,
        diagnostics,
        snapshot.readiness,
      );
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      let bytes: Buffer;
      try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          if (request.url().startsWith('data:')) void request.continue();
          else void request.abort();
        });
        await page.setContent(html, { waitUntil: 'load' });
        bytes = Buffer.from(
          await page.pdf({
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: `<div style="width:100%;font:8px Arial;color:#647386;padding:0 17mm;display:flex;justify-content:space-between"><span>${escapeHtml(snapshot.proposalRevision.proposal.reference)} · ${escapeHtml(snapshot.language)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
            margin: {
              top: '18mm',
              right: '17mm',
              bottom: '20mm',
              left: '17mm',
            },
          }),
        );
      } finally {
        await browser.close();
      }
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      await this.storage.uploadPrivateImmutable(
        bytes,
        reservation.document.storageKey,
        'application/pdf',
      );
      return await this.prisma.$transaction(async (tx) => {
        const document = await tx.proposalDocument.update({
          where: { id: reservation.document.id },
          data: {
            status: 'FINALIZED',
            sizeBytes: bytes.length,
            sha256,
            generatedAt: new Date(),
            generationLeaseUntil: null,
          },
        });
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'GOVERNED_PROPOSAL_PDF_V2_GENERATED',
          targetType: 'ProposalDocument',
          targetId: document.id,
          organizationId: snapshot.proposalRevision.proposal.organizationId,
          afterData: {
            proposalId,
            revisionId,
            compositionSnapshotId: snapshot.id,
            compositionSnapshotHash: snapshot.canonicalHash,
            compositionReadiness: snapshot.readiness,
            templateVersion: document.templateVersion,
            artifactVersion: document.artifactVersion,
            sha256,
            sizeBytes: bytes.length,
          },
        });
        return document;
      });
    } catch {
      await this.prisma.proposalDocument
        .update({
          where: { id: reservation.document.id },
          data: {
            status: 'FAILED',
            failureCode: 'GOVERNED_PDF_V2_GENERATION_FAILED',
            failedAt: new Date(),
            generationLeaseUntil: null,
          },
        })
        .catch(() => undefined);
      throw new ConflictException('Génération PDF V2 échouée.');
    }
  }

  async download(
    proposalId: string,
    revisionId: string,
    snapshotId: string,
    documentId: string,
  ) {
    const document = await this.prisma.proposalDocument.findFirst({
      where: {
        id: documentId,
        proposalRevisionId: revisionId,
        compositionSnapshotId: snapshotId,
        status: 'FINALIZED',
        templateVersion: GOVERNED_PROPOSAL_PDF_TEMPLATE_VERSION,
        proposalRevision: { proposalId },
      },
    });
    if (!document) throw new NotFoundException('Document V2 introuvable.');
    const buffer = await this.storage.downloadPrivate(document.storageKey);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    if (
      document.sizeBytes !== buffer.length ||
      !document.sha256 ||
      document.sha256 !== sha256
    )
      throw new ConflictException('Intégrité du document V2 invalide.');
    return {
      buffer,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  private async waitForGeneration(id: string) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const document = await this.prisma.proposalDocument.findUnique({
        where: { id },
      });
      if (document && document.status !== 'GENERATING') return document;
    }
    return this.prisma.proposalDocument.findUniqueOrThrow({ where: { id } });
  }
}
