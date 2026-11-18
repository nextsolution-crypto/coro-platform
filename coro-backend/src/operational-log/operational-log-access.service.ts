import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationalLogAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async require(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
  ): Promise<void> {
    await requireOperationalAccess(
      this.prisma,
      actor,
      organizationId,
      buildingId,
      permission,
      'Entrée de main courante introuvable.',
    );
  }

  private deny(): never {
    throw new NotFoundException('Entrée de main courante introuvable.');
  }
}
