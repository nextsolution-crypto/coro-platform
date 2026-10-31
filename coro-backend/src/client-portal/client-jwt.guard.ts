import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token client manquant.');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'CLIENT' || !Number.isInteger(payload.sessionVersion)) {
        throw new UnauthorizedException('Token invalide.');
      }
      const user = await this.prisma.clientUser.findFirst({
        where: {
          id: payload.sub,
          organizationId: payload.organizationId,
          isActive: true,
          client: { isActive: true },
        },
        select: {
          id: true,
          email: true,
          role: true,
          clientId: true,
          organizationId: true,
          buildingIds: true,
          populationPermissions: true,
          operationalReviewPermissions: true,
          correctiveActionPermissions: true,
          sessionVersion: true,
        },
      });
      if (!user || user.sessionVersion !== payload.sessionVersion) throw new UnauthorizedException('Token invalide.');
      // Identity proof comes from the signed token; mutable authorization scope
      // always comes from the current canonical ClientUser row.
      request.clientUser = {
        ...payload,
        sub: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        organizationId: user.organizationId,
        buildingIds: user.buildingIds,
        populationPermissions: user.populationPermissions,
        operationalReviewPermissions: user.operationalReviewPermissions,
        correctiveActionPermissions: user.correctiveActionPermissions,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token client invalide ou expiré.');
    }
  }
}
