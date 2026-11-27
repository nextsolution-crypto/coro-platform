import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
      select: {
        id: true,
        name: true,
        description: true,
        documentType: true,
        createdAt: true,
        createdById: true,
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
    name = typeof name === 'string' ? name.trim() : '';
    if (!name || name.length > 120)
      throw new BadRequestException('Nom du modèle requis (120 caractères maximum)');
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

    const template = await this.prisma.projectTemplate.create({
      data: {
        name,
        description,
        documentType: project.documentType,
        configData,
        organizationId,
        createdById: userId,
      },
    });
    await this.prisma.auditLog
      .create({
        data: {
          action: 'TEMPLATE_CREATE',
          entityType: 'PROJECT_TEMPLATE',
          entityId: template.id,
          projectId,
          description: `Modèle « ${name} » créé à partir du projet`,
          userId,
          organizationId,
        },
      })
      .catch(() => undefined);
    return template;
  }

  // ── Supprimer un modèle ────────────────────────────────────
  async remove(id: string, actor: { organizationId: string; userId: string; role: string }) {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!template) throw new NotFoundException('Modèle introuvable');
    if (
      template.createdById !== actor.userId &&
      !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)
    )
      throw new ForbiddenException(
        'Seul l’auteur du modèle ou un administrateur peut le supprimer',
      );

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