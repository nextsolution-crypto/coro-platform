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

/**
 * Accès en ÉCRITURE à un projet.
 * - Administrateur : tous les projets de son organisation.
 * - Opérateur : seulement les projets dont il est propriétaire (Project.userId).
 *   Un administrateur peut changer le propriétaire (PATCH /projects/:id/owner).
 */
export function projectAccessWhere(
  actor: AdviserActor,
): Prisma.ProjectWhereInput {
  if (actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === 'OPERATOR') {
    return { organizationId: actor.organizationId, userId: actor.userId };
  }
  throw new ForbiddenException('Acces refuse a ce projet');
}

/**
 * Accès en LECTURE : tout conseiller voit les projets de son organisation.
 * Les écritures restent soumises à projectAccessWhere.
 */
export function projectReadWhere(
  actor: AdviserActor,
): Prisma.ProjectWhereInput {
  if (['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(actor.role)) {
    return { organizationId: actor.organizationId };
  }
  throw new ForbiddenException('Acces refuse a ce projet');
}

/** Le conseiller peut-il modifier ce projet (propriétaire ou administrateur)? */
export function canWriteProject(
  actor: AdviserActor,
  project: { organizationId: string; userId: string | null },
): boolean {
  if (project.organizationId !== actor.organizationId) return false;
  if (actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') return true;
  return actor.role === 'OPERATOR' && project.userId === actor.userId;
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
 * Statuts dans lesquels le contenu d'un plan peut encore changer (audit
 * M1-02, M1-03, M1-04). En révision, validé ou exporté, le plan est en
 * lecture seule : il faut d'abord un retour en révision (administrateur,
 * avec motif), comme pour l'éditeur de document.
 */
export const EDITABLE_PROJECT_STATUSES = ['DRAFT', 'IN_PROGRESS'] as const;

export function editableProjectAccessWhere(
  actor: AdviserActor,
): Prisma.ProjectWhereInput {
  return {
    ...mutableProjectAccessWhere(actor),
    status: { in: [...EDITABLE_PROJECT_STATUSES] },
  };
}

/**
 * Vérifie l'accès (affectation comprise) et que le plan est modifiable.
 * Message explicite quand le plan existe mais est verrouillé.
 */
export async function assertEditableProject(
  prisma: { project: { findFirst: (args: any) => PromiseLike<any> } },
  projectId: string,
  actor: AdviserActor,
): Promise<{ id: string; status: string }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(actor), isActive: true },
    select: { id: true, status: true },
  });
  if (!project || project.status === 'ARCHIVED') {
    throw new NotFoundException('Projet introuvable');
  }
  if (!(EDITABLE_PROJECT_STATUSES as readonly string[]).includes(project.status)) {
    throw new ConflictException(
      `Le plan est en lecture seule (statut ${project.status}). Demandez un retour en révision avant de le modifier.`,
    );
  }
  return project;
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

/**
 * lockMutableProject + verrou d'état documentaire : le plan doit être en
 * brouillon ou en cours (règle unique des écritures documentaires).
 */
export async function lockEditableProject(
  tx: Prisma.TransactionClient,
  projectId: string,
  actor: AdviserActor,
) {
  const project = await lockMutableProject(tx, projectId, actor);
  if (!(EDITABLE_PROJECT_STATUSES as readonly string[]).includes(project.status)) {
    throw new ConflictException(
      `Le plan est en lecture seule (statut ${project.status}). Demandez un retour en révision avant de le modifier.`,
    );
  }
  return project;
}

export function requireProjectApprover(actor: AdviserActor): void {
  if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Role approbateur requis');
  }
}

/**
 * Travail sur une tâche (cocher, saisir du temps) : en plus du propriétaire et de
 * l'administrateur, le conseiller affecté à l'activité de la tâche (réservation acceptée
 * ou proposée, ou ancienne affectation par courriel), le responsable de la tâche et le
 * coordonnateur de planification peuvent travailler dessus. Le projet est verrouillé
 * comme pour lockMutableProject.
 */
export async function lockProjectForTaskWork(
  tx: Prisma.TransactionClient,
  projectId: string,
  taskId: string,
  actor: AdviserActor,
): Promise<void> {
  const owned = await tx.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(actor) },
    select: { id: true },
  });
  if (owned) {
    await lockMutableProject(tx, projectId, actor);
    return;
  }
  if (actor.role !== 'OPERATOR') throw new NotFoundException('Projet introuvable');
  const user = await tx.user.findFirst({
    where: { id: actor.userId, organizationId: actor.organizationId, isActive: true },
    select: { email: true, planningCoordinator: true },
  });
  if (!user) throw new NotFoundException('Projet introuvable');
  const task = await tx.projectTask.findFirst({
    where: { id: taskId, projectId, organizationId: actor.organizationId },
    select: {
      assigneeId: true,
      assignees: { select: { userId: true } },
      activity: {
        select: {
          assigneeEmail: true,
          bookings: {
            where: {
              assignments: {
                some: { userId: actor.userId, status: { in: ['PENDING', 'ACCEPTED'] } },
              },
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!task) throw new NotFoundException('Tâche introuvable');
  const allowed =
    user.planningCoordinator ||
    task.assigneeId === actor.userId ||
    task.assignees.some((item) => item.userId === actor.userId) ||
    (task.activity?.bookings.length ?? 0) > 0 ||
    (!!task.activity?.assigneeEmail &&
      task.activity.assigneeEmail.trim().toLowerCase() === user.email.toLowerCase());
  if (!allowed)
    throw new ForbiddenException(
      'Seuls le propriétaire du projet et les conseillers affectés à l’activité peuvent travailler sur cette tâche.',
    );
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Project"
    WHERE "id" = ${projectId} AND "organizationId" = ${actor.organizationId}
    FOR UPDATE
  `);
  const project = await tx.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { status: true, isActive: true },
  });
  if (!project || project.isActive === false || project.status === 'ARCHIVED')
    throw new ConflictException(
      'Ce projet est archivé ou inactif et demeure en lecture seule.',
    );
}
