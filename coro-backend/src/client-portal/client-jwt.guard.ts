import {
  CLIENT_CSRF_HEADER,
  CLIENT_CSRF_VALUE,
  extractClientToken,
  isSafeMethod,
} from './client-session-cookie';
import {
  ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { clientAuthorityFromCanonicalIdentity } from '../auth/coro-authority';

@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { token, viaCookie } = extractClientToken(request);

    if (!token) {
      throw new UnauthorizedException('Token client manquant.');
    }
    // Session en cookie : une modification exige l'en-tête anti-CSRF (M3-05).
    if (
      viaCookie &&
      !isSafeMethod(request.method) &&
      request.headers?.[CLIENT_CSRF_HEADER] !== CLIENT_CSRF_VALUE
    ) {
      throw new ForbiddenException('Requête refusée (protection CSRF).');
    }

    try {
      const payload = this.jwt.verify(token);
      if (
        payload.type !== 'CLIENT' ||
        !Number.isInteger(payload.sessionVersion)
      ) {
        throw new UnauthorizedException('Token invalide.');
      }
      const now = new Date();
      const user = await this.prisma.clientUser.findFirst({
        where: {
          id: payload.sub,
          organizationId: payload.organizationId,
          isActive: true,
          client: { isActive: true },
          organization: { isActive: true },
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
          displayPermissions: true,
          displayBuildingIds: true,
          operationalPermissions: true,
          operationalAssignments: {
            where: {
              status: 'ACTIVE',
              effectiveFrom: { lte: now },
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
            },
            select: { buildingId: true },
          },
          sessionVersion: true,
        },
      });
      if (!user || user.sessionVersion !== payload.sessionVersion)
        throw new UnauthorizedException('Token invalide.');
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
        displayPermissions: user.displayPermissions,
        displayBuildingIds: user.displayBuildingIds,
        operationalPermissions: user.operationalPermissions,
      };
      request.coroAuthority = clientAuthorityFromCanonicalIdentity(user);
      return true;
    } catch {
      throw new UnauthorizedException('Token client invalide ou expiré.');
    }
  }
}
