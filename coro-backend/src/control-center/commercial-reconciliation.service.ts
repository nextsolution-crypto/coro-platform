import { Injectable, NotFoundException } from '@nestjs/common';
import { CapabilityCode, CommercialScope } from '@prisma/client';
import { EntitlementResolver } from '../capability-entitlements/entitlement-resolver.service';
import { PrismaService } from '../prisma/prisma.service';
import { CAPABILITY_REGISTRY } from '../organization-360/capability-registry';
import { CapabilityObservationService } from './capability-observation.service';
import {
  hasComparableLimitMismatch,
  mismatch,
  observedMismatch,
} from './mismatch-rules';
import {
  CapabilityMatrixRow,
  ReconciliationMismatch,
  StateCell,
} from './commercial-reconciliation.types';

@Injectable()
export class CommercialReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: EntitlementResolver,
    private readonly observations: CapabilityObservationService,
  ) {}

  private cell<T>(
    value: T | null,
    quality: StateCell['quality'],
    provenance: StateCell['provenance'] = [],
    scope?: CommercialScope,
  ): StateCell<T> {
    return { value, quality, provenance, scope };
  }

  async matrix(organizationId: string, asOf: Date) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, commercialRelationship: true },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable.');
    const codes = CAPABILITY_REGISTRY.map((item) => item.code);
    const [proposalLines, contractLines, resolved, observed] =
      await Promise.all([
        this.prisma.proposalLine.findMany({
          where: {
            proposalRevision: {
              proposal: { organizationId },
              status: 'ACCEPTED',
            },
            capabilityId: { not: null },
          },
          select: {
            id: true,
            capability: { select: { code: true } },
            quantity: true,
            quantityUnit: true,
            distributable: true,
            distributionLimit: true,
            distributionMetric: true,
            proposalRevisionId: true,
          },
        }),
        this.prisma.contractPriceSnapshotLine.findMany({
          where: {
            contractRevision: {
              contract: { organizationId },
              status: 'SIGNED',
              effectiveFrom: { lte: asOf },
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: asOf } }],
            },
            capabilityId: { not: null },
          },
          select: {
            id: true,
            capability: { select: { code: true } },
            quantity: true,
            quantityUnit: true,
            distributable: true,
            distributionLimit: true,
            distributionMetric: true,
            contractRevisionId: true,
          },
        }),
        this.resolver.resolveMany({
          organizationId,
          capabilityCodes: codes,
          atTime: asOf,
        }),
        this.observations.observeOrganization(organizationId),
      ]);
    const rows: CapabilityMatrixRow[] = CAPABILITY_REGISTRY.map(
      (definition) => {
        const code = definition.code;
        const proposed = proposalLines.filter(
          (line) => line.capability?.code === code,
        );
        const contracted = contractLines.filter(
          (line) => line.capability?.code === code,
        );
        const entitlement = resolved[code];
        const observation = observed[code];
        const mismatches: ReconciliationMismatch[] = [];
        const effectiveContractGrants = (
          entitlement?.contributingGrants ?? []
        ).filter((grant) => grant.source === 'CONTRACT');
        if (
          contracted.length > 0 &&
          effectiveContractGrants.length === 0 &&
          organization.commercialRelationship !== 'INTERNAL'
        )
          mismatches.push(
            mismatch(
              'CONTRACT_WITHOUT_ENTITLEMENT',
              'ACTION_REQUIRED',
              'Capability contractée sans entitlement effectif.',
              'PROVISION_ENTITLEMENT',
            ),
          );
        for (const contractLine of contracted) {
          if (
            !contractLine.distributionLimit ||
            !contractLine.distributionMetric
          )
            continue;
          if (
            hasComparableLimitMismatch({
              snapshotLineId: contractLine.id,
              metric: contractLine.distributionMetric,
              quantity: contractLine.distributionLimit,
              grants: effectiveContractGrants,
            })
          )
            mismatches.push(
              mismatch(
                'CONTRACT_ENTITLEMENT_LIMIT_MISMATCH',
                'WARNING',
                'La limite contractuelle diffère de la limite du grant de même provenance et métrique.',
                'REVIEW_ENTITLEMENT_LIMIT',
              ),
            );
        }
        for (const grant of entitlement?.grants ?? []) {
          if (grant.effectiveState === 'SOURCE_INVALID')
            mismatches.push(
              mismatch(
                'INVALID_CONTRACT_PROVENANCE',
                'ACTION_REQUIRED',
                'Provenance contractuelle invalide.',
                'REVIEW_CONTRACT_PROVENANCE',
              ),
            );
          if (grant.effectiveState === 'PARENT_INVALID')
            mismatches.push(
              mismatch(
                'INVALID_DISTRIBUTION_PARENT',
                'ACTION_REQUIRED',
                'Parent de distribution invalide.',
                'REVIEW_DISTRIBUTION_PARENT',
              ),
            );
        }
        mismatches.push(
          ...observedMismatch({
            licensed: Boolean(entitlement?.licensed),
            quality: observation.observed.quality,
            observed: observation.observed.value,
          }),
        );
        const severity = mismatches.some(
          (item) => item.severity === 'ACTION_REQUIRED',
        )
          ? 'ACTION_REQUIRED'
          : mismatches.some((item) => item.severity === 'WARNING')
            ? 'WARNING'
            : mismatches.some((item) => item.severity === 'INFO')
              ? 'INFO'
              : observation.observed.quality === 'NOT_AVAILABLE'
                ? 'UNKNOWN'
                : 'MATCH';
        return {
          code,
          label: definition.label,
          platform: this.cell(
            {
              availability: definition.platformAvailability,
              lifecycle: definition.lifecycle,
            },
            'CANONICAL',
            [
              {
                domain: 'CATALOG',
                entityType: 'CapabilityRegistry',
                entityId: code,
              },
            ],
          ),
          proposed: this.cell(
            proposed.map((line) => ({
              ...line,
              quantity: line.quantity?.toString(),
              distributionLimit: line.distributionLimit?.toString(),
            })),
            'CANONICAL',
            proposed.map((line) => ({
              domain: 'PROPOSAL' as const,
              entityType: 'ProposalLine',
              entityId: line.id,
              revisionId: line.proposalRevisionId,
            })),
          ),
          contracted: this.cell(
            contracted.map((line) => ({
              ...line,
              quantity: line.quantity?.toString(),
              distributionLimit: line.distributionLimit?.toString(),
            })),
            'CANONICAL',
            contracted.map((line) => ({
              domain: 'CONTRACT' as const,
              entityType: 'ContractPriceSnapshotLine',
              entityId: line.id,
              revisionId: line.contractRevisionId,
            })),
          ),
          licensed: this.cell(
            Boolean(entitlement?.licensed),
            'CANONICAL',
            (entitlement?.contributingGrants ?? []).map((grant) => ({
              domain: 'ENTITLEMENT' as const,
              entityType: 'CapabilityEntitlement',
              entityId: grant.id,
            })),
            'ORGANIZATION',
          ),
          enabled: this.cell(
            Boolean(entitlement?.enabled),
            'CANONICAL',
            [],
            'ORGANIZATION',
          ),
          distributable: this.cell(
            Boolean(entitlement?.distributable),
            'CANONICAL',
            [],
            'ORGANIZATION',
          ),
          configured: this.cell(
            observation.configured.value,
            observation.configured.quality,
            observation.configured.provenance.map((label) => ({
              domain: 'OPERATIONAL' as const,
              entityType: String(label),
            })),
          ),
          observed: this.cell(
            observation.observed.value,
            observation.observed.quality,
            observation.observed.provenance.map((label) => ({
              domain: 'OPERATIONAL' as const,
              entityType: String(label),
            })),
          ),
          reconciliation: this.cell(
            {
              status: severity,
              mismatchCodes: mismatches.map((item) => item.code),
            },
            observation.observed.quality === 'NOT_AVAILABLE' &&
              !mismatches.length
              ? 'NOT_AVAILABLE'
              : 'CANONICAL',
          ),
        };
      },
    );
    return {
      organizationId,
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
      rows,
    };
  }

  async reconcile(organizationId: string, asOf: Date) {
    const matrix = await this.matrix(organizationId, asOf);
    const acceptedWithoutContract =
      await this.prisma.commercialProposal.findMany({
        where: {
          organizationId,
          acceptedRevisionId: { not: null },
          acceptedRevision: { sourceContractRevision: null },
        },
        select: { id: true, acceptedRevisionId: true },
      });
    return {
      organizationId,
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
      organizationMismatches: acceptedWithoutContract.map(() =>
        mismatch(
          'ACCEPTED_PROPOSAL_WITHOUT_CONTRACT',
          'ACTION_REQUIRED',
          'Proposition acceptée sans contrat.',
          'CREATE_CONTRACT',
        ),
      ),
      results: matrix.rows.map((row) => ({
        capabilityCode: row.code,
        proposed: row.proposed,
        contracted: row.contracted,
        entitled: {
          licensed: row.licensed,
          enabled: row.enabled,
          distributable: row.distributable,
        },
        configured: row.configured,
        observed: row.observed,
        reconciliation: row.reconciliation,
      })),
    };
  }

  async scopeTree(
    organizationId: string,
    asOf: Date,
    capabilityCode: CapabilityCode | undefined,
    page: number,
    pageSize: number,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable.');
    const [totalClients, clients, entitlements] = await Promise.all([
      this.prisma.client.count({ where: { organizationId } }),
      this.prisma.client.findMany({
        where: { organizationId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          buildings: {
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.capabilityEntitlement.findMany({
        where: {
          organizationId,
          ...(capabilityCode ? { capability: { code: capabilityCode } } : {}),
        },
        include: {
          capability: { select: { code: true } },
          revisions: {
            where: { effectiveFrom: { lte: asOf } },
            orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
            take: 1,
            include: { limits: true },
          },
        },
      }),
    ]);
    const summarize = (items: typeof entitlements) =>
      items.map((item) => ({
        id: item.id,
        capabilityCode: item.capability.code,
        scope: item.scope,
        source: item.source,
        parentEntitlementId: item.parentEntitlementId,
        revision: item.revisions[0]
          ? {
              ...item.revisions[0],
              limits: item.revisions[0].limits.map((limit) => ({
                ...limit,
                quantity: limit.quantity?.toString(),
              })),
            }
          : null,
      }));
    return {
      organizationId,
      asOf,
      explicitEntitlementsOnly: true,
      implicitInheritance: false,
      pagination: { page, pageSize, totalClients },
      root: {
        type: 'ORGANIZATION',
        id: organization.id,
        label: organization.name,
        exactEntitlements: summarize(
          entitlements.filter((item) => item.scope === 'ORGANIZATION'),
        ),
        children: clients.map((client) => ({
          type: 'CLIENT',
          id: client.id,
          label: client.name,
          exactEntitlements: summarize(
            entitlements.filter(
              (item) => item.clientId === client.id && item.scope === 'CLIENT',
            ),
          ),
          children: client.buildings.map((site) => ({
            type: 'SITE',
            id: site.id,
            label: site.name,
            exactEntitlements: summarize(
              entitlements.filter(
                (item) => item.buildingId === site.id && item.scope === 'SITE',
              ),
            ),
            children: [],
          })),
        })),
      },
    };
  }
}
