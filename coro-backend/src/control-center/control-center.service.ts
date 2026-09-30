import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ControlCenterOrganizationsQueryDto } from './control-center.dto';

@Injectable()
export class ControlCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(
    asOf: Date,
    attentionLimit: number,
    expiringWithinDays: number,
  ) {
    const until = new Date(asOf.getTime() + expiringWithinDays * 86400000);
    const [
      active,
      suspended,
      relationships,
      openProposals,
      acceptedProposals,
      acceptedWithoutContract,
      activeContracts,
      contractsWithoutEntitlement,
      effective,
      suspendedEntitlements,
      revoked,
      expiring,
      distributions,
      sites,
      incidents,
      populationPrograms,
      correctiveActions,
      attention,
      recentAudit,
    ] = await this.prisma.$transaction([
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where: { isActive: false } }),
      this.prisma.organization.groupBy({
        by: ['commercialRelationship'],
        orderBy: { commercialRelationship: 'asc' },
        _count: { id: true },
      }),
      this.prisma.commercialProposal.count({ where: { status: 'OPEN' } }),
      this.prisma.commercialProposal.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.commercialProposal.count({
        where: {
          acceptedRevisionId: { not: null },
          acceptedRevision: { sourceContractRevision: null },
        },
      }),
      this.prisma.organizationContract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.organizationContract.count({
        where: { status: 'ACTIVE', entitlementSources: { none: {} } },
      }),
      this.prisma.capabilityEntitlementRevision.count({
        where: {
          lifecycle: 'GRANTED',
          effectiveFrom: { lte: asOf },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: asOf } }],
        },
      }),
      this.prisma.capabilityEntitlementRevision.count({
        where: { lifecycle: 'SUSPENDED' },
      }),
      this.prisma.capabilityEntitlementRevision.count({
        where: { lifecycle: 'REVOKED' },
      }),
      this.prisma.capabilityEntitlementRevision.count({
        where: { effectiveUntil: { gt: asOf, lte: until } },
      }),
      this.prisma.capabilityEntitlement.count({
        where: { source: 'DISTRIBUTION' },
      }),
      this.prisma.building.count(),
      this.prisma.incidentEvent.count({ where: { status: 'ACTIVE' } }),
      this.prisma.populationProgram.count(),
      this.prisma.correctiveAction.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.organization.findMany({
        where: {
          OR: [
            { isActive: false },
            { commercialRelationship: null },
            {
              contracts: {
                some: { status: 'ACTIVE', entitlementSources: { none: {} } },
              },
            },
          ],
        },
        take: attentionLimit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          commercialRelationship: true,
        },
      }),
      this.prisma.adminAuditEvent.findMany({
        take: attentionLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          organizationId: true,
          createdAt: true,
        },
      }),
    ]);
    const rel = Object.fromEntries(
      relationships.map((item) => [
        item.commercialRelationship ?? 'NOT_CONFIGURED',
        typeof item._count === 'object' ? (item._count.id ?? 0) : 0,
      ]),
    );
    return {
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
      organizations: {
        active,
        suspended,
        DIRECT: rel.DIRECT ?? 0,
        PARTNER: rel.PARTNER ?? 0,
        INTERNAL: rel.INTERNAL ?? 0,
        NOT_CONFIGURED: rel.NOT_CONFIGURED ?? 0,
      },
      commercial: {
        openProposals,
        acceptedProposals,
        acceptedProposalsWithoutContract: acceptedWithoutContract,
        activeContracts,
        contractsWithoutEntitlement,
      },
      entitlements: {
        effective,
        suspended: suspendedEntitlements,
        revoked,
        expiring,
        partnerDistributions: distributions,
      },
      operational: {
        sites: { value: sites, quality: 'CANONICAL', billable: false },
        activeIncidents: {
          value: incidents,
          quality: 'CANONICAL',
          billable: false,
        },
        populationPrograms: {
          value: populationPrograms,
          quality: 'CANONICAL',
          billable: false,
        },
        openCorrectiveActions: {
          value: correctiveActions,
          quality: 'CANONICAL',
          billable: false,
        },
        healthDocumentation: {
          value: null,
          quality: 'NOT_AVAILABLE',
          billable: false,
        },
      },
      attentionItems: attention,
      recentAdministrativeActivity: recentAudit,
    };
  }

  async organizations(query: ControlCenterOrganizationsQueryDto, asOf: Date) {
    const where: Prisma.OrganizationWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.relationship
        ? { commercialRelationship: query.relationship }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          commercialRelationship: true,
          licenseType: true,
          _count: {
            select: {
              clients: true,
              buildings: true,
              contracts: true,
              capabilityEntitlements: true,
              commercialProposals: true,
            },
          },
        },
      }),
    ]);
    return {
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async commercialOverview(asOf: Date, expiringWithinDays: number) {
    const until = new Date(asOf.getTime() + expiringWithinDays * 86400000);
    const [
      proposalPipeline,
      contractLifecycle,
      entitlementSources,
      expiringContracts,
      expiringEntitlements,
      distributions,
      acceptedWithoutContract,
      contractsWithoutEntitlement,
    ] = await this.prisma.$transaction([
      this.prisma.commercialProposal.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { id: true },
      }),
      this.prisma.organizationContract.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { id: true },
      }),
      this.prisma.capabilityEntitlement.groupBy({
        by: ['source'],
        orderBy: { source: 'asc' },
        _count: { id: true },
      }),
      this.prisma.organizationContractRevision.count({
        where: { status: 'SIGNED', effectiveUntil: { gt: asOf, lte: until } },
      }),
      this.prisma.capabilityEntitlementRevision.count({
        where: { effectiveUntil: { gt: asOf, lte: until } },
      }),
      this.prisma.capabilityEntitlement.count({
        where: { source: 'DISTRIBUTION' },
      }),
      this.prisma.commercialProposal.count({
        where: {
          acceptedRevisionId: { not: null },
          acceptedRevision: { sourceContractRevision: null },
        },
      }),
      this.prisma.organizationContract.count({
        where: { status: 'ACTIVE', entitlementSources: { none: {} } },
      }),
    ]);
    return {
      asOf,
      observationOnly: true,
      enforcement: 'NONE',
      proposalPipeline,
      contractLifecycle,
      entitlementSources,
      expirations: {
        contracts: expiringContracts,
        entitlements: expiringEntitlements,
      },
      partnerDistributions: distributions,
      mismatches: {
        acceptedProposalsWithoutContract: acceptedWithoutContract,
        activeContractsWithoutEntitlement: contractsWithoutEntitlement,
      },
    };
  }
}
