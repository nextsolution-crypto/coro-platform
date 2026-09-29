import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from './auth-security.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: any) {
    if (!payload?.sub || !Number.isInteger(payload.authVersion)) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, organizationId: true, isActive: true, authVersion: true },
    });
    if (!user?.isActive || user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    return { userId: user.id, email: user.email, role: user.role, organizationId: user.organizationId, authVersion: user.authVersion };
  }
}
