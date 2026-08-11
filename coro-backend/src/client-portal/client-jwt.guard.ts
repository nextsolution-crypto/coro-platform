import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token client manquant.');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'CLIENT') {
        throw new UnauthorizedException('Token invalide.');
      }
      request.clientUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token client invalide ou expiré.');
    }
  }
}