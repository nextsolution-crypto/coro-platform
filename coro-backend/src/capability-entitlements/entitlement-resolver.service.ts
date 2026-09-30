import { Injectable } from '@nestjs/common';
import { CapabilityCode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface BatchEntitlementResolution {
  availability: { lifecycle: string; isAvailable: boolean };
  licensed: boolean;
  enabled: boolean;
  distributable: boolean;
  effectiveState: string;
  contributingGrants: Array<{
    id: string;
    source: string;
    sourceSnapshotLineId: string | null;
    effectiveState: string;
    limits: Array<{
      metricCode: string;
      quantity: { toString(): string } | null;
      unlimited: boolean;
    }>;
  }>;
  grants: BatchEntitlementResolution['contributingGrants'];
  warnings: string[];
}

@Injectable()
export class EntitlementResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: {
    capabilityCode: CapabilityCode;
    organizationId: string;
    clientId?: string;
    buildingId?: string;
    atTime?: Date;
    asKnownAt?: Date;
    observed?: boolean | null;
  }) {
    const at = input.atTime ?? new Date();
    const capability = await this.prisma.commercialCapability.findUniqueOrThrow(
      { where: { code: input.capabilityCode } },
    );
    const target: Prisma.CapabilityEntitlementWhereInput = input.buildingId
      ? {
          scope: 'SITE',
          buildingId: input.buildingId,
          clientId: input.clientId,
        }
      : input.clientId
        ? { scope: 'CLIENT', clientId: input.clientId }
        : { scope: 'ORGANIZATION' };
    const grants = await this.prisma.capabilityEntitlement.findMany({
      where: {
        organizationId: input.organizationId,
        capabilityId: capability.id,
        ...target,
      },
      include: {
        revisions: {
          where: {
            effectiveFrom: { lte: at },
            ...(input.asKnownAt
              ? { recordedAt: { lte: input.asKnownAt } }
              : {}),
          },
          orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          include: { limits: true },
        },
        parentEntitlement: {
          include: {
            revisions: {
              where: { effectiveFrom: { lte: at } },
              orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
              take: 1,
            },
          },
        },
        sourceContract: true,
        sourceContractRevision: true,
      },
    });
    const contributing = grants.map((grant) => {
      const revision = grant.revisions[0];
      let state = 'PENDING';
      const parentRevision = grant.parentEntitlement?.revisions[0];
      const parentInvalid =
        grant.source === 'DISTRIBUTION' &&
        (!parentRevision ||
          parentRevision.lifecycle !== 'GRANTED' ||
          !parentRevision.distributable ||
          (parentRevision.effectiveUntil &&
            parentRevision.effectiveUntil <= at));
      const sourceInvalid =
        grant.source === 'CONTRACT' &&
        (!grant.sourceContractRevision ||
          grant.sourceContractRevision.status !== 'SIGNED' ||
          ['CANCELLED', 'TERMINATED', 'EXPIRED'].includes(
            grant.sourceContract?.status ?? '',
          ));
      if (!revision) state = 'PENDING';
      else if (parentInvalid) state = 'PARENT_INVALID';
      else if (sourceInvalid) state = 'SOURCE_INVALID';
      else if (revision.lifecycle === 'REVOKED') state = 'REVOKED';
      else if (revision.lifecycle === 'SUSPENDED') state = 'SUSPENDED';
      else if (revision.effectiveUntil && revision.effectiveUntil <= at)
        state = 'EXPIRED';
      else state = 'EFFECTIVE';
      return {
        ...grant,
        revisions: undefined,
        revision,
        effectiveState: state,
        limits: revision?.limits ?? [],
      };
    });
    const effective = contributing.filter(
      (g) => g.effectiveState === 'EFFECTIVE',
    );
    const licensed = effective.length > 0;
    const observed = input.observed;
    const mismatch =
      observed == null
        ? 'UNKNOWN'
        : licensed
          ? observed
            ? 'ENTITLED_AND_OBSERVED'
            : 'ENTITLED_NOT_OBSERVED'
          : observed
            ? 'NOT_ENTITLED_OBSERVED'
            : 'NOT_ENTITLED_NOT_OBSERVED';
    return {
      availability: {
        lifecycle: capability.lifecycle,
        isAvailable: capability.isAvailable,
      },
      licensed,
      enabled: effective.some((g) => g.revision?.enabled),
      distributable: effective.some((g) => g.revision?.distributable),
      effectiveState: effective.length
        ? 'EFFECTIVE'
        : (contributing[0]?.effectiveState ?? 'EXPIRED'),
      contributingGrants: effective,
      grants: contributing,
      observedSignals:
        observed == null
          ? []
          : [{ classification: 'INFERRED', billable: false, observed }],
      mismatch,
      warnings: contributing
        .filter((g) =>
          ['PARENT_INVALID', 'SOURCE_INVALID'].includes(g.effectiveState),
        )
        .map((g) => g.effectiveState),
    };
  }

  async resolveMany(input: {
    organizationId: string;
    capabilityCodes: CapabilityCode[];
    clientId?: string;
    buildingId?: string;
    atTime?: Date;
    asKnownAt?: Date;
  }): Promise<Partial<Record<CapabilityCode, BatchEntitlementResolution>>> {
    const at = input.atTime ?? new Date();
    const capabilities = await this.prisma.commercialCapability.findMany({
      where: { code: { in: input.capabilityCodes } },
      select: { id: true, code: true, lifecycle: true, isAvailable: true },
    });
    const target: Prisma.CapabilityEntitlementWhereInput = input.buildingId
      ? {
          scope: 'SITE',
          buildingId: input.buildingId,
          clientId: input.clientId,
        }
      : input.clientId
        ? { scope: 'CLIENT', clientId: input.clientId }
        : { scope: 'ORGANIZATION' };
    const grants = await this.prisma.capabilityEntitlement.findMany({
      where: {
        organizationId: input.organizationId,
        capabilityId: { in: capabilities.map((item) => item.id) },
        ...target,
      },
      include: {
        revisions: {
          where: {
            effectiveFrom: { lte: at },
            ...(input.asKnownAt
              ? { recordedAt: { lte: input.asKnownAt } }
              : {}),
          },
          orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          include: { limits: true },
        },
        parentEntitlement: {
          include: {
            revisions: {
              where: { effectiveFrom: { lte: at } },
              orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
              take: 1,
            },
          },
        },
        sourceContract: true,
        sourceContractRevision: true,
      },
    });
    return Object.fromEntries(
      capabilities.map((capability) => {
        const contributing = grants
          .filter((grant) => grant.capabilityId === capability.id)
          .map((grant) => {
            const revision = grant.revisions[0];
            const parentRevision = grant.parentEntitlement?.revisions[0];
            const parentInvalid =
              grant.source === 'DISTRIBUTION' &&
              (!parentRevision ||
                parentRevision.lifecycle !== 'GRANTED' ||
                !parentRevision.distributable ||
                Boolean(
                  parentRevision.effectiveUntil &&
                  parentRevision.effectiveUntil <= at,
                ));
            const sourceInvalid =
              grant.source === 'CONTRACT' &&
              (!grant.sourceContractRevision ||
                grant.sourceContractRevision.status !== 'SIGNED' ||
                ['CANCELLED', 'TERMINATED', 'EXPIRED'].includes(
                  grant.sourceContract?.status ?? '',
                ));
            let effectiveState = 'PENDING';
            if (parentInvalid) effectiveState = 'PARENT_INVALID';
            else if (sourceInvalid) effectiveState = 'SOURCE_INVALID';
            else if (revision?.lifecycle === 'REVOKED')
              effectiveState = 'REVOKED';
            else if (revision?.lifecycle === 'SUSPENDED')
              effectiveState = 'SUSPENDED';
            else if (revision?.effectiveUntil && revision.effectiveUntil <= at)
              effectiveState = 'EXPIRED';
            else if (revision) effectiveState = 'EFFECTIVE';
            return {
              ...grant,
              revisions: undefined,
              revision,
              limits: revision?.limits ?? [],
              effectiveState,
            };
          });
        const effective = contributing.filter(
          (grant) => grant.effectiveState === 'EFFECTIVE',
        );
        return [
          capability.code,
          {
            availability: {
              lifecycle: capability.lifecycle,
              isAvailable: capability.isAvailable,
            },
            licensed: effective.length > 0,
            enabled: effective.some((grant) => grant.revision?.enabled),
            distributable: effective.some(
              (grant) => grant.revision?.distributable,
            ),
            effectiveState: effective.length
              ? 'EFFECTIVE'
              : (contributing[0]?.effectiveState ?? 'EXPIRED'),
            contributingGrants: effective,
            grants: contributing,
            warnings: contributing
              .filter((grant) =>
                ['PARENT_INVALID', 'SOURCE_INVALID'].includes(
                  grant.effectiveState,
                ),
              )
              .map((grant) => grant.effectiveState),
          },
        ];
      }),
    );
  }
}
