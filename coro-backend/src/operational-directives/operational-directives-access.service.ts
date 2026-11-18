import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationalDirectivesAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async require(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
  ) {
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
