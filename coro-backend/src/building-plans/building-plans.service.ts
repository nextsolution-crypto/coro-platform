import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdviserActor,
  assertEditableProject,
  projectAccessWhere,
} from '../auth/project-access';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB en bytes

@Injectable()
export class BuildingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lecture : affectation du conseiller comprise. */
  private async assertProjectOwnership(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  /**
   * Écriture : règle unique des écritures documentaires (brouillon ou en
   * cours). Les plans font partie du PDF officiel approuvé.
   */
  private async assertEditable(projectId: string, actor: AdviserActor) {
    await assertEditableProject(this.prisma, projectId, actor);
  }

  private validateFile(dto: any, required: boolean) {
    if (dto?.fileBase64 === undefined && !required) return;
    if (typeof dto?.fileBase64 !== 'string' || dto.fileBase64.length === 0) {
      throw new BadRequestException('Fichier du plan manquant.');
    }
    const cleaned = dto.fileBase64.includes(',')
      ? dto.fileBase64.slice(dto.fileBase64.indexOf(',') + 1)
      : dto.fileBase64;
    const bytes = Buffer.from(cleaned, 'base64');
    if (bytes.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Le fichier dépasse la limite de 25MB (${Math.round(bytes.length / 1024 / 1024)}MB)`
      );
    }
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new BadRequestException('Le plan doit être un fichier PDF.');
    }
    if (typeof dto.fileName !== 'string' || !dto.fileName.trim() || dto.fileName.length > 255) {
      throw new BadRequestException('Nom de fichier invalide.');
    }
  }

  async findAll(projectId: string, actor: AdviserActor) {
    await this.assertProjectOwnership(projectId, actor);
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

  async findOne(projectId: string, planId: string, actor: AdviserActor) {
    await this.assertProjectOwnership(projectId, actor);
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  async create(projectId: string, dto: any, actor: AdviserActor) {
    await this.assertEditable(projectId, actor);

    this.validateFile(dto, true);
    if (!['IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS'].includes(dto.section)) {
      throw new BadRequestException('Section de plan invalide.');
    }
    if (typeof dto.name !== 'string' || !dto.name.trim()) {
      throw new BadRequestException('Nom du plan requis.');
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
        fileSize:     Number(dto.fileSize) || 0,
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

  async update(projectId: string, planId: string, dto: any, actor: AdviserActor) {
    await this.assertEditable(projectId, actor);
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    // Si nouveau fichier : PDF valide et taille bornée.
    if (dto.fileBase64) this.validateFile(dto, true);

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

  async remove(projectId: string, planId: string, actor: AdviserActor) {
    await this.assertEditable(projectId, actor);
    const plan = await this.prisma.buildingPlan.findFirst({
      where: { id: planId, projectId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    await this.prisma.buildingPlan.delete({ where: { id: planId } });
  }

  async reorder(projectId: string, planId: string, newOrder: number, actor: AdviserActor) {
    await this.assertEditable(projectId, actor);
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