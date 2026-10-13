import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalDocumentCompositionService } from '../proposal-document-composition/proposal-document-composition.service';
import {
  CommercialBindingError,
  CommercialRuleRegistry,
  validateCommercialQuantityBinding,
} from './commercial-rule-registry';
import { buildProposalCustomerPreview } from './proposal-customer-preview';
import { calculateProposalTemporalTerms } from './proposal-temporal-terms';
import {
  ProposalGateBlocker,
  ProposalGatePhase,
} from './proposal-issuance-readiness.types';

type Database = Prisma.TransactionClient | PrismaService;

const blocker = (
  code: string,
  labelFR: string,
  labelEN: string,
  explanation: string,
  authority: string,
  correctiveAction: string,
  navigationTarget?: string,
): ProposalGateBlocker => ({
  code,
  severity: 'BLOCKING',
  labelFR,
  labelEN,
  explanation,
  authority,
  correctiveAction,
  navigationTarget,
});

const reviewFinding = (
  code: string,
  explanation: string,
  authority: string,
  correctiveAction: string,
  navigationTarget?: string,
): ProposalGateBlocker => ({
  code,
  severity: 'REVIEW',
  labelFR: 'Revue humaine requise',
  labelEN: 'Human review required',
  explanation,
  authority,
  correctiveAction,
  navigationTarget,
});

@Injectable()
export class ProposalIssuanceReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compositions: ProposalDocumentCompositionService,
    private readonly commercialRules: CommercialRuleRegistry,
  ) {}

  evaluate(
    proposalId: string,
    revisionId: string,
    documentId?: string,
    phase: ProposalGatePhase = 'APPROVAL',
  ) {
    return this.evaluateWith(
      this.prisma,
      proposalId,
      revisionId,
      documentId,
      phase,
    );
  }

  async evaluateWith(
    db: Database,
    proposalId: string,
    revisionId: string,
    documentId?: string,
    phase: ProposalGatePhase = 'APPROVAL',
  ) {
    const revision = await db.commercialProposalRevision.findFirst({
      where: { id: revisionId, proposalId },
      include: {
        proposal: true,
        createdBy: true,
        sourcePriceBookVersion: true,
        lines: { include: { capability: true } },
        inputs: true,
        exclusivities: { include: { sectors: true } },
        commitments: true,
        valueAnalysis: true,
        temporalTerms: true,
        simulationConversion: {
          include: { scenario: { include: { families: true } } },
        },
      },
    });
    if (!revision)
      throw new NotFoundException('Proposal revision introuvable.');

    const blockers: ProposalGateBlocker[] = [];
    const latest = await db.commercialProposalRevision.findFirst({
      where: { proposalId },
      orderBy: { revisionNumber: 'desc' },
      select: { id: true },
    });
    if (latest?.id !== revision.id)
      blockers.push(
        blocker(
          'PROPOSAL_REVISION_STALE',
          'Une révision plus récente existe',
          'A newer revision exists',
          'Seule la révision courante peut être approuvée ou émise.',
          'CommercialProposalRevision',
          'Ouvrir la dernière révision.',
          `/admin/commercial/proposals/${proposalId}`,
        ),
      );
    const allowedStatus = phase === 'APPROVAL' ? 'INTERNAL_REVIEW' : 'READY';
    if (revision.status !== allowedStatus)
      blockers.push(
        blocker(
          'PROPOSAL_STATUS_INVALID',
          'Étape du cycle de vie incorrecte',
          'Invalid lifecycle step',
          `${phase === 'APPROVAL' ? 'L’approbation exige une revue interne.' : 'L’émission exige une proposition approuvée.'}`,
          'CommercialProposalRevision',
          phase === 'APPROVAL'
            ? 'Commencer la revue interne.'
            : 'Approuver explicitement la révision.',
          `/admin/commercial/proposals/${proposalId}#e01-governance`,
        ),
      );
    if (
      Boolean(revision.proposal.organizationId) ===
      Boolean(revision.proposal.prospectId)
    )
      blockers.push(
        blocker(
          'PROPOSAL_TARGET_INVALID',
          'Destinataire commercial invalide',
          'Invalid commercial recipient',
          'La proposition doit viser exactement une organisation ou un prospect.',
          'CommercialProposal',
          'Corriger le dossier commercial source.',
        ),
      );
    if (!revision.simulationConversion?.scenario.families.length)
      blockers.push(
        blocker(
          'COMMERCIAL_FAMILY_MISSING',
          'Famille commerciale non résolue',
          'Commercial family unresolved',
          'La composition familiale canonique est absente.',
          'CommercialSimulationScenarioFamily',
          'Résoudre et enregistrer la famille dans le Configurateur.',
          '/admin/commercial/configurator',
        ),
      );
    if (
      !revision.sourcePriceBookVersion ||
      ['DRAFT', 'CANCELLED'].includes(revision.sourcePriceBookVersion.status)
    )
      blockers.push(
        blocker(
          'PRICEBOOK_AUTHORITY_INVALID',
          'Autorité tarifaire invalide',
          'Invalid pricing authority',
          'Le calcul officiel ne référence pas une version tarifaire publiable.',
          'PriceBookVersion',
          'Recalculer officiellement depuis une version tarifaire admissible.',
          '/admin/commercial/configuration',
        ),
      );
    if (!revision.calculatedAt || revision.firstYearCommitmentMinor === null)
      blockers.push(
        blocker(
          'OFFICIAL_CALCULATION_MISSING',
          'Calcul commercial officiel manquant',
          'Official commercial calculation missing',
          'Le montant de première année doit provenir du calcul officiel.',
          'CommercialProposalRevision',
          'Exécuter et conserver le calcul officiel.',
          '/admin/commercial/configurator',
        ),
      );
    try {
      for (const line of revision.lines) {
        if (line.calculationStatus === 'TBD')
          throw new CommercialBindingError('PRICING_CONFIGURATION_INCOMPLETE');
        validateCommercialQuantityBinding(
          { ...line, capabilityCode: line.capability?.code },
          this.commercialRules,
          { requireExplicit: true, requireCurrentRule: true },
        );
      }
      buildProposalCustomerPreview(revision);
    } catch (error) {
      blockers.push(
        blocker(
          error instanceof CommercialBindingError
            ? 'COMMERCIAL_QUANTITY_INVALID'
            : 'PRICING_CONFIGURATION_INCOMPLETE',
          'Configuration commerciale incomplète',
          'Incomplete commercial configuration',
          'Une quantité, une dépendance ou un résultat tarifaire reste non résolu.',
          'ProposalLine',
          'Corriger le scénario et recalculer officiellement.',
          '/admin/commercial/configurator',
        ),
      );
    }

    if (!revision.temporalTerms) {
      blockers.push(
        blocker(
          'TEMPORAL_TERMS_MISSING',
          'Dates contractuelles manquantes',
          'Contractual dates missing',
          'Les conditions temporelles gouvernées ne sont pas configurées.',
          'CommercialProposalTemporalTerms',
          'Renseigner les dates et conditions de l’offre.',
          `/admin/commercial/proposals/${proposalId}#temporal-terms`,
        ),
      );
    } else {
      const temporal = calculateProposalTemporalTerms({
        createdAt: revision.createdAt,
        sentAt: revision.sentAt,
        acceptedAt: revision.acceptedAt,
        serviceStartDate: revision.temporalTerms.serviceStartDate,
        initialInvoiceDate: revision.temporalTerms.initialInvoiceDate,
        externalSignatureDate: revision.temporalTerms.externalSignatureDate,
        externalSignatureEvidence:
          revision.temporalTerms.externalSignatureEvidence,
        offerValidityDays: revision.temporalTerms.offerValidityDays,
        initialTermMonths: revision.temporalTerms.initialTermMonths,
        paymentNetDays: revision.temporalTerms.paymentNetDays,
        automaticRenewal: revision.temporalTerms.automaticRenewal,
        nonrenewalNoticeDays: revision.temporalTerms.nonrenewalNoticeDays,
        renewalTermMonths: revision.temporalTerms.renewalTermMonths,
        contractualTimezone: revision.temporalTerms.contractualTimezone,
        calendarConventionVersion:
          revision.temporalTerms.calendarConventionVersion,
      });
      for (const code of temporal.blockers)
        blockers.push(
          blocker(
            code,
            'Condition temporelle à compléter',
            'Temporal condition requires completion',
            'Une date ou condition gouvernée requise demeure incomplète.',
            'CommercialProposalTemporalTerms',
            'Compléter les dates de l’offre.',
            `/admin/commercial/proposals/${proposalId}#temporal-terms`,
          ),
        );
    }

    const document = documentId
      ? await db.proposalDocument.findFirst({
          where: { id: documentId, proposalRevisionId: revisionId },
        })
      : await db.proposalDocument.findFirst({
          where: {
            proposalRevisionId: revisionId,
            status: 'FINALIZED',
            compositionReadiness: 'ISSUANCE_READY',
            compositionSnapshotId: { not: null },
          },
          orderBy: [{ artifactVersion: 'desc' }, { createdAt: 'desc' }],
        });
    if (!document || document.status !== 'FINALIZED')
      blockers.push(
        blocker(
          'GOVERNED_PDF_MISSING',
          'PDF gouverné final manquant',
          'Final governed PDF missing',
          'Aucun PDF D01 finalisé n’est disponible pour cette révision.',
          'ProposalDocument',
          'Composer C01 puis générer le PDF V2.',
          `/admin/commercial/proposals/${proposalId}#document-workspace`,
        ),
      );
    else if (
      !document.compositionSnapshotId ||
      document.compositionReadiness !== 'ISSUANCE_READY' ||
      !document.sha256 ||
      document.sha256.length !== 64 ||
      !document.sizeBytes
    )
      blockers.push(
        blocker(
          'GOVERNED_PDF_INVALID',
          'Intégrité du PDF gouverné invalide',
          'Governed PDF integrity invalid',
          'Le document ne possède pas toute la provenance et l’intégrité D01.',
          'ProposalDocument',
          'Générer un nouveau PDF V2 depuis une composition admissible.',
          `/admin/commercial/proposals/${proposalId}#document-workspace`,
        ),
      );
    else {
      const evaluated = await this.compositions.evaluateCurrent(
        db,
        proposalId,
        revisionId,
        document.compositionSnapshotId,
      );
      const latestComposition =
        await db.proposalDocumentCompositionSnapshot.findFirst({
          where: {
            proposalRevisionId: revisionId,
            templateCode: evaluated.snapshot.templateCode,
            language: evaluated.snapshot.language,
          },
          orderBy: [{ sequence: 'desc' }, { composedAt: 'desc' }],
          select: { id: true },
        });
      if (
        !evaluated.current.issuanceReady ||
        evaluated.current.canonicalHash !== evaluated.snapshot.canonicalHash ||
        document.compositionSnapshotHash !== evaluated.snapshot.canonicalHash ||
        latestComposition?.id !== evaluated.snapshot.id
      )
        blockers.push(
          blocker(
            'C01_SNAPSHOT_STALE',
            'Composition documentaire périmée',
            'Document composition is stale',
            'Le PDF ne correspond plus aux autorités approuvées et à la révision courante.',
            'ProposalDocumentCompositionSnapshot',
            'Composer un nouveau snapshot C01 et régénérer le PDF D01.',
            `/admin/commercial/proposals/${proposalId}#document-workspace`,
          ),
        );
      for (const diagnostic of evaluated.current.diagnostics.filter(
        ({ severity }) => severity === 'WARNING',
      ))
        blockers.push(
          reviewFinding(
            diagnostic.code,
            'La composition contient un avertissement qui exige une revue explicite.',
            'ProposalDocumentCompositionSnapshot',
            'Examiner le diagnostic documentaire et recomposer si nécessaire.',
            `/admin/commercial/proposals/${proposalId}#document-workspace`,
          ),
        );
    }

    if (phase === 'ISSUANCE' && document) {
      const approval = await db.adminAuditEvent.findFirst({
        where: {
          targetType: 'CommercialProposalRevision',
          targetId: revisionId,
          action: 'PROPOSAL_READY',
        },
        orderBy: { createdAt: 'desc' },
        select: { afterData: true },
      });
      const evidence =
        approval?.afterData &&
        typeof approval.afterData === 'object' &&
        !Array.isArray(approval.afterData)
          ? (approval.afterData as Record<string, unknown>)
          : null;
      if (evidence?.documentId !== document.id)
        blockers.push(
          blocker(
            'APPROVED_DOCUMENT_MISMATCH',
            'Le document ne correspond pas à l’approbation',
            'Document does not match approval',
            'L’émission doit utiliser exactement le PDF approuvé.',
            'AdminAuditEvent',
            'Sélectionner le document approuvé ou reprendre la revue.',
            `/admin/commercial/proposals/${proposalId}#e01-governance`,
          ),
        );
    }

    return {
      status: blockers.some(({ severity }) => severity === 'BLOCKING')
        ? ('BLOCKED' as const)
        : blockers.length
          ? ('NEEDS_REVIEW' as const)
          : ('READY' as const),
      phase,
      proposalId,
      revisionId,
      revisionNumber: revision.revisionNumber,
      revisionStatus: revision.status,
      document: document
        ? {
            id: document.id,
            fileName: document.fileName,
            artifactVersion: document.artifactVersion,
            compositionSnapshotId: document.compositionSnapshotId,
          }
        : null,
      blockers,
    };
  }
}
