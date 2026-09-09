import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';

async function geocodeAddress(address: string, city: string, province: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${province}, Canada`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: { 'User-Agent': 'CORO-Platform/1.0 (info@getcoro.io)' },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

@Injectable()
export class BuildingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(organizationId: string, clientId?: string) {
    const buildings = await this.prisma.building.findMany({
      where: { isActive: true, organizationId, ...(clientId && { clientId }) },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { projects: true } },
        projects: {
          select: {
            id: true,
            name: true,
            documentType: true,
            status: true,
            year: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return buildings.map(b => ({
      ...b,
      latitude: b.latitude,
      longitude: b.longitude,
      projectCount: b.projects.length,
      validatedCount: b.projects.filter(p => p.status === 'VALIDATED').length,
      activeCount: b.projects.filter(p => ['DRAFT', 'IN_PROGRESS'].includes(p.status)).length,
    }));
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
    // Geocoding automatique
    const coords = await geocodeAddress(data.address, data.city, data.province);
    const building = await this.prisma.building.create({
      data: {
        ...data,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      },
    });

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

    // Récupérer l'ancien responsable avant la mise à jour
    const oldBuilding = await this.prisma.building.findUnique({ where: { id } });
    const oldEmail = oldBuilding?.responsableEmail;
    const newEmail = data.responsableEmail;

    // Regéocoder si l'adresse a changé
    let coords: { latitude: number; longitude: number } | null = null;
    if (data.address || data.city || data.province) {
      const addr = data.address || oldBuilding?.address || '';
      const city = data.city || oldBuilding?.city || '';
      const prov = data.province || oldBuilding?.province || '';
      coords = await geocodeAddress(addr, city, prov);
    }
    const updated = await this.prisma.building.update({
      where: { id },
      data: {
        ...data,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
      },
    });

    // Si le responsable a changé
    if (newEmail && newEmail !== oldEmail) {
      // Retirer ce bâtiment de l'ancien responsable
      if (oldEmail) {
        const oldUser = await this.prisma.clientUser.findUnique({ where: { email: oldEmail } });
        if (oldUser) {
          const newBuildingIds = oldUser.buildingIds.filter((bid: string) => bid !== id);
          await this.prisma.clientUser.update({
            where: { email: oldEmail },
            data: { buildingIds: newBuildingIds },
          });
        }
      }

      // Créer ou mettre à jour le nouveau responsable
      await this.createManagerAccess(
        id,
        updated.clientId,
        organizationId,
        newEmail,
        data.responsableFirstName || '',
        data.responsableLastName || '',
      );
    }

    return updated;
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