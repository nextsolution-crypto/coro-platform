import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class ClientAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: { email },
      include: { client: true, organization: true },
    });

    if (!clientUser || !clientUser.isActive) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const valid = await bcrypt.compare(password, clientUser.password);
    if (!valid) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const token = this.jwt.sign({
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds,
      type: 'CLIENT',
    });

    return {
      token,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        clientName: clientUser.client.name,
        organizationId: clientUser.organizationId,
      },
    };
  }

  async createClientUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT_MANAGER' | 'CLIENT_CORPORATE';
    clientId: string;
    organizationId: string;
    temporaryPassword?: string;
  }) {
    const password = data.temporaryPassword || Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await this.prisma.clientUser.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { clientUser: existing, password: null, alreadyExists: true };
    }

    const clientUser = await this.prisma.clientUser.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as any,
        clientId: data.clientId,
        organizationId: data.organizationId,
      },
    });

    return { clientUser, password, alreadyExists: false };
  }

  async changePassword(clientUserId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.clientUser.update({
      where: { id: clientUserId },
      data: { password: hashedPassword },
    });
  }

    async generateMagicLink(clientUserId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await this.prisma.magicLink.create({
      data: { token, userId: clientUserId, expiresAt },
    });

    return `https://client.getcoro.io/magic?token=${token}`;
  }

  async validateMagicLink(token: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: { client: true },
        },
      },
    });

    if (!magicLink) throw new UnauthorizedException('Lien invalide.');
    if (magicLink.usedAt) throw new UnauthorizedException('Lien déjà utilisé.');
    if (magicLink.expiresAt < new Date()) throw new UnauthorizedException('Lien expiré.');

    // Marquer comme utilisé
    await this.prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    const clientUser = magicLink.user;

    const jwtToken = this.jwt.sign({
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds,
      type: 'CLIENT',
    });

    return {
      token: jwtToken,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        clientName: clientUser.client?.name,
        organizationId: clientUser.organizationId,
      },
    };
  }
}