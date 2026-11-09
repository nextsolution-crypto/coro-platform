import { ForbiddenException, Injectable } from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SpatialActor = {
  userId: string;
  organizationId: string;
  role: string;
};

@Injectable()
export class SpatialAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async require(
    actor: SpatialActor,
    organizationId: string,
    buildingId: string,
    permission: DisplayPermission,
  ): Promise<void> {
    if (!actor?.userId || actor.organizationId !== organizationId) {
      throw new ForbiddenException('Accès spatial interdit.');
    }
    const authorized = await this.prisma.user.findFirst({
      where: {
        id: actor.userId,
        organizationId,
        isActive: true,
        organization: { isActive: true },
        displayPermissions: { has: permission },
        displayBuildingIds: { has: buildingId },
      },
      select: { id: true },
    });
    if (!authorized)
      throw new ForbiddenException(
        'Permission Display et affectation au bâtiment requises.',
      );
  }
}
