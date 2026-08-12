import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BuildingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(organizationId: string, clientId?: string) {
    return this.prisma.building.findMany({
      where: { isActive: true, organizationId, ...(clientId && { clientId }) },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { projects: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.building.findFirst({
      where: { id, organizationId },
      include: { client: true, projects: true },
    });
  }

  async findProjects(buildingId: string) {
    return this.prisma.project.findMany({
      where: { buildingId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        documentType: true,
        year: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async create(data: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    floors?: number;
    units?: number;
    buildingType?: string;
    clientId: string;
    organizationId: string;
    responsableFirstName?: string;
    responsableLastName?: string;
    responsableTitre?: string;
    responsableEmail?: string;
    responsablePhone?: string;
  }) {
    const building = await this.prisma.building.create({ data });

    // Créer automatiquement le compte CLIENT_MANAGER si email fourni
    if (data.responsableEmail) {
      await this.createManagerAccess(
        building.id,
        data.clientId,
        data.organizationId,
        data.responsableEmail,
        data.responsableFirstName || '',
        data.responsableLastName || '',
      );
    }

    return building;
  }

  async createManagerAccess(
    buildingId: string,
    clientId: string,
    organizationId: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    // Vérifier si le compte existe déjà
    const existing = await this.prisma.clientUser.findUnique({ where: { email } });

    if (existing) {
      // Ajouter le bâtiment à la liste si pas déjà présent
      if (!existing.buildingIds.includes(buildingId)) {
        await this.prisma.clientUser.update({
          where: { email },
          data: { buildingIds: { push: buildingId } },
        });
      }
      return existing;
    }

    // Générer mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const clientUser = await this.prisma.clientUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'CLIENT_MANAGER',
        clientId,
        organizationId,
        buildingIds: [buildingId],
      },
    });

    // Récupérer le nom du client et de l'organisation
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    // Envoyer email d'invitation
    await this.emailService.sendClientInvitation({
      toEmail: email,
      toName: `${firstName} ${lastName}`.trim() || email,
      clientName: client?.name || '',
      temporaryPassword: tempPassword,
      organizationName: org?.name || 'CORO',
    });

    return clientUser;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.building.update({ where: { id }, data });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.building.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id, organizationId } });
    if (!building) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
}