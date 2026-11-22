import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { provenanceActor } from '../auth/coro-actor-provenance';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';

@Injectable()
export class OperationalLogAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFeatures: ClientFeatureEntitlementService,
  ) {}

  async require(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
  ): Promise<void> {
    const authority = provenanceActor(actor);
    if (authority.actorType === 'CLIENT_USER')
      await this.clientFeatures.require({
        authority,
        organizationId,
        buildingId,
        feature: 'OPERATIONAL_LOG',
        hiddenMessage: 'Entrée de main courante introuvable.',
      });
    await requireOperationalAccess(
      this.prisma,
      actor,
      organizationId,
      buildingId,
      permission,
      'Entrée de main courante introuvable.',
    );
  }

  /** Vrai si l'acteur détient la permission (sans lever d'exception). */
  async has(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
  ): Promise<boolean> {
    try {
      await this.require(actor, organizationId, buildingId, permission);
      return true;
    } catch {
      return false;
    }
  }

  private deny(): never {
    throw new NotFoundException('Entrée de main courante introuvable.');
  }
}
