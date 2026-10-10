import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  private async requireProject(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
  }

  // ── Lister toutes les versions d'un projet ─────────────────
  async findAll(projectId: string, actor: AdviserActor) {
    await this.requireProject(projectId, actor);
    return this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        snapshot: true,
        createdAt: true,
      },
    });
  }

  // ── Sauvegarder une nouvelle version ───────────────────────
  async create(
    projectId: string,
    label: string | undefined,
    actor: AdviserActor,
  ) {
    await this.requireProject(projectId, actor);
    // Récupérer le document actuel
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    // Trouver le numéro de version suivant
    const last = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (last?.versionNumber || 0) + 1;

    return this.prisma.projectVersion.create({
      data: {
        projectId,
        versionNumber,
        label: label || `Version ${versionNumber}`,
        snapshot: doc.content as any,
      },
    });
  }

  // ── Restaurer une version précédente ───────────────────────
  async restore(projectId: string, versionId: string, actor: AdviserActor) {
    await this.requireProject(projectId, actor);
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('Version introuvable');

    // Sauvegarder la version actuelle avant restauration
    await this.create(projectId, 'Sauvegarde avant restauration', actor);

    // Restaurer le snapshot dans le document actuel
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    await this.prisma.document.update({
      where: { id: doc.id },
      data: { content: version.snapshot as any },
    });

    return { success: true, restoredVersion: version.versionNumber };
  }

  // ── Supprimer une version ───────────────────────────────────
  async remove(projectId: string, versionId: string, actor: AdviserActor) {
    await this.requireProject(projectId, actor);
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('Version introuvable');

    return this.prisma.projectVersion.delete({ where: { id: versionId } });
  }
}
