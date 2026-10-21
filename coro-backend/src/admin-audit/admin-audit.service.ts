import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContext } from '../common/request-context';

type AuditActor =
  | { actorType?: 'INTERNAL_USER'; actorUserId: string; actorClientUserId?: never; systemActorKey?: never }
  | { actorType: 'CLIENT_USER'; actorClientUserId: string; actorUserId?: never; systemActorKey?: never }
  | { actorType: 'SYSTEM'; systemActorKey: string; actorUserId?: never; actorClientUserId?: never };

export type AdminAuditInput = AuditActor & {
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string | null;
  organizationId?: string | null;
  reason?: string | null;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
};

@Injectable()
export class AdminAuditService {
  normalizeReason(reason: string | undefined, required = false): string | null {
    const value = reason?.trim() || null;
    if (required && !value) throw new BadRequestException('Une raison est requise.');
    if (value && value.length > 500) throw new BadRequestException('La raison ne peut pas dépasser 500 caractères.');
    return value;
  }

  async record(tx: Prisma.TransactionClient, input: AdminAuditInput) {
    const actorType = input.actorType ?? 'INTERNAL_USER';
    const actor = actorType === 'INTERNAL_USER'
      ? await tx.user.findUnique({ where: { id: input.actorUserId }, select: { firstName: true, lastName: true, role: true, organizationId: true } })
      : actorType === 'CLIENT_USER'
        ? await tx.clientUser.findUnique({ where: { id: input.actorClientUserId }, select: { firstName: true, lastName: true, role: true, organizationId: true, isActive: true } })
        : null;
    if (actorType !== 'SYSTEM' && (!actor || ('isActive' in actor && !actor.isActive)))
      throw new BadRequestException('Acteur administratif introuvable.');
    if (actorType === 'CLIENT_USER' && input.organizationId && actor?.organizationId !== input.organizationId)
      throw new BadRequestException("L'acteur administratif ne correspond pas au tenant.");
    const displayName = actorType === 'SYSTEM'
      ? input.systemActorKey
      : `${actor!.firstName} ${actor!.lastName}`.trim();
    return tx.adminAuditEvent.create({
      data: {
        actorType,
        actorUserId: actorType === 'INTERNAL_USER' ? input.actorUserId : null,
        actorClientUserId: actorType === 'CLIENT_USER' ? input.actorClientUserId : null,
        systemActorKey: actorType === 'SYSTEM' ? input.systemActorKey : null,
        actorDisplayName: displayName!,
        actorRole: actorType === 'SYSTEM' ? 'SYSTEM' : actor!.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        organizationId: input.organizationId,
        reason: input.reason,
        requestId: RequestContext.requestId(),
        beforeData: input.beforeData,
        afterData: input.afterData,
      },
    });
  }
}
