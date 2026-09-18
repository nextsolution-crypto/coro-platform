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
