import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.client.findMany({
      where: { isActive: true, organizationId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { buildings: true, projects: true } } },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.client.findFirst({
      where: { id, organizationId },
      include: { buildings: true, projects: true },
    });
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    logoBase64?: string;
    organizationId: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) {
    const client = await this.prisma.client.create({ data });

    // Créer automatiquement le compte CLIENT_CORPORATE si email fourni
    if (data.contactEmail) {
      await this.createCorpoAccess(
        client.id,
        data.organizationId,
        data.contactEmail,
        data.contactFirstName || '',
        data.contactLastName || '',
        client.name,
      );
    }

    return client;
  }

  async createCorpoAccess(
    clientId: string,
    organizationId: string,
    email: string,
    firstName: string,
    lastName: string,
    clientName: string,
  ) {
    // Vérifier si le compte existe déjà
    const existing = await this.prisma.clientUser.findUnique({ where: { email } });
    if (existing) return existing;

    // Générer mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const clientUser = await this.prisma.clientUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'CLIENT_CORPORATE',
        clientId,
        organizationId,
      },
    });

    // Récupérer le nom de l'organisation
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    // Envoyer email d'invitation FR
    await this.emailService.sendClientInvitation({
      toEmail: email,
      toName: `${firstName} ${lastName}`.trim() || email,
      clientName,
      temporaryPassword: tempPassword,
      organizationName: org?.name || 'CORO',
    });

    return clientUser;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({ where: { id }, data });
  }

  async uploadLogo(id: string, logoBase64: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { logoBase64 },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
}