import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveCommercialFamilyAuthority } from '../commercial-simulator/commercial-family-authority';
import { COMMERCIAL_FAMILY_REGISTRY } from '../commercial-simulator/commercial-family.registry';
import { CommercialDossierTargetType } from './commercial-dossier.dto';

const money = (value: bigint | null | undefined) => value?.toString() ?? null;
const COLLECTION_LIMIT = 100;
const DOCUMENT_LIMIT = 50;
type DossierStage =
  | 'OFFER_ISSUED'
  | 'CUSTOMER_ACCEPTANCE'
  | 'CONTRACT'
  | 'SIGNATURE_ACTIVATION'
  | 'MODULES_RIGHTS'
  | 'FINAL_VERIFICATION';

type EntitlementReadModelSource = {
  id: string;
  source: string;
  scope: string;
  sourceContractId: string | null;
  capability: { code: string; nameFr: string };
  revisions: Array<{
    versionNumber: number;
    lifecycle: string;
    enabled: boolean;
    distributable: boolean;
    effectiveFrom: Date;
    effectiveUntil: Date | null;
  }>;
};

@Injectable()
export class CommercialDossierService {
  constructor(private readonly prisma: PrismaService) {}

  async get(targetType: CommercialDossierTargetType, targetId: string) {
    const target =
      targetType === CommercialDossierTargetType.PROSPECT
        ? await this.prisma.commercialProspect.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              reference: true,
              displayName: true,
              legalName: true,
              status: true,
              convertedOrganizationId: true,
            },
          })
        : await this.prisma.organization.findUnique({
            where: { id: targetId },
            select: { id: true, name: true, isActive: true },
          });
    if (!target) throw new NotFoundException('Dossier commercial introuvable.');

    const targetWhere =
      targetType === CommercialDossierTargetType.PROSPECT
        ? { prospectId: targetId }
        : { organizationId: targetId };

    const [workspaces, proposals, contracts, entitlements] = await Promise.all([
      this.prisma.commercialSimulationWorkspace.findMany({
        where: targetWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: COLLECTION_LIMIT + 1,
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          selectedScenarioId: true,
          createdAt: true,
          updatedAt: true,
          scenarios: {
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
            take: COLLECTION_LIMIT + 1,
            select: {
              id: true,
              name: true,
              status: true,
              lockVersion: true,
              displayOrder: true,
              families: {
                orderBy: { displayOrder: 'asc' },
                select: { familyCode: true },
              },
              lines: {
                orderBy: { displayOrder: 'asc' },
                select: { componentCode: true },
              },
              capabilities: {
                orderBy: { displayOrder: 'asc' },
                select: {
                  capability: { select: { code: true, nameFr: true } },
                },
              },
              runs: {
                orderBy: [{ calculatedAt: 'desc' }, { sequence: 'desc' }],
                take: 1,
                select: {
                  id: true,
                  scenarioLockVersion: true,
                  priceStatus: true,
                  calculatedAt: true,
                  priceResult: {
                    select: {
                      oneTimeTotalMinor: true,
                      annualRecurringEquivalentMinor: true,
                      firstYearCommitmentMinor: true,
                    },
                  },
                  conversion: {
                    select: {
                      convertedAt: true,
                      proposalId: true,
                      proposalRevisionId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.commercialProposal.findMany({
        where: targetWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: COLLECTION_LIMIT + 1,
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          organizationId: true,
          prospectId: true,
          acceptedRevisionId: true,
          createdAt: true,
          updatedAt: true,
          simulationConversion: {
            select: {
              workspaceId: true,
              scenarioId: true,
              calculationRunId: true,
            },
          },
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            select: {
              id: true,
              revisionNumber: true,
              status: true,
              validFrom: true,
              validUntil: true,
              oneTimeTotalMinor: true,
              annualRecurringEquivalentMinor: true,
              firstYearCommitmentMinor: true,
              sentAt: true,
              sentDocumentId: true,
              acceptedAt: true,
              acceptanceOccurredAt: true,
              acceptedByName: true,
              acceptedByAuthority: true,
              acceptanceReference: true,
              documentCompositions: {
                orderBy: [{ composedAt: 'desc' }, { sequence: 'desc' }],
                take: 1,
                select: {
                  id: true,
                  templateCode: true,
                  language: true,
                  readiness: true,
                  issuanceReady: true,
                  composedAt: true,
                },
              },
              documents: {
                orderBy: [{ artifactVersion: 'desc' }, { createdAt: 'desc' }],
                take: DOCUMENT_LIMIT + 1,
                select: {
                  id: true,
                  type: true,
                  language: true,
                  artifactVersion: true,
                  status: true,
                  fileName: true,
                  templateVersion: true,
                  generatorVersion: true,
                  compositionReadiness: true,
                  generatedAt: true,
                },
              },
              sourceContractRevision: {
                select: {
                  id: true,
                  revisionNumber: true,
                  status: true,
                  contract: {
                    select: {
                      id: true,
                      reference: true,
                      title: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      targetType === CommercialDossierTargetType.ORGANIZATION
        ? this.prisma.organizationContract.findMany({
            where: { organizationId: targetId },
            orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
            take: COLLECTION_LIMIT + 1,
            select: {
              id: true,
              reference: true,
              title: true,
              status: true,
              isPrimary: true,
              lockVersion: true,
              activatedAt: true,
              updatedAt: true,
              revisions: {
                orderBy: { revisionNumber: 'desc' },
                take: 1,
                select: {
                  id: true,
                  revisionNumber: true,
                  revisionType: true,
                  status: true,
                  lockVersion: true,
                  effectiveFrom: true,
                  effectiveUntil: true,
                  sourceProposalRevisionId: true,
                  signedAt: true,
                  signedByName: true,
                  signatureReference: true,
                  termStartAt: true,
                  termEndAt: true,
                  renewalMode: true,
                  renewalTermMonths: true,
                  renewalNoticeDays: true,
                  priceLines: {
                    orderBy: { displayOrder: 'asc' },
                    select: {
                      id: true,
                      componentCode: true,
                      componentName: true,
                      capabilityId: true,
                      quantity: true,
                      quantityUnit: true,
                      distributionLimit: true,
                      distributionMetric: true,
                      capability: {
                        select: { code: true, nameFr: true },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      targetType === CommercialDossierTargetType.ORGANIZATION
        ? this.prisma.capabilityEntitlement.findMany({
            where: { organizationId: targetId },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take: COLLECTION_LIMIT + 1,
            select: {
              id: true,
              source: true,
              scope: true,
              sourceContractId: true,
              capability: { select: { code: true, nameFr: true } },
              revisions: {
                orderBy: { versionNumber: 'desc' },
                take: 1,
                select: {
                  versionNumber: true,
                  lifecycle: true,
                  enabled: true,
                  distributable: true,
                  effectiveFrom: true,
                  effectiveUntil: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const workspaceSources = workspaces.slice(0, COLLECTION_LIMIT);
    const proposalSources = proposals.slice(0, COLLECTION_LIMIT);
    const contractSources = contracts.slice(0, COLLECTION_LIMIT);
    const entitlementRows = entitlements.slice(0, COLLECTION_LIMIT);

    const workspaceSummaries = workspaceSources.map((workspace) => ({
      id: workspace.id,
      reference: workspace.reference,
      title: workspace.title,
      status: workspace.status,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      scenarioCount: workspace.scenarios.length,
      scenariosTruncated: workspace.scenarios.length > COLLECTION_LIMIT,
      retainedScenarioId: workspace.selectedScenarioId,
      resumeUrl: `/admin/commercial/configurator?workspace=${workspace.id}`,
      scenarios: workspace.scenarios
        .slice(0, COLLECTION_LIMIT)
        .map((scenario) => {
          const familyAuthority = resolveCommercialFamilyAuthority({
            explicitCodes: scenario.families.map((family) => family.familyCode),
            componentCodes: scenario.lines.map((line) => line.componentCode),
          });
          const run = scenario.runs[0] ?? null;
          const current = Boolean(
            run && run.scenarioLockVersion === scenario.lockVersion,
          );
          return {
            id: scenario.id,
            name: scenario.name,
            status: scenario.status,
            displayOrder: scenario.displayOrder,
            retained: workspace.selectedScenarioId === scenario.id,
            familyAuthority: {
              source: familyAuthority.source,
              codes: familyAuthority.codes,
              labels: familyAuthority.codes.map((code) => ({
                code,
                label:
                  COMMERCIAL_FAMILY_REGISTRY.find(
                    (family) => family.code === code,
                  )?.labelFr ?? code,
              })),
            },
            capabilities: scenario.capabilities.map(({ capability }) => ({
              code: capability.code,
              label: capability.nameFr,
            })),
            currentOfficialRun: run
              ? {
                  calculatedAt: run.calculatedAt,
                  priceStatus: run.priceStatus,
                  current,
                  converted: Boolean(run.conversion),
                  totals: run.priceResult
                    ? {
                        oneTimeMinor: money(run.priceResult.oneTimeTotalMinor),
                        annualRecurringMinor: money(
                          run.priceResult.annualRecurringEquivalentMinor,
                        ),
                        firstYearMinor: money(
                          run.priceResult.firstYearCommitmentMinor,
                        ),
                      }
                    : null,
                }
              : null,
          };
        }),
    }));

    const proposalSummaries = proposalSources.map((proposal) => {
      const revision = proposal.revisions[0] ?? null;
      const composition = revision?.documentCompositions[0] ?? null;
      const documents = revision?.documents.slice(0, DOCUMENT_LIMIT) ?? [];
      return {
        id: proposal.id,
        reference: proposal.reference,
        title: proposal.title,
        status: proposal.status,
        targetType: proposal.organizationId ? 'ORGANIZATION' : 'PROSPECT',
        targetId: proposal.organizationId ?? proposal.prospectId,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        source: proposal.simulationConversion ? 'CONFIGURATOR' : 'DIRECT',
        conversion: proposal.simulationConversion,
        latestRevision: revision
          ? {
              id: revision.id,
              revisionNumber: revision.revisionNumber,
              status: revision.status,
              validFrom: revision.validFrom,
              validUntil: revision.validUntil,
              totals: {
                oneTimeMinor: money(revision.oneTimeTotalMinor),
                annualRecurringMinor: money(
                  revision.annualRecurringEquivalentMinor,
                ),
                firstYearMinor: money(revision.firstYearCommitmentMinor),
              },
              issuance: {
                issuedAt: revision.sentAt,
                issuedDocumentId: revision.sentDocumentId,
                status: revision.sentAt ? 'ISSUED' : 'NOT_ISSUED',
              },
              acceptance: {
                status:
                  revision.status === 'ACCEPTED' &&
                  revision.acceptanceOccurredAt &&
                  revision.acceptedAt &&
                  revision.acceptedByName &&
                  revision.acceptedByAuthority &&
                  revision.acceptanceReference
                    ? 'EVIDENCED'
                    : revision.status === 'ACCEPTED'
                      ? 'INCOMPLETE'
                      : 'NOT_ACCEPTED',
                occurredAt: revision.acceptanceOccurredAt,
                recordedAt: revision.acceptedAt,
                acceptedByName: revision.acceptedByName,
                acceptedByAuthority: revision.acceptedByAuthority,
                evidenceReference: revision.acceptanceReference,
              },
              documentReadiness: composition
                ? composition.issuanceReady
                  ? 'ISSUANCE_READY'
                  : 'INTERNAL_DRAFT'
                : 'NO_COMPOSITION',
              latestComposition: composition,
              documentsTruncated:
                (revision?.documents.length ?? 0) > DOCUMENT_LIMIT,
              documents: documents.map((document) => ({
                ...document,
                downloadUrl:
                  document.status === 'FINALIZED'
                    ? `/admin/v1/commercial/proposals/${proposal.id}/revisions/${revision.id}/documents/${document.id}/download`
                    : null,
                documentKind:
                  document.templateVersion === 'proposal-offer/v3'
                    ? 'HISTORICAL_PDF_V3'
                    : document.compositionReadiness === 'ISSUANCE_READY'
                      ? 'PDF_V2_ELIGIBLE'
                      : 'PDF_V2_INTERNAL_DRAFT',
              })),
              relatedContract: revision.sourceContractRevision,
            }
          : null,
        detailUrl: `/admin/commercial/proposals/${proposal.id}`,
      };
    });

    const entitlementSources = entitlementRows as EntitlementReadModelSource[];
    const entitlementSummaries = entitlementSources.map((entitlement) => ({
      id: entitlement.id,
      capabilityCode: entitlement.capability.code,
      capabilityLabel: entitlement.capability.nameFr,
      scope: entitlement.scope,
      source: entitlement.source,
      sourceContractId: entitlement.sourceContractId,
      latestRevision: entitlement.revisions[0] ?? null,
    }));

    const contractedCapabilities = contractSources.flatMap((contract) =>
      (contract.revisions[0]?.priceLines ?? []).flatMap((line) => {
        const capability = line.capability;
        if (!capability) return [];
        const matching = entitlementSummaries.filter(
          (entitlement) =>
            entitlement.capabilityCode === capability.code &&
            entitlement.sourceContractId === contract.id,
        );
        const active = matching.some(
          (entitlement) =>
            entitlement.latestRevision?.lifecycle === 'GRANTED' &&
            entitlement.latestRevision.enabled,
        );
        return {
          contractId: contract.id,
          contractRevisionId: contract.revisions[0].id,
          effectiveFrom: contract.revisions[0].effectiveFrom,
          snapshotLineId: line.id,
          capabilityCode: capability.code,
          capabilityLabel: capability.nameFr,
          quantity: line.quantity?.toString() ?? null,
          quantityUnit: line.quantityUnit,
          distributionLimit: line.distributionLimit?.toString() ?? null,
          distributionMetric: line.distributionMetric,
          state: active ? 'ACTIVE' : matching.length ? 'INACTIVE' : 'MISSING',
          entitlementIds: matching.map((entitlement) => entitlement.id),
        };
      }),
    );
    const excessEntitlements = entitlementSummaries.filter(
      (entitlement) =>
        entitlement.latestRevision?.lifecycle === 'GRANTED' &&
        entitlement.latestRevision.enabled &&
        !contractedCapabilities.some(
          (contracted) =>
            contracted.capabilityCode === entitlement.capabilityCode &&
            contracted.contractId === entitlement.sourceContractId,
        ),
    );

    const evidence = this.progress(
      targetId,
      workspaceSummaries,
      proposalSummaries,
      contractSources,
      entitlementSummaries,
    );

    return {
      observationOnly: true,
      target: {
        type: targetType,
        ...target,
        name:
          targetType === CommercialDossierTargetType.PROSPECT
            ? 'displayName' in target
              ? target.displayName
              : ''
            : 'name' in target
              ? target.name
              : '',
      },
      workspaces: workspaceSummaries,
      proposals: proposalSummaries,
      contracts: contractSources,
      entitlementSummary: {
        present: entitlementSummaries.length > 0,
        count: entitlementSummaries.length,
        items: entitlementSummaries,
        inferred: false,
        contractedCapabilities,
        excessEntitlements,
      },
      progress: evidence.progress,
      blockers: evidence.blockers,
      nextActions: evidence.nextActions,
      truncation: {
        workspaces: workspaces.length > COLLECTION_LIMIT,
        proposals: proposals.length > COLLECTION_LIMIT,
        contracts: contracts.length > COLLECTION_LIMIT,
        entitlements: entitlements.length > COLLECTION_LIMIT,
      },
    };
  }

  private progress(
    targetId: string,
    workspaces: Array<{
      id: string;
      title: string;
      resumeUrl: string;
      retainedScenarioId: string | null;
      scenarios: Array<{
        retained: boolean;
        currentOfficialRun: { current: boolean; converted: boolean } | null;
      }>;
    }>,
    proposals: Array<{
      id: string;
      reference: string;
      detailUrl: string;
      status: string;
      latestRevision: {
        status: string;
        documentReadiness: string;
        relatedContract: unknown;
        issuance: { status: string };
        acceptance: { status: string };
      } | null;
    }>,
    contracts: Array<{
      status: string;
      activatedAt: Date | null;
      revisions: Array<{ status: string; signedAt: Date | null }>;
    }>,
    entitlements: unknown[],
  ) {
    const retainedCandidates = workspaces.flatMap((workspace) =>
      workspace.scenarios
        .filter((scenario) => scenario.retained)
        .map((scenario) => ({ scenario, workspace })),
    );
    const retained = retainedCandidates[0]?.scenario;
    const retainedWorkspace = retainedCandidates[0]?.workspace;
    const currentRun = retained?.currentOfficialRun?.current
      ? retained.currentOfficialRun
      : null;
    const proposal = proposals[0] ?? null;
    const revision = proposal?.latestRevision ?? null;
    const signed = contracts.some((contract) =>
      contract.revisions.some(
        (contractRevision) =>
          contractRevision.status === 'SIGNED' && contractRevision.signedAt,
      ),
    );
    const active = contracts.some(
      (contract) => contract.status === 'ACTIVE' && contract.activatedAt,
    );
    const stages: Array<{ code: DossierStage; complete: boolean }> = [
      {
        code: 'OFFER_ISSUED',
        complete: revision?.issuance.status === 'ISSUED',
      },
      {
        code: 'CUSTOMER_ACCEPTANCE',
        complete: revision?.acceptance.status === 'EVIDENCED',
      },
      { code: 'CONTRACT', complete: contracts.length > 0 },
      { code: 'SIGNATURE_ACTIVATION', complete: Boolean(signed && active) },
      { code: 'MODULES_RIGHTS', complete: active && entitlements.length > 0 },
      {
        code: 'FINAL_VERIFICATION',
        complete: Boolean(active && entitlements.length > 0),
      },
    ];
    const blockers: Array<{ code: string; label: string }> = [];
    const nextActions: Array<{
      code: string;
      label: string;
      href: string | null;
    }> = [];
    if (
      revision?.status === 'ACCEPTED' &&
      !revision.relatedContract &&
      !contracts.length
    )
      nextActions.push({
        code: 'PREPARE_CONTRACT',
        label: 'Préparer le contrat',
        href: proposal?.detailUrl ?? null,
      });
    else if (!workspaces.length)
      nextActions.push({
        code: 'PREPARE_OFFER',
        label: 'Préparer une offre',
        href: '/admin/commercial/configurator',
      });
    else if (retainedCandidates.length > 1) {
      blockers.push({
        code: 'MULTIPLE_RETAINED_SCENARIOS',
        label:
          'Plusieurs configurations ont un scénario retenu. Choisissez le dossier à poursuivre.',
      });
      retainedCandidates.forEach(({ workspace }) =>
        nextActions.push({
          code: `RESUME_CONFIGURATION_${workspace.id}`,
          label: `Reprendre ${workspace.title}`,
          href: workspace.resumeUrl,
        }),
      );
    } else if (!retained) {
      blockers.push({
        code: 'NO_RETAINED_SCENARIO',
        label: 'Aucun scénario retenu.',
      });
      workspaces.forEach((workspace) =>
        nextActions.push({
          code: `RESUME_CONFIGURATION_${workspace.id}`,
          label: `Reprendre ${workspace.title}`,
          href: workspace.resumeUrl,
        }),
      );
    } else if (!currentRun) {
      blockers.push({
        code: 'OFFICIAL_CALCULATION_MISSING_OR_STALE',
        label: "Le calcul officiel est absent ou n'est plus à jour.",
      });
      nextActions.push({
        code: 'CALCULATE_OFFER',
        label: "Calculer l'offre",
        href: retainedWorkspace?.resumeUrl ?? null,
      });
    } else if (!currentRun.converted && !proposals.length)
      nextActions.push({
        code: 'CREATE_PROPOSAL',
        label: 'Créer la proposition',
        href: retainedWorkspace?.resumeUrl ?? null,
      });
    else if (proposal && !revision)
      blockers.push({
        code: 'PROPOSAL_WITHOUT_REVISION',
        label: 'La proposition ne contient aucune révision.',
      });
    else if (revision?.documentReadiness === 'NO_COMPOSITION')
      nextActions.push({
        code: 'PREPARE_DOCUMENT',
        label: 'Préparer le document',
        href: proposal?.detailUrl ?? null,
      });
    else if (revision?.documentReadiness === 'INTERNAL_DRAFT')
      nextActions.push({
        code: 'COMPLETE_DOCUMENT',
        label: 'Compléter les informations manquantes',
        href: proposal?.detailUrl ?? null,
      });
    else if (revision?.status === 'DRAFT')
      nextActions.push({
        code: 'START_INTERNAL_REVIEW',
        label: 'Commencer la revue interne',
        href: proposal?.detailUrl ?? null,
      });
    else if (revision?.status === 'SENT')
      nextActions.push({
        code: 'RECORD_ACCEPTANCE',
        label: "Enregistrer la preuve d'acceptation",
        href: proposal?.detailUrl ?? null,
      });
    else if (contracts.length && !signed)
      nextActions.push({
        code: 'SIGN_CONTRACT',
        label: 'Enregistrer la signature du contrat',
        href: `/admin/commercial/dossier/ORGANIZATION/${targetId}`,
      });
    else if (signed && !active)
      nextActions.push({
        code: 'ACTIVATE_CONTRACT',
        label: 'Activer explicitement le contrat',
        href: `/admin/commercial/dossier/ORGANIZATION/${targetId}`,
      });
    else if (active && !entitlements.length)
      nextActions.push({
        code: 'VERIFY_ACTIVATION',
        label: "Vérifier l'activation",
        href: `/admin/commercial/dossier/ORGANIZATION/${targetId}`,
      });

    return { progress: stages, blockers, nextActions };
  }
}
