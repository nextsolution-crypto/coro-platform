import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ── Créer une notification pour un utilisateur ──────────
  async create(data: {
    userId: string;
    organizationId: string;
    type: string;
    title: string;
    message: string;
    projectId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  // ── Créer une notification pour toute l'org sauf exclusions ──
  async createForOrganization(data: {
    organizationId: string;
    type: string;
    title: string;
    message: string;
    projectId?: string;
    excludeUserIds?: string[];
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: data.organizationId,
        isActive: true,
        id: { notIn: data.excludeUserIds || [] },
      },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        organizationId: data.organizationId,
        type: data.type,
        title: data.title,
        message: data.message,
        projectId: data.projectId,
      })),
    });
  }

  // ── Récupérer les notifications d'un utilisateur ────────
  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Compter les non lues ─────────────────────────────────
  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ── Marquer comme lue ────────────────────────────────────
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // ── Tout marquer comme lu ────────────────────────────────
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ── Supprimer une notification ───────────────────────────
  async remove(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  // ── Vérifier les délais de livraison ────────────────────
  async checkMandateDelays(organizationId: string, userId: string, userRole: string): Promise<any[]> {
    const today = new Date();

    const mandates = await this.prisma.projectMandate.findMany({
      where: {
        organizationId,
        typeMandat: 'FORFAITAIRE',
        dateLimite: { not: null },
        alerteActive: true,
        project: {
          isActive: true,
          status: { notIn: ['VALIDATED', 'EXPORTED', 'ARCHIVED'] },
          // Conseiller voit seulement ses mandats, Admin voit tout
          ...(userRole === 'OPERATOR' ? {
            OR: [
              { userId },
              { mandate: { ownerId: userId } },
            ]
          } : {}),
        },
      },
      include: {
        project: {
          include: { client: true, building: true, user: true },
        },
      },
    });

    const alerts: any[] = [];

    for (const mandate of mandates) {
      if (!mandate.dateLimite) continue;
      const dateLimite = new Date(mandate.dateLimite);
      const diffMs = dateLimite.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let level: string | null = null;
      if (diffDays < 0)      level = 'DEPASSE';
      else if (diffDays <= 3) level = 'CRITIQUE';
      else if (diffDays <= 7) level = 'URGENT';
      else if (diffDays <= 14) level = 'ATTENTION';

      if (level) {
        alerts.push({
          mandateId: mandate.id,
          projectId: mandate.projectId,
          projectName: mandate.project.name,
          clientName: mandate.project.client.name,
          dateLimite: mandate.dateLimite,
          diffDays,
          level,
          userId: mandate.project.userId,
          delaiJours: mandate.delaiJours,
        });
      }
    }

    return alerts;
  }
}