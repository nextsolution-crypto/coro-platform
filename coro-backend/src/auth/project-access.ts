import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

/**
 * Locks the canonical Project row before a business mutation and then checks
 * its current lifecycle state. The lock makes the state check and all writes
 * performed by the caller's transaction atomic with a concurrent archive or
 * administrative deactivation.
 *
 * Callers must keep every related write and side effect in the same
 * transaction. Historical read paths deliberately do not use this helper.
 */
export async function lockMutableProject(
  tx: Prisma.TransactionClient,
  projectId: string,
  actor: AdviserActor,
): Promise<{
  id: string;
  organizationId: string;
  status: string;
  isActive: boolean;
}> {
  const accessible = await tx.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(actor) },
    select: { id: true },
  });
  if (!accessible) throw new NotFoundException('Projet introuvable');

  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Project"
    WHERE "id" = ${projectId} AND "organizationId" = ${actor.organizationId}
    FOR UPDATE
  `);

  const project = await tx.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(actor) },
    select: { id: true, organizationId: true, status: true, isActive: true },
  });
  if (!project) throw new NotFoundException('Projet introuvable');
  if (project.isActive === false || project.status === 'ARCHIVED') {
    throw new ConflictException(
      'Ce projet est archivé ou inactif et demeure en lecture seule.',
    );
  }
  return project;
}

export function requireProjectApprover(actor: AdviserActor): void {
  if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Role approbateur requis');
  }
}
