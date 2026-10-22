#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requireFromBackend = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = requireFromBackend('@prisma/client');

if (!process.env.DATABASE_URL || !process.env.CORO_QA_ACTOR_FILE) {
  throw new Error('DATABASE_URL and CORO_QA_ACTOR_FILE are required.');
}

const ids = JSON.parse(await readFile(process.env.CORO_QA_ACTOR_FILE, 'utf8'));
const prisma = new PrismaClient();
const now = new Date('2026-10-22T12:00:00.000Z');
const nextYear = new Date('2027-10-22T12:00:00.000Z');

try {
  const capability = await prisma.commercialCapability.upsert({
    where: { code: 'NETWORK' },
    update: {},
    create: {
      code: 'NETWORK', nameFr: 'CORO Network QA synthétique', nameEn: 'Synthetic CORO Network QA',
      descriptionFr: 'Fixture synthétique non officielle pour la continuité commerciale.',
      descriptionEn: 'Non-official synthetic fixture for commercial continuity.',
      lifecycle: 'CURRENT', isAvailable: true, displayOrder: 900,
    },
  });
  const book = await prisma.priceBook.upsert({
    where: { code: 'QA_SYNTHETIC_MASTER_A' },
    update: {},
    create: { code: 'QA_SYNTHETIC_MASTER_A', name: 'QA synthétique — non officiel', audience: 'DIRECT', currency: 'CAD' },
  });
  let version = await prisma.priceBookVersion.findFirst({
    where: { priceBookId: book.id, components: { some: { code: 'QA_NETWORK_MONTHLY' } } },
  });
  if (!version) {
    const latest = await prisma.priceBookVersion.findFirst({ where: { priceBookId: book.id }, orderBy: { versionNumber: 'desc' } });
    version = await prisma.priceBookVersion.create({ data: {
      priceBookId: book.id, versionNumber: (latest?.versionNumber ?? 0) + 1, status: 'DRAFT',
      createdByUserId: ids.founder, createdByDisplayName: 'QA Founder',
    } });
  }
  let component = await prisma.priceComponent.findFirst({ where: { priceBookVersionId: version.id, code: 'QA_NETWORK_MONTHLY' } });
  if (!component) component = await prisma.priceComponent.create({ data: {
    priceBookVersionId: version.id, capabilityId: capability.id, code: 'QA_NETWORK_MONTHLY',
    nameFr: 'Network mensuel QA', nameEn: 'QA monthly Network', pricingModel: 'FLAT',
    chargeType: 'RECURRING', revenueCategory: 'SAAS', billingPeriod: 'MONTH',
    amountMinor: 10000n, displayOrder: 0,
  } });
  if (version.status !== 'ACTIVE') version = await prisma.priceBookVersion.update({
    where: { id: version.id }, data: { status: 'ACTIVE', effectiveFrom: now, publishedAt: now },
  });
  let proposal = await prisma.commercialProposal.findUnique({ where: { reference: 'QA-MASTER-A-PROP' } });
  if (!proposal) proposal = await prisma.commercialProposal.create({ data: {
    reference: 'QA-MASTER-A-PROP', title: 'Proposition synthétique MASTER A',
    organizationId: ids.orgA, status: 'OPEN', createdByUserId: ids.founder,
  } });
  let proposalRevision = await prisma.commercialProposalRevision.findFirst({ where: { proposalId: proposal.id, revisionNumber: 1 } });
  if (!proposalRevision) proposalRevision = await prisma.commercialProposalRevision.create({ data: {
    proposalId: proposal.id, revisionNumber: 1, status: 'SENT',
    sourcePriceBookId: book.id, sourcePriceBookVersionId: version.id,
    priceBookCodeSnapshot: book.code, priceBookNameSnapshot: book.name,
    priceBookVersionSnapshot: version.versionNumber, audienceSnapshot: book.audience,
    relationshipSnapshot: 'DIRECT', currency: 'CAD', validFrom: now, validUntil: nextYear,
    recipientLegalName: 'Organisation QA A', recipientDisplayName: 'Organisation QA A',
    recipientCountry: 'CA', recipientPreferredLanguage: 'FR', calculationVersion: 'qa-synthetic/v1',
    calculatedAt: now, sentAt: now, lifecycleReason: 'Fixture QA synthétique',
    createdByUserId: ids.founder,
  } });
  if (proposalRevision.status !== 'ACCEPTED') {
    const sentDocument = await prisma.proposalDocument.findFirst({
      where: { proposalRevisionId: proposalRevision.id, type: 'OFFER', language: 'FR' },
    }) ?? await prisma.proposalDocument.create({ data: {
      proposalRevisionId: proposalRevision.id, type: 'OFFER', language: 'FR', status: 'FINALIZED',
      fileName: 'qa-synthetic-offer.pdf', mimeType: 'application/pdf', sizeBytes: 1,
      storageKey: `qa-commercial/${proposalRevision.id}/offer.pdf`,
      sha256: '0'.repeat(64), templateVersion: 'qa-synthetic/v1', generatorVersion: 'qa-synthetic/v1',
      generationKey: `qa-commercial-${proposalRevision.id}`, generationStartedAt: now,
      generatedAt: now, createdByUserId: ids.founder,
    } });
    proposalRevision = await prisma.commercialProposalRevision.update({ where: { id: proposalRevision.id }, data: {
      status: 'ACCEPTED', sentDocumentId: sentDocument.id, acceptedAt: now,
      acceptanceOccurredAt: now, acceptedByName: 'Client QA autorisé',
      acceptedByAuthority: 'Synthetic QA authority', acceptanceReference: 'QA-ACCEPTANCE-NOT-LEGAL',
      lifecycleReason: 'Fixture QA synthétique', lockVersion: { increment: 1 },
    } });
  }
  if (proposal.acceptedRevisionId !== proposalRevision.id) {
    proposal = await prisma.commercialProposal.update({ where: { id: proposal.id }, data: {
      status: 'ACCEPTED', acceptedRevisionId: proposalRevision.id, acceptedAt: now,
      lockVersion: { increment: 1 },
    } });
  }
  let contract = await prisma.organizationContract.findUnique({ where: { reference: 'QA-MASTER-A-CONTRACT' } });
  if (!contract) contract = await prisma.organizationContract.create({ data: {
    organizationId: ids.orgA, reference: 'QA-MASTER-A-CONTRACT', title: 'Contrat synthétique MASTER A',
    status: 'ACTIVE', isPrimary: true, approvedAt: now, activatedAt: now,
    lifecycleReason: 'Fixture QA synthétique non juridique', createdByUserId: ids.founder,
  } });
  let contractRevision = await prisma.organizationContractRevision.findFirst({ where: { contractId: contract.id, revisionNumber: 1 } });
  if (contractRevision && contractRevision.status !== 'DRAFT') {
    const existingSnapshot = await prisma.contractPriceSnapshotLine.findFirst({ where: { contractRevisionId: contractRevision.id } });
    if (!existingSnapshot) {
      await prisma.organizationContractRevision.delete({ where: { id: contractRevision.id } });
      contractRevision = null;
    }
  }
  if (!contractRevision) contractRevision = await prisma.organizationContractRevision.create({ data: {
    contractId: contract.id, revisionNumber: 1, revisionType: 'INITIAL', status: 'DRAFT',
    priceBookVersionId: version.id, currency: 'CAD', effectiveFrom: now, termStartAt: now,
    termEndAt: nextYear, renewalMode: 'MANUAL', renewalTermMonths: 12,
    renewalNoticeDays: 30, billingCadence: 'MONTHLY',
    justification: 'Fixture QA synthétique', createdByUserId: ids.founder,
    sourceProposalRevisionId: proposalRevision.id,
  } });
  let snapshot = await prisma.contractPriceSnapshotLine.findFirst({ where: { contractRevisionId: contractRevision.id, componentCode: component.code } });
  if (!snapshot) snapshot = await prisma.contractPriceSnapshotLine.create({ data: {
    contractRevisionId: contractRevision.id, source: 'CATALOG_COMPONENT',
    sourcePriceComponentId: component.id, capabilityId: capability.id,
    componentCode: component.code, componentName: component.nameFr,
    pricingModel: component.pricingModel, chargeType: component.chargeType,
    revenueCategory: component.revenueCategory, billingPeriod: component.billingPeriod,
    currency: 'CAD', catalogAmountMinor: 10000n, contractAmountMinor: 10000n,
    quantity: '1', quantityUnit: 'organization', catalogExtendedAmountMinor: 10000n,
    contractExtendedAmountMinor: 10000n, calculationStatus: 'CALCULATED',
    calculationFormula: '1 × synthetic QA amount', calculationExplanation: 'Fixture synthétique, aucun prix officiel.',
    internalUse: false, distributable: false, displayOrder: 0,
  } });
  if (contractRevision.status !== 'SIGNED') contractRevision = await prisma.organizationContractRevision.update({
    where: { id: contractRevision.id }, data: {
      status: 'SIGNED', approvedAt: now, signedAt: now, signedByName: 'Signataire QA',
      signatureReference: 'QA-SIGNATURE-NOT-LEGAL', lockVersion: { increment: 1 },
    },
  });
  console.log(JSON.stringify({
    status: 'PASS', fixtureClassification: 'SYNTHETIC_PRECONDITION_NOT_OFFICIAL_PRICE',
    organizationId: ids.orgA, otherOrganizationId: ids.orgB, priceBookVersionId: version.id,
    proposalRevisionId: proposalRevision.id, contractId: contract.id,
    contractRevisionId: contractRevision.id, snapshotLineId: snapshot.id,
  }));
} finally {
  await prisma.$disconnect();
}
