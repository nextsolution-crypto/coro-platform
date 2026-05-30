import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateModule1, DocumentContext } from './module1.templates';

@Injectable()
export class GeneratorService {
  constructor(private prisma: PrismaService) {}

  async generateDocumentStructure(projectId: string, config: any) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        building: true,
        user: true,
      },
    });

    if (!project) throw new Error('Projet introuvable');

    const ctx: DocumentContext = {
      clientName: project.client.name,
      buildingName: project.building.name,
      buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
      city: project.building.city,
      province: config.province || 'Quebec',
      year: project.year,
      documentType: project.documentType,
      responsableNom: config.responsableNom || '',
      responsableTitre: config.responsableTitre || '',
      dateReleve: config.dateReleve || new Date().toISOString().split('T')[0],
      floors: config.floors || 0,
      hauteurBatiment: config.hauteurBatiment || false,
      multiLocataires: config.multiLocataires || false,
      companyName: project.user.companyName || 'CORO',
    };

    const module1 = generateModule1(ctx);

    return {
      projectId,
      documentType: project.documentType,
      clientName: project.client.name,
      buildingName: project.building.name,
      generatedAt: new Date(),
      modules: [module1],
    };
  }

  async getModule1Preview(projectId: string, config: any) {
    const structure = await this.generateDocumentStructure(projectId, config);
    return structure.modules[0];
  }
}