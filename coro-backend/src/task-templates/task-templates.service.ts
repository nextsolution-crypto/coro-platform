import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskTemplatesService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const templates = await this.prisma.taskTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ categoryName: 'asc' }, { order: 'asc' }],
    });

    // Grouper par catégorie
    const grouped: Record<string, any[]> = {};
    templates.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });

    return { templates, grouped };
  }

  async create(dto: any) {
    return this.prisma.taskTemplate.create({
      data: {
        categoryName: dto.categoryName,
        taskTitle: dto.taskTitle,
        documentTypes: dto.documentTypes || [],
        order: dto.order || 0,
        organizationId: dto.organizationId || null,
      },
    });
  }

  async update(id: string, dto: any) {
    const template = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template introuvable');
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        categoryName: dto.categoryName,
        taskTitle: dto.taskTitle,
        documentTypes: dto.documentTypes || [],
        order: dto.order ?? template.order,
        isActive: dto.isActive ?? template.isActive,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.taskTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async seedDefaultTemplates() {
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

    await this.prisma.taskTemplate.createMany({ data: templates });
    return { message: `${templates.length} templates créés avec succès` };
  }
}