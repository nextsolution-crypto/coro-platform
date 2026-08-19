import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { getLimitsForLicense } from '../organizations/license-limits';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        isActive: true,
        horaireBase: true,
        companyName: true,
        companyLogoB64: true,
        companyLogoFullB64: true,
        companyPhone: true,
        companyEmail: true,
        companyAddress: true,
        companyWebsite: true,
        companyTagline: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: any;
    organizationId: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
  }
  async updateUser(id: string, data: any) {
    const { password, ...safeData } = data;
    return this.prisma.user.update({
      where: { id },
      data: safeData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyName: true,
        companyLogoB64: true,
        companyLogoFullB64: true,
        companyPhone: true,
        companyEmail: true,
        companyAddress: true,
        companyWebsite: true,
        companyTagline: true,
        horaireBase: true,
      },
    });
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule.');
    if (!/[a-z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule.');
    if (!/[0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre.');
    if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  async changePassword(id: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true },
    });
  }

  // ============================================================
  // GESTION DES UTILISATEURS PAR ORGANISATION (ADMIN uniquement)
  // ============================================================

  async findByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createInOrganization(organizationId: string, data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxUsers !== null) {
      const currentCount = await this.prisma.user.count({ where: { organizationId } });
      if (currentCount >= limits.maxUsers) {
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxUsers} utilisateur(s). Contactez CORO pour mettre à niveau.`
        );
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec ce courriel.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as any) || 'OPERATOR',
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async toggleActiveInOrganization(userId: string, organizationId: string, isActive: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable dans cette organisation.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }
}