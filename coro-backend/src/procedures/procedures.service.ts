import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProceduresService {
  constructor(private prisma: PrismaService) {}

  // ── Lire toutes les procédures par défaut ──────────────────
  async findAll() {
    return this.prisma.procedureDefault.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true, code: true, isActive: true, updatedAt: true,
        content: true,
      },
    });
  }

  // ── Lire une procédure (override org si existe, sinon défaut) ──
  async findOne(id: string, organizationId: string) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    const override = await this.prisma.procedureOverride.findUnique({
      where: { procedureId_organizationId: { procedureId: id, organizationId } },
    });

    return {
      ...proc,
      content: override ? override.content : proc.content,
      isOverridden: !!override,
      overrideId: override?.id || null,
    };
  }

  // ── Modifier une procédure (crée ou met à jour un override) ──
  async update(id: string, organizationId: string, content: any) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    const override = await this.prisma.procedureOverride.upsert({
      where: { procedureId_organizationId: { procedureId: id, organizationId } },
      create: { procedureId: id, organizationId, content },
      update: { content },
    });

    return { success: true, overrideId: override.id };
  }

  // ── Restaurer la procédure par défaut (supprimer l'override) ──
  async restore(id: string, organizationId: string) {
    const existing = await this.prisma.procedureOverride.findUnique({
      where: { procedureId_organizationId: { procedureId: id, organizationId } },
    });

    if (!existing) return { success: true, message: 'Aucun override à supprimer' };

    await this.prisma.procedureOverride.delete({
      where: { procedureId_organizationId: { procedureId: id, organizationId } },
    });

    return { success: true };
  }

  // ── Modifier la procédure par défaut (SUPER_ADMIN seulement) ──
  async updateDefault(id: string, content: any) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    return this.prisma.procedureDefault.update({
      where: { id },
      data: { content },
    });
  }
}