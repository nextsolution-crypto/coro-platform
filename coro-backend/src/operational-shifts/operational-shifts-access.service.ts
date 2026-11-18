import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ProvenanceActor } from '../auth/coro-actor-provenance';
import { requireOperationalAccess } from '../auth/operational-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationalShiftsAccessService {
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
      'Quart opérationnel introuvable.',
    );
  }

  deny(): never {
    throw new NotFoundException('Quart opérationnel introuvable.');
  }
}
