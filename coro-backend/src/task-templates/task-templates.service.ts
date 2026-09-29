import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

@Injectable()
export class TaskTemplatesService {
  constructor(private prisma: PrismaService, @Optional() private adminAudit?: AdminAuditService) {}

  private get audit(): AdminAuditService {
    if (!this.adminAudit) throw new Error('AdminAuditService is required for global task-template mutations.');
    return this.adminAudit;
  }

  // Tous les templates globaux (SuperAdmin)
  async getAll() {
    const templates = await this.prisma.taskTemplate.findMany({
      where: { isActive: true, organizationId: null },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    templates.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });

    return { templates, grouped };
  }

  // Templates d'une organisation spécifique (Admin client)
  async getAllForOrg(organizationId: string) {
    const templates = await this.prisma.taskTemplate.findMany({
      where: { isActive: true, organizationId },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    templates.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });

    return { templates, grouped };
  }

  // Templates globaux + organisation combinés (pour affichage référence)
  async getAllWithGlobal(organizationId: string) {
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null },
          { organizationId },
        ],
      },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    templates.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });

    return { templates, grouped };
  }

  async create(dto: any, organizationId: string | null) {
    return this.prisma.taskTemplate.create({
      data: {
        categoryName: dto.categoryName,
        taskTitle: dto.taskTitle,
        documentTypes: dto.documentTypes || [],
        order: dto.order || 0,
        organizationId,
      },
    });
  }

  async createGlobal(dto: any, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.taskTemplate.create({ data: { categoryName: dto.categoryName, taskTitle: dto.taskTitle, documentTypes: dto.documentTypes || [], order: dto.order || 0, organizationId: null } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_TEMPLATE_CREATED', targetType: 'TaskTemplate', targetId: created.id, targetLabel: created.taskTitle, afterData: { categoryName: created.categoryName, taskTitle: created.taskTitle } });
      return created;
    });
  }

  async updateGlobal(id: string, dto: any, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.taskTemplate.findFirst({ where: { id, organizationId: null } });
      if (!current) throw new NotFoundException('Template global introuvable');
      const updated = await tx.taskTemplate.update({ where: { id }, data: { categoryName: dto.categoryName ?? current.categoryName, taskTitle: dto.taskTitle ?? current.taskTitle, documentTypes: dto.documentTypes ?? current.documentTypes, order: dto.order ?? current.order, isActive: dto.isActive ?? current.isActive } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_TEMPLATE_UPDATED', targetType: 'TaskTemplate', targetId: id, targetLabel: updated.taskTitle, beforeData: { categoryName: current.categoryName, taskTitle: current.taskTitle, isActive: current.isActive }, afterData: { categoryName: updated.categoryName, taskTitle: updated.taskTitle, isActive: updated.isActive } });
      return updated;
    });
  }

  async deleteGlobal(id: string, actor: any) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.taskTemplate.findFirst({ where: { id, organizationId: null } });
      if (!current) throw new NotFoundException('Template global introuvable');
      const updated = await tx.taskTemplate.update({ where: { id }, data: { isActive: false } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_TEMPLATE_DISABLED', targetType: 'TaskTemplate', targetId: id, targetLabel: current.taskTitle, beforeData: { active: current.isActive }, afterData: { active: false } });
      return updated;
    });
  }

  async update(id: string, dto: any, organizationId: string | null) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new NotFoundException('Template introuvable');
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        categoryName: dto.categoryName ?? template.categoryName,
        taskTitle: dto.taskTitle ?? template.taskTitle,
        documentTypes: dto.documentTypes ?? template.documentTypes,
        order: dto.order ?? template.order,
        isActive: dto.isActive ?? template.isActive,
      },
    });
  }

  async delete(id: string, organizationId: string | null) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new NotFoundException('Template introuvable');
    return this.prisma.taskTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async seedDefaultTemplates(actor: any) {
    const existing = await this.prisma.taskTemplate.count();
    if (existing > 0) return { message: 'Templates déjà initialisés' };

    const templates = [
      // PRÉPARATION
      { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 1 },
      { categoryName: 'PRÉPARATION', taskTitle: 'Relecture du document en vigueur si mise à jour', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 2 },
      { categoryName: 'PRÉPARATION', taskTitle: 'Demande de documentation de projet', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 3 },
      { categoryName: 'PRÉPARATION', taskTitle: 'Préparation des plans pour le relevé technique', documentTypes: ['PMU', 'PSI'], order: 4 },
      { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rendez-vous pour le relevé technique', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 5 },
      // OPÉRATION
      { categoryName: 'OPÉRATION', taskTitle: 'Visite pour le relevé technique', documentTypes: ['PMU', 'PSI'], order: 1 },
      { categoryName: 'OPÉRATION', taskTitle: 'Téléchargement des médias sur le Drive', documentTypes: ['PMU', 'PSI'], order: 2 },
      { categoryName: 'OPÉRATION', taskTitle: 'Écriture et/ou mise à jour du document', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 3 },
      { categoryName: 'OPÉRATION', taskTitle: 'Mise à jour des plans pour G-Link', documentTypes: ['PMU', 'PSI'], order: 4 },
      { categoryName: 'OPÉRATION', taskTitle: 'Envoi des plans à G-Link', documentTypes: ['PMU', 'PSI'], order: 5 },
      { categoryName: 'OPÉRATION', taskTitle: 'Vérification des plans G-Link', documentTypes: ['PMU', 'PSI'], order: 6 },
      { categoryName: 'OPÉRATION', taskTitle: 'Déposer les plans de G-Link dans le Drive', documentTypes: ['PMU', 'PSI'], order: 7 },
      // VÉRIFICATIONS INTERNES
      { categoryName: 'VÉRIFICATIONS INTERNES', taskTitle: 'Révision supérieure', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 1 },
      { categoryName: 'VÉRIFICATIONS INTERNES', taskTitle: 'Validation, contrôle qualité', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 2 },
      // APPROBATION CLIENT
      { categoryName: 'APPROBATION CLIENT', taskTitle: 'Valider avec Myriam si le mandat est facturé à 100%', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 1 },
      { categoryName: 'APPROBATION CLIENT', taskTitle: 'Envoi du document PDF au client pour approbation', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 2 },
      // MANUTENTION
      { categoryName: 'MANUTENTION', taskTitle: 'Valider avec le client l\'adresse de livraison', documentTypes: ['PMU', 'PSI'], order: 1 },
      { categoryName: 'MANUTENTION', taskTitle: 'Envoi des documents à Nouveau Concept pour impression et envoi au client', documentTypes: ['PMU', 'PSI'], order: 2 },
      // ADMINISTRATION
      { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'], order: 1 },
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.taskTemplate.createMany({ data: templates });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'GLOBAL_TASK_TEMPLATES_SEEDED', targetType: 'TaskTemplateCollection', targetId: 'global', targetLabel: 'Modèles de tâches globaux', afterData: { count: templates.length } });
    });
    return { message: `${templates.length} templates créés avec succès` };
  }
}
