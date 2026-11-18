import { CoroActorType, Prisma } from '@prisma/client';
import type { AdviserActor } from './project-access';
import type { CoroAuthority } from './coro-authority';

export type ProvenanceActor = AdviserActor | CoroAuthority;

export function provenanceActor(actor: ProvenanceActor): {
  actorType: 'USER' | 'CLIENT_USER';
  actorId: string;
  organizationId: string;
  role: string;
} {
  if ('actorType' in actor) {
    return {
      actorType: actor.actorType,
      actorId: actor.actorId,
      organizationId: actor.organizationId,
      role: actor.role,
    };
  }
  return {
    actorType: 'USER',
    actorId: actor.userId,
    organizationId: actor.organizationId,
    role: actor.role,
  };
}

/**
 * Materializes the authenticated identity in the tenant-scoped provenance
 * bridge. Concrete User/ClientUser composite FKs make spoofed or cross-tenant
 * actors fail before the business write. Browser DTOs never reach this API.
 */
export async function ensureProvenanceActor(
  tx: Prisma.TransactionClient,
  actor: ProvenanceActor,
): Promise<ReturnType<typeof provenanceActor>> {
  const canonical = provenanceActor(actor);
  await tx.coroActorIdentity.upsert({
    where: {
      organizationId_actorType_actorId: {
        organizationId: canonical.organizationId,
        actorType: canonical.actorType,
        actorId: canonical.actorId,
      },
    },
    create: {
      organizationId: canonical.organizationId,
      actorType:
        canonical.actorType === 'USER'
          ? CoroActorType.USER
          : CoroActorType.CLIENT_USER,
      actorId: canonical.actorId,
      userId: canonical.actorType === 'USER' ? canonical.actorId : null,
      clientUserId:
        canonical.actorType === 'CLIENT_USER' ? canonical.actorId : null,
    },
    update: {},
  });
  return canonical;
}

export function provenanceData(actor: ProvenanceActor) {
  const canonical = provenanceActor(actor);
  return {
    actorType:
      canonical.actorType === 'USER'
        ? CoroActorType.USER
        : CoroActorType.CLIENT_USER,
    actorId: canonical.actorId,
  } as const;
}
