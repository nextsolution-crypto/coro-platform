import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CommercialRelationship,
  CommercialScope,
  EntitlementSource,
} from '@prisma/client';

export const ENTITLEMENT_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
export const TEMPORARY_ENTITLEMENT_MAX_DAYS = 30;

export const SOURCE_RELATIONSHIPS: Record<
  EntitlementSource,
  readonly (CommercialRelationship | 'NULL')[]
> = {
  CONTRACT: ['DIRECT', 'PARTNER'],
  DISTRIBUTION: ['PARTNER'],
  MANUAL_OVERRIDE: ['DIRECT', 'PARTNER'],
  TRIAL: ['DIRECT', 'PARTNER', 'NULL'],
  INTERNAL: ['INTERNAL'],
};

export function validateSourceRelationship(
  source: EntitlementSource,
  relationship: CommercialRelationship | null,
) {
  const value = relationship ?? 'NULL';
  if (!SOURCE_RELATIONSHIPS[source].includes(value))
    throw new BadRequestException(
      `ENTITLEMENT_SOURCE_RELATIONSHIP_INVALID: ${source}/${value}`,
    );
}

export function validateTarget(
  scope: CommercialScope,
  clientId?: string | null,
  buildingId?: string | null,
) {
  const valid =
    (scope === 'ORGANIZATION' && !clientId && !buildingId) ||
    (scope === 'CLIENT' && Boolean(clientId) && !buildingId) ||
    (scope === 'SITE' && Boolean(clientId) && Boolean(buildingId));
  if (!valid) throw new BadRequestException('ENTITLEMENT_TARGET_INVALID');
}

export function validateEffectiveFrom(value: Date, now: Date) {
  if (value.getTime() < now.getTime() - ENTITLEMENT_CLOCK_TOLERANCE_MS)
    throw new BadRequestException('RETROACTIVE_ENTITLEMENT_MUTATION_FORBIDDEN');
}

export function validateTemporaryPeriod(from: Date, until: Date | null) {
  if (!until || until <= from)
    throw new BadRequestException('TEMPORARY_ENTITLEMENT_EXPIRATION_REQUIRED');
  if (
    until.getTime() - from.getTime() >
    TEMPORARY_ENTITLEMENT_MAX_DAYS * 24 * 60 * 60 * 1000
  )
    throw new BadRequestException('TEMPORARY_ENTITLEMENT_MAX_30_DAYS');
}

export function rejectPendingRevision(
  revisions: Array<{ effectiveFrom: Date }>,
  now: Date,
) {
  if (revisions.some((item) => item.effectiveFrom > now))
    throw new ConflictException('FUTURE_MUTATION_ALREADY_SCHEDULED');
}
