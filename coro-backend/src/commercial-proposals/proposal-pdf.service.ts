import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { buildProposalCustomerPreview } from './proposal-customer-preview';
import { CustomerSafeCommercialProjection } from './customer-safe-commercial-projection';

const esc = (v: unknown) => {
  let display = '';
  if (typeof v === 'string') display = v;
  else if (
    typeof v === 'number' ||
    typeof v === 'bigint' ||
    typeof v === 'boolean'
  )
    display = v.toString();
  else if (v instanceof Date) display = v.toISOString();
  else if (v != null && typeof v === 'object')
    display = JSON.stringify(v) ?? '';
  return display.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
};
const money = (v: bigint | null | undefined) => {
  if (v == null) return '—';
  const dollars = (v / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const cents = (v % 100n).toString().padStart(2, '0');
  return `${dollars},${cents} $ CAD`;
};

@Injectable()
export class ProposalPdfService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AdminAuditService,
  ) {}
  async generate(
    revisionId: string,
    language: 'FR' | 'EN',
    idempotencyKey: string,
    actor: { userId: string },
  ) {
    const r = await this.prisma.commercialProposalRevision.findUnique({
      where: { id: revisionId },
      include: {
        proposal: true,
        lines: {
          include: { tiers: true, adjustments: true, capability: true },
        },
        inputs: true,
        adjustments: true,
        exclusivities: {
          include: {
            sectors: true,
            capabilities: { include: { capability: true } },
          },
        },
        commitments: true,
        valueAnalysis: true,
      },
    });
    if (!r) throw new NotFoundException();
    const normalizedKey = idempotencyKey.trim();
    if (!normalizedKey)
      throw new ConflictException("Clé d'idempotence PDF requise.");
    const generationKey = `${revisionId}:OFFER:${language}:${normalizedKey}`;
    const lockKey = `${revisionId}:OFFER:${language}`;
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const existing = await tx.proposalDocument.findUnique({
        where: { generationKey },
      });
      if (existing) {
        const leaseExpired =
          existing.status === 'GENERATING' &&
          existing.generationLeaseUntil != null &&
          existing.generationLeaseUntil.getTime() <= Date.now();
        if (existing.status !== 'FAILED' && !leaseExpired)
          return { document: existing, shouldGenerate: false };
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
          shouldGenerate: true,
        };
      }
      const version =
        (
          await tx.proposalDocument.aggregate({
            where: { proposalRevisionId: revisionId, type: 'OFFER', language },
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
            language,
            artifactVersion,
            status: 'GENERATING',
            fileName: `${r.proposal.reference}-${language}-v${artifactVersion}.pdf`,
            mimeType: 'application/pdf',
            storageKey: `commercial-proposals/${r.proposalId}/${revisionId}/${id}-${language}.pdf`,
            templateVersion: 'proposal-offer/v2',
            generatorVersion: 'puppeteer/v1',
            generationKey,
            generationStartedAt: new Date(),
            generationLeaseUntil: new Date(Date.now() + 120000),
            createdByUserId: actor.userId,
          },
        }),
        shouldGenerate: true,
      };
    });
    if (!reservation.shouldGenerate) {
      if (reservation.document.status !== 'GENERATING')
        return reservation.document;
      return this.waitForGeneration(reservation.document.id);
    }
    const doc = reservation.document;
    const { id, artifactVersion, storageKey: key } = doc;
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      let bytes: Buffer;
      try {
        const page = await browser.newPage();
        await page.setContent(
          this.html(buildProposalCustomerPreview(r), language),
          { waitUntil: 'load' },
        );
        bytes = Buffer.from(
          await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
              top: '24mm',
              right: '18mm',
              bottom: '20mm',
              left: '18mm',
            },
          }),
        );
      } finally {
        await browser.close();
      }
      const sha = createHash('sha256').update(bytes).digest('hex');
      await this.storage.uploadPrivateImmutable(bytes, key, 'application/pdf');
      const finalized = await this.prisma.$transaction(async (tx) => {
        const x = await tx.proposalDocument.update({
          where: { id },
          data: {
            status: 'FINALIZED',
            sizeBytes: bytes.length,
            sha256: sha,
            generatedAt: new Date(),
            generationLeaseUntil: null,
          },
        });
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'PROPOSAL_PDF_GENERATED',
          targetType: 'ProposalDocument',
          targetId: id,
          organizationId: r.proposal.organizationId,
          afterData: { revisionId, language, artifactVersion, sha256: sha },
        });
        return x;
      });
      return finalized;
    } catch {
      await this.prisma.proposalDocument
        .update({
          where: { id: doc.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureCode: 'GENERATION_FAILED',
            generationLeaseUntil: null,
          },
        })
        .catch(() => undefined);
      throw new ConflictException('Génération PDF échouée.');
    }
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
  private html(r: CustomerSafeCommercialProjection, lang: 'FR' | 'EN') {
    const fr = lang === 'FR';
    const rows = r.lines
      .map(
        (l) =>
          `<tr><td><b>${esc(fr ? l.labelFr : l.labelEn || l.labelFr)}</b>${(fr ? l.descriptionFr : l.descriptionEn) ? `<small>${esc(fr ? l.descriptionFr : l.descriptionEn)}</small>` : ''}</td><td>${esc(l.quantity)} ${esc(fr ? l.quantityLabelFr : l.quantityLabelEn)}</td><td>${esc(fr ? l.cadenceFr : l.cadenceEn)}</td><td>${money(l.offeredExtendedAmountMinor == null ? null : BigInt(l.offeredExtendedAmountMinor))}</td></tr>`,
      )
      .join('');
    const inputs = r.inputs
      .map(
        (i) =>
          `<li><b>${esc(fr ? i.labelFr : i.labelEn || i.labelFr)}</b>: ${esc(i.value)} ${esc(i.unit)}</li>`,
      )
      .join('');
    const exclusivities = r.exclusivities
      .map(
        (item) =>
          `<li>${esc(item.territory)} · ${esc(item.sectors.join(', '))}</li>`,
      )
      .join('');
    const commitments = r.commitments
      .map(
        (item) =>
          `<li>${esc(fr ? item.labelFr : item.labelEn)} · ${esc(item.value)}</li>`,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#17233b;font-size:11px}header{border-bottom:4px solid #14a389;padding-bottom:18px}h1{font-size:28px;margin:8px 0}.tag{color:#14a389;font-weight:bold}section{margin-top:24px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#eef7f5}small{display:block;color:#667}.price{background:#eef7f5;padding:16px}.value{background:#fff4d9;padding:16px;border-left:4px solid #d69b00}.muted{color:#667}</style></head><body><header><div class="tag">CORO</div><div>Résilience · Conformité · Action</div><h1>${fr ? 'Proposition commerciale' : 'Commercial proposal'}</h1><div>${esc(r.customer.displayName)} · ${esc(r.reference)} · v${esc(r.revision)}</div><div class="muted">${fr ? 'Valide jusqu’au' : 'Valid until'} ${esc(r.validity.validUntil?.slice(0, 10) || '—')}</div></header><section><h2>${fr ? 'Solution proposée' : 'Proposed solution'}</h2><p>${esc(fr ? r.commercialTerms.contextFr : r.commercialTerms.contextEn || r.commercialTerms.contextFr)}</p><table><thead><tr><th>${fr ? 'Composant' : 'Component'}</th><th>${fr ? 'Quantité' : 'Quantity'}</th><th>${fr ? 'Cadence' : 'Cadence'}</th><th>${fr ? 'Prix offert' : 'Offered price'}</th></tr></thead><tbody>${rows}</tbody></table></section><section class="price"><h2>${fr ? 'PRIX' : 'PRICE'}</h2><p>${fr ? 'Frais ponctuels' : 'One-time fees'}: ${money(r.totals.oneTimeMinor == null ? null : BigInt(r.totals.oneTimeMinor))}<br>${fr ? 'Récurrent mensuel' : 'Monthly recurring'}: ${money(r.totals.monthlyRecurringMinor == null ? null : BigInt(r.totals.monthlyRecurringMinor))}<br>${fr ? 'Équivalent annuel récurrent' : 'Annual recurring equivalent'}: ${money(r.totals.annualRecurringEquivalentMinor == null ? null : BigInt(r.totals.annualRecurringEquivalentMinor))}<br>${fr ? 'Engagement première année' : 'First-year commitment'}: ${money(r.totals.firstYearMinor == null ? null : BigInt(r.totals.firstYearMinor))}</p></section>${inputs ? `<section><h2>${fr ? 'Données déclarées' : 'Declared data'}</h2><ul>${inputs}</ul></section>` : ''}${exclusivities ? `<section><h2>${fr ? 'Exclusivité' : 'Exclusivity'}</h2><ul>${exclusivities}</ul></section>` : ''}${commitments ? `<section><h2>${fr ? 'Engagements' : 'Commitments'}</h2><ul>${commitments}</ul></section>` : ''}${r.valueAnalysis ? `<section class="value"><h2>${fr ? 'VALEUR ESTIMÉE' : 'ESTIMATED VALUE'}</h2><p>${money(BigInt(r.valueAnalysis.estimatedCapacityValueMinor))}</p><p>${esc(fr ? r.valueAnalysis.disclaimerFr : r.valueAnalysis.disclaimerEn || r.valueAnalysis.disclaimerFr)}</p></section>` : ''}<section><h2>${fr ? 'Conditions et acceptation' : 'Terms and acceptance'}</h2><p>${esc(fr ? r.commercialTerms.termsFr : r.commercialTerms.termsEn || r.commercialTerms.termsFr)}</p><p>${fr ? 'Accepté par' : 'Accepted by'}: ____________________</p></section></body></html>`;
  }
}
