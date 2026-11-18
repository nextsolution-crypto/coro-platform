import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { provenanceActor } from '../auth/coro-actor-provenance';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';

@Injectable()
export class OperationalDirectivesAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFeatures: ClientFeatureEntitlementService,
  ) {}
  async require(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
  ) {
    const authority = provenanceActor(actor);
    if (authority.actorType === 'CLIENT_USER')
      await this.clientFeatures.require({
        authority,
        organizationId,
        buildingId,
        feature: permission.startsWith('OPERATIONAL_FOLLOWUP_')
          ? 'OPERATIONAL_FOLLOWUPS'
          : 'OPERATIONAL_DIRECTIVES',
        hiddenMessage: 'Ressource operationnelle introuvable.',
      });
    await requireOperationalAccess(
      this.prisma,
      actor,
      organizationId,
      buildingId,
      permission,
      'Ressource operationnelle introuvable.',
    );
  }
  private deny(): never {
    throw new NotFoundException('Ressource operationnelle introuvable.');
  }
}
