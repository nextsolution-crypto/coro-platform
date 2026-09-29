import { Injectable } from '@nestjs/common';
import { CapabilityCode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
