import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding task lists...');

  const TASK_LISTS = [
    {
      name: 'Production documentaire',
      description: 'Tâches standard pour la production d\'un document de mesures d\'urgence',
      category: 'DOCUMENT',
      documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'],
      isDefault: true,
      templates: [
        { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', order: 1 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Relecture du document en vigueur si mise à jour', order: 2 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Demande de documentation de projet', order: 3 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Préparation des plans pour le relevé technique', order: 4 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rendez-vous pour le relevé technique', order: 5 },
        { categoryName: 'OPÉRATION', taskTitle: 'Visite pour le relevé technique', order: 1 },
        { categoryName: 'OPÉRATION', taskTitle: 'Téléchargement des médias sur le Drive', order: 2 },
        { categoryName: 'OPÉRATION', taskTitle: 'Écriture et/ou mise à jour du document', order: 3 },
        { categoryName: 'OPÉRATION', taskTitle: 'Mise à jour des plans pour G-Link', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Envoi des plans à G-Link', order: 5 },
        { categoryName: 'OPÉRATION', taskTitle: 'Vérification des plans G-Link', order: 6 },
        { categoryName: 'OPÉRATION', taskTitle: 'Déposer les plans de G-Link dans le Drive', order: 7 },
        { categoryName: 'VÉRIFICATIONS INTERNES', taskTitle: 'Révision supérieure', order: 1 },
        { categoryName: 'VÉRIFICATIONS INTERNES', taskTitle: 'Validation, contrôle qualité', order: 2 },
        { categoryName: 'APPROBATION CLIENT', taskTitle: 'Valider avec Myriam si le mandat est facturé à 100%', order: 1 },
        { categoryName: 'APPROBATION CLIENT', taskTitle: 'Envoi du document PDF au client pour approbation', order: 2 },
        { categoryName: 'MANUTENTION', taskTitle: 'Valider avec le client l\'adresse de livraison', order: 1 },
        { categoryName: 'MANUTENTION', taskTitle: 'Envoi des documents à Nouveau Concept pour impression et envoi au client', order: 2 },
        { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', order: 1 },
      ],
    },
    {
      name: 'Exercice d\'évacuation',
      description: 'Tâches pour la planification et l\'exécution d\'un exercice d\'évacuation ou de table',
      category: 'ACTIVITE',
      documentTypes: [],
      isDefault: true,
      templates: [
        { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', order: 1 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rdv pour l\'exercice', order: 2 },
        { categoryName: 'OPÉRATION', taskTitle: 'Exercice d\'évacuation', order: 1 },
        { categoryName: 'OPÉRATION', taskTitle: 'Écriture du rapport d\'exercice', order: 2 },
        { categoryName: 'OPÉRATION', taskTitle: 'Validation, contrôle qualité', order: 3 },
        { categoryName: 'OPÉRATION', taskTitle: 'Envoi du rapport au client format PDF', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Déposer les fichiers dans OneDrive', order: 5 },
        { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', order: 1 },
      ],
    },
    {
      name: 'Formation mesures d\'urgence',
      description: 'Tâches pour la préparation et la livraison d\'une formation en mesures d\'urgence',
      category: 'ACTIVITE',
      documentTypes: [],
      isDefault: true,
      templates: [
        { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', order: 1 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rdv pour la formation', order: 2 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Préparation du support pédagogique', order: 3 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Validation, contrôle qualité', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Formation client', order: 1 },
        { categoryName: 'OPÉRATION', taskTitle: 'Déposer les fichiers dans le OneDrive', order: 2 },
        { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', order: 1 },
      ],
    },
    {
      name: 'Plan d\'évacuation mural',
      description: 'Tâches pour la production et l\'installation de plans d\'évacuation muraux',
      category: 'DOCUMENT',
      documentTypes: [],
      isDefault: true,
      templates: [
        { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', order: 1 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Demande de documentation de projet', order: 2 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rdv pour le relevé technique', order: 3 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Préparation des plans pour le relevé technique', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Visite pour le relevé technique', order: 1 },
        { categoryName: 'OPÉRATION', taskTitle: 'Téléchargement des documents / médias sur le Drive', order: 2 },
        { categoryName: 'OPÉRATION', taskTitle: 'Mise au propre des plans pour G-Link', order: 3 },
        { categoryName: 'OPÉRATION', taskTitle: 'Envoi des plans à G-Link', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Vérification des plans G-Link', order: 5 },
        { categoryName: 'OPÉRATION', taskTitle: 'Déposer les plans G-Link dans OneDrive', order: 6 },
        { categoryName: 'OPÉRATION', taskTitle: 'Validation, contrôle qualité', order: 7 },
        { categoryName: 'APPROBATION CLIENT', taskTitle: 'Validation de facturation client à 100% avant envoi', order: 1 },
        { categoryName: 'APPROBATION CLIENT', taskTitle: 'Envoi du document PDF au client pour approbation', order: 2 },
        { categoryName: 'IMPRESSION / LIVRAISON / INSTALLATION', taskTitle: 'Envoi des documents à Nouveau Concept pour impression', order: 1 },
        { categoryName: 'IMPRESSION / LIVRAISON / INSTALLATION', taskTitle: 'Installation des plans chez le client', order: 2 },
        { categoryName: 'IMPRESSION / LIVRAISON / INSTALLATION', taskTitle: 'Clôturer le projet sur la plateforme G-Link', order: 3 },
        { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', order: 1 },
      ],
    },
    {
      name: 'Visite de conformité',
      description: 'Tâches pour la réalisation d\'une visite de conformité sur site',
      category: 'ACTIVITE',
      documentTypes: [],
      isDefault: true,
      templates: [
        { categoryName: 'PRÉPARATION', taskTitle: 'Prise de contact avec le client', order: 1 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Relecture du document en vigueur', order: 2 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Fixer le rdv pour la visite de conformité', order: 3 },
        { categoryName: 'PRÉPARATION', taskTitle: 'Préparation de la grille d\'évaluation', order: 4 },
        { categoryName: 'OPÉRATION', taskTitle: 'Visite de conformité sur site', order: 1 },
        { categoryName: 'OPÉRATION', taskTitle: 'Téléchargement des médias sur le Drive', order: 2 },
        { categoryName: 'OPÉRATION', taskTitle: 'Rédaction du rapport de conformité', order: 3 },
        { categoryName: 'OPÉRATION', taskTitle: 'Validation, contrôle qualité', order: 4 },
        { categoryName: 'APPROBATION CLIENT', taskTitle: 'Envoi du rapport au client format PDF', order: 1 },
        { categoryName: 'ADMINISTRATION', taskTitle: 'Demande de facturation', order: 1 },
      ],
    },
  ];

  for (const listData of TASK_LISTS) {
    const { templates, ...listInfo } = listData;

    // Vérifier si la liste existe déjà
    const existing = await prisma.taskList.findFirst({
      where: { name: listInfo.name, organizationId: null },
    });

    if (existing) {
      console.log(`Liste déjà existante: ${listInfo.name} — ignorée`);
      continue;
    }

    const list = await prisma.taskList.create({
      data: {
        ...listInfo,
        organizationId: null,
      },
    });

    await prisma.taskTemplate.createMany({
      data: templates.map(t => ({
        ...t,
        taskListId: list.id,
        documentTypes: [],
        organizationId: null,
        isActive: true,
      })),
    });

    console.log(`✓ Liste créée: ${list.name} (${templates.length} tâches)`);
  }

  console.log('Seed terminé.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());