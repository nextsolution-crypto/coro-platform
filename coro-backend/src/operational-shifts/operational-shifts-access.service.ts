import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { provenanceActor } from '../auth/coro-actor-provenance';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';

@Injectable()
export class OperationalShiftsAccessService {
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
        feature: 'OPERATIONAL_SHIFTS',
        hiddenMessage: 'Quart opérationnel introuvable.',
      });
    await requireOperationalAccess(
      this.prisma,
      actor,
      organizationId,
      buildingId,
      permission,
      'Quart opérationnel introuvable.',
    );
  }

  deny(): never {
    throw new NotFoundException('Quart opérationnel introuvable.');
  }
}
