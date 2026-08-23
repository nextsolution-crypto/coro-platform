import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PcaConfiguratorService {
  constructor(private prisma: PrismaService) {}

  async getConfig(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        building: true,
        organization: true,
        pcaConfig: true,
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    // Pré-remplissage depuis les fiches existantes
    const prefill = {
      // Depuis la fiche organisation
      sector: project.organization.sector || null,
      employeeCount: project.organization.employeeCount || null,
      operatingHours: project.organization.operatingHours || null,
      // Depuis la fiche client
      regulatoryReqs: project.client.regulatoryRequirements || [],
      clientSector: project.client.sector || null,
      clientEmployeeCount: project.client.employeeCount || null,
      // Depuis la fiche bâtiment
      buildingName: project.building.name,
      buildingAddress: project.building.address,
      buildingCity: project.building.city,
      buildingProvince: project.building.province,
      // Coordonnateur par défaut = responsable du bâtiment
      coordinatorFirstName: project.building.responsableFirstName || null,
      coordinatorLastName: project.building.responsableLastName || null,
      coordinatorTitle: project.building.responsableTitre || null,
      coordinatorEmail: project.building.responsableEmail || null,
      coordinatorPhone: project.building.responsablePhone || null,
    };

    return {
      project: {
        id: project.id,
        name: project.name,
        documentType: project.documentType,
        year: project.year,
        client: project.client,
        building: project.building,
      },
      config: project.pcaConfig || null,
      prefill,
    };
  }

  async saveConfig(projectId: string, data: any) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Upsert PcaConfig
    const config = await this.prisma.pcaConfig.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: { ...data },
    });

    // Mettre à jour la progression du projet
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        progress: 25,
        status: 'IN_PROGRESS',
      },
    });

    return config;
  }

  async getLinkedPmu(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Chercher un PMU/PSI existant pour le même bâtiment
    const linkedProjects = await this.prisma.project.findMany({
      where: {
        buildingId: project.buildingId,
        documentType: { in: ['PMU', 'PSI'] },
        status: { in: ['VALIDATED', 'EXPORTED'] },
        id: { not: projectId },
      },
      select: {
        id: true,
        name: true,
        documentType: true,
        status: true,
        year: true,
      },
      orderBy: { year: 'desc' },
    });

    return linkedProjects;
  }
}