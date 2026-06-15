import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB en bytes

@Injectable()
export class BuildingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string) {
    const plans = await this.prisma.buildingPlan.findMany({
      where: { projectId },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
      select: {
        id: true,
        section: true,
        name: true,
        description: true,
        fileName: true,
        fileSize: true,
        emissionDate: true,
        revision: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        // Ne pas retourner fileBase64 dans la liste
      },
    });
    return plans;
  }

  async findOne(projectId: string, planId: string) {
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  async create(projectId: string, dto: any) {
    // Vérifier que le projet existe
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Vérifier la taille du fichier
    if (dto.fileBase64) {
      const sizeInBytes = Buffer.from(dto.fileBase64, 'base64').length;
      if (sizeInBytes > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Le fichier dépasse la limite de 25MB (${Math.round(sizeInBytes / 1024 / 1024)}MB)`
        );
      }
    }

    // Compter les plans existants dans cette section pour l'ordre
    const count = await this.prisma.buildingPlan.count({
      where: { projectId, section: dto.section },
    });

    return this.prisma.buildingPlan.create({
      data: {
        projectId,
        section:      dto.section,
        name:         dto.name,
        description:  dto.description || null,
        fileBase64:   dto.fileBase64,
        fileName:     dto.fileName,
        fileSize:     dto.fileSize,
        emissionDate: dto.emissionDate || null,
        revision:     dto.revision || null,
        order:        count,
      },
      select: {
        id: true,
        section: true,
        name: true,
        description: true,
        fileName: true,
        fileSize: true,
        emissionDate: true,
        revision: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(projectId: string, planId: string, dto: any) {
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    // Si nouveau fichier, vérifier la taille
    if (dto.fileBase64) {
      const sizeInBytes = Buffer.from(dto.fileBase64, 'base64').length;
      if (sizeInBytes > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Le fichier dépasse la limite de 25MB (${Math.round(sizeInBytes / 1024 / 1024)}MB)`
        );
      }
    }

    const updateData: any = {
      name:         dto.name         ?? plan.name,
      description:  dto.description  ?? plan.description,
      emissionDate: dto.emissionDate ?? plan.emissionDate,
      revision:     dto.revision     ?? plan.revision,
    };

    // Mettre à jour le fichier seulement si un nouveau est fourni
    if (dto.fileBase64) {
      updateData.fileBase64 = dto.fileBase64;
      updateData.fileName   = dto.fileName;
      updateData.fileSize   = dto.fileSize;
    }

    return this.prisma.buildingPlan.update({
      where: { id: planId },
      data: updateData,
      select: {
        id: true,
        section: true,
        name: true,
        description: true,
        fileName: true,
        fileSize: true,
        emissionDate: true,
        revision: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(projectId: string, planId: string) {
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    await this.prisma.buildingPlan.delete({ where: { id: planId } });
  }

  async reorder(projectId: string, planId: string, newOrder: number) {
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    return this.prisma.buildingPlan.update({
      where: { id: planId },
      data: { order: newOrder },
    });
  }

  // Retourne le fichier base64 complet pour l'export PDF
  async getFileForExport(projectId: string, planId: string) {
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }
}