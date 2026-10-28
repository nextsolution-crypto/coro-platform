import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface AdviserActor {
  userId: string;
  organizationId: string;
  role: string;
}

export function projectAccessWhere(
  actor: AdviserActor,
): Prisma.ProjectWhereInput {
  if (actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === 'OPERATOR') {
    return {
      organizationId: actor.organizationId,
      OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }],
    };
  }
  throw new ForbiddenException('Acces refuse a ce projet');
}

/**
 * Canonical project predicate for business mutations that are forbidden once
 * the project is archived or administratively disabled. Read paths deliberately
 * keep using projectAccessWhere so historical documents remain consultable.
 */
export function mutableProjectAccessWhere(
  actor: AdviserActor,
): Prisma.ProjectWhereInput {
  return {
    ...projectAccessWhere(actor),
    isActive: true,
    status: { not: 'ARCHIVED' },
  };
}

export function requireProjectApprover(actor: AdviserActor): void {
  if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Role approbateur requis');
  }
}
