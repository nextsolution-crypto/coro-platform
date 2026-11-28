import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { advisorCsrfSatisfied, extractAdvisorToken } from './advisor-session-cookie';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from './auth-security.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: (request: any) => extractAdvisorToken(request).token,
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any) {
    if (extractAdvisorToken(request).viaCookie && !advisorCsrfSatisfied(request)) {
      throw new UnauthorizedException('En-tête de protection manquant.');
    }
    if (!payload?.sub || !Number.isInteger(payload.authVersion)) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, role: true, organizationId: true, isActive: true, authVersion: true, planningCoordinator: true,
        organization: { select: { projectVisibility: true } },
      },
    });
    if (!user?.isActive || user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    return {
      userId: user.id, email: user.email, role: user.role, organizationId: user.organizationId, authVersion: user.authVersion,
      projectVisibility: user.organization?.projectVisibility ?? 'OPEN',
      planningCoordinator: user.planningCoordinator === true,
    };
  }
}
