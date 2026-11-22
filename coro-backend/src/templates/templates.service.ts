import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  // ── Lister les modèles de l'organisation ───────────────────
  async findAll(organizationId: string) {
    return this.prisma.projectTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // ── Créer un modèle depuis un projet existant ──────────────
  async createFromProject(
    projectId: string,
    actor: AdviserActor,
    name: string,
    description?: string,
  ) {
    const organizationId = actor.organizationId;
    const userId = actor.userId;
    // Affectation du conseiller vérifiée (audit M3-09).
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      include: { documents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const doc = project.documents[0];
    const configData = {
      documentType: project.documentType,
      projectConfig: project.configData,
      documentConfig: doc?.content ? (doc.content as any).config : null,
    };

    return this.prisma.projectTemplate.create({
      data: {
        name,
        description,
        documentType: project.documentType,
        configData,
        organizationId,
        createdById: userId,
      },
    });
  }

  // ── Supprimer un modèle ────────────────────────────────────
  async remove(id: string, organizationId: string) {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException('Modèle introuvable');

    return this.prisma.projectTemplate.delete({ where: { id } });
  }

  // ── Récupérer un modèle (pour pré-remplir la création) ────
  async findOne(id: string, organizationId: string) {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException('Modèle introuvable');
    return template;
  }
}