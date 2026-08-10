import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number, daysAhead = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(0, daysAgo) + randomBetween(0, daysAhead));
  return d;
}

function randomPast(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(1, daysAgo));
  return d;
}

function randomFuture(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + randomBetween(1, daysAhead));
  return d;
}

async function main() {
  console.log('🚀 Seeding données démo CORO...');

  // ── 1. ORGANISATION DÉMO ────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Sécurité Conseil Démo inc.',
      isInternal: false,
      licenseType: 'STANDARD',
      isActive: true,
    },
  });
  console.log('✅ Organisation créée');

  // ── 2. UTILISATEURS ─────────────────────────────────
  const adminPwd = await bcrypt.hash('Demo2026!', 10);
  const opPwd = await bcrypt.hash('Conseiller2026!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.getcoro.io',
      password: adminPwd,
      firstName: 'Sophie',
      lastName: 'Tremblay',
      role: 'ADMIN',
      organizationId: org.id,
      horaireBase: 40,
      companyName: 'Sécurité Conseil Démo inc.',
      companyPhone: '(514) 555-0100',
      companyEmail: 'info@securiteconseil.ca',
      companyAddress: '1000 rue De La Gauchetière, Montréal, QC',
      companyWebsite: 'https://securiteconseil.ca',
    },
  });

  const conseiller1 = await prisma.user.create({
    data: {
      email: 'jean.dupont@demo.getcoro.io',
      password: opPwd,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'OPERATOR',
      organizationId: org.id,
      horaireBase: 40,
    },
  });

  const conseiller2 = await prisma.user.create({
    data: {
      email: 'marie.leclair@demo.getcoro.io',
      password: opPwd,
      firstName: 'Marie',
      lastName: 'Leclair',
      role: 'OPERATOR',
      organizationId: org.id,
      horaireBase: 32,
    },
  });
  console.log('✅ 3 utilisateurs créés');

  // ── 3. CLIENTS ──────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      name: 'Groupe Immobilier Petra',
      email: 'gestion@groupepetra.ca',
      phone: '(450) 555-0200',
      address: '3000 boul. Le Carrefour',
      city: 'Laval',
      province: 'QC',
      organizationId: org.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Industries Boréal ltée',
      email: 'securite@borealind.ca',
      phone: '(418) 555-0300',
      address: '500 rue Industrielle',
      city: 'Québec',
      province: 'QC',
      organizationId: org.id,
    },
  });
  console.log('✅ 2 clients créés');

  // ── 4. BÂTIMENTS ────────────────────────────────────
  const building1 = await prisma.building.create({
    data: {
      name: 'Tour Le Carrefour',
      address: '3000 boul. Le Carrefour',
      city: 'Laval',
      province: 'QC',
      postalCode: 'H7T 2P5',
      floors: 18,
      units: 45,
      buildingType: 'Tour à bureaux',
      responsableNom: 'Michel Beauchamp',
      responsableTitre: 'Directeur immobilier',
      organizationId: org.id,
      clientId: client1.id,
    },
  });

  const building2 = await prisma.building.create({
    data: {
      name: 'Usine Boréal — Site A',
      address: '500 rue Industrielle',
      city: 'Québec',
      province: 'QC',
      postalCode: 'G1N 4H5',
      floors: 2,
      units: 1,
      buildingType: 'Industriel',
      responsableNom: 'Lyne Gagnon',
      responsableTitre: 'Responsable HSE',
      organizationId: org.id,
      clientId: client2.id,
    },
  });

  const building3 = await prisma.building.create({
    data: {
      name: 'Complexe Saint-Laurent',
      address: '1200 av. Saint-Laurent',
      city: 'Montréal',
      province: 'QC',
      postalCode: 'H2X 2S5',
      floors: 12,
      units: 28,
      buildingType: 'Tour à bureaux',
      responsableNom: 'François Dubé',
      responsableTitre: 'Gestionnaire immobilier',
      organizationId: org.id,
      clientId: client1.id,
    },
  });
  console.log('✅ 3 bâtiments créés');

  // ── 5. PROJETS ──────────────────────────────────────

  // Projet 1 — PMU Tour à bureaux (VALIDATED)
  const projet1 = await prisma.project.create({
    data: {
      name: 'PMU Tour Le Carrefour 2026',
      documentType: 'PMU',
      status: 'VALIDATED',
      year: 2026,
      progress: 100,
      organizationId: org.id,
      clientId: client1.id,
      buildingId: building1.id,
      userId: conseiller1.id,
      submittedById: conseiller1.id,
      submittedAt: randomPast(15),
      approvedById: admin.id,
      approvedAt: randomPast(10),
      configData: {
        buildingType: 'Tour à bureaux',
        floors: 18,
        province: 'QC',
        gazNaturel: true,
        gazNaturelLieu: 'Local technique B-02, sous-sol',
        ascenseurs: true,
        gicleurs: true,
        typeAlarme: 'double',
        defibrillateur: true,
      },
    },
  });

  // Projet 2 — PMU Industriel (IN_PROGRESS)
  const projet2 = await prisma.project.create({
    data: {
      name: 'PMU Usine Boréal Site A 2026',
      documentType: 'PMU',
      status: 'IN_PROGRESS',
      year: 2026,
      progress: 65,
      organizationId: org.id,
      clientId: client2.id,
      buildingId: building2.id,
      userId: conseiller2.id,
      configData: {
        buildingType: 'Industriel',
        floors: 2,
        province: 'QC',
        gazNaturel: true,
        matieresDangereuses: true,
        gicleurs: false,
        typeAlarme: 'simple',
      },
    },
  });

  // Projet 3 — PSI (REVIEW)
  const projet3 = await prisma.project.create({
    data: {
      name: 'PSI Complexe Saint-Laurent 2026',
      documentType: 'PSI',
      status: 'REVIEW',
      year: 2026,
      progress: 90,
      organizationId: org.id,
      clientId: client1.id,
      buildingId: building3.id,
      userId: conseiller1.id,
      submittedById: conseiller1.id,
      submittedAt: randomPast(3),
      configData: {
        buildingType: 'Tour à bureaux',
        floors: 12,
        province: 'QC',
        gazNaturel: false,
        ascenseurs: true,
        gicleurs: true,
        typeAlarme: 'double',
      },
    },
  });
  console.log('✅ 3 projets créés');

  // ── 6. MANDATS ──────────────────────────────────────
  const dateDebut1 = randomPast(45);
  const dateLimite1 = new Date(dateDebut1);
  dateLimite1.setDate(dateLimite1.getDate() + 21);

  await prisma.projectMandate.create({
    data: {
      projectId: projet1.id,
      organizationId: org.id,
      ownerId: conseiller1.id,
      description: 'Mise à jour complète du PMU suite aux rénovations du rez-de-chaussée. Client prioritaire — délai serré.',
      montantVendu: 4500,
      tauxHoraire: 95,
      heuresBudgetees: 35,
      typeMandat: 'FORFAITAIRE',
      typeDelai: 'STANDARD',
      dateDebutDelai: dateDebut1,
      dateLimite: dateLimite1,
      delaiJours: 21,
      alerteActive: true,
    },
  });

  const dateDebut2 = randomPast(10);
  const dateLimite2 = new Date(dateDebut2);
  dateLimite2.setDate(dateLimite2.getDate() + 90);

  await prisma.projectMandate.create({
    data: {
      projectId: projet2.id,
      organizationId: org.id,
      ownerId: conseiller2.id,
      description: 'Premier PMU pour site industriel — 3 quarts de travail, matières dangereuses classe 3 et 8.',
      montantVendu: 8500,
      tauxHoraire: 95,
      heuresBudgetees: 72,
      typeMandat: 'FORFAITAIRE',
      typeDelai: 'STANDARD',
      dateDebutDelai: dateDebut2,
      dateLimite: dateLimite2,
      delaiJours: 90,
      alerteActive: true,
    },
  });

  await prisma.projectMandate.create({
    data: {
      projectId: projet3.id,
      organizationId: org.id,
      ownerId: conseiller1.id,
      description: 'PSI annuel — mise à jour liste téléphonique et procédures évacuation.',
      montantVendu: 3200,
      tauxHoraire: 95,
      heuresBudgetees: 25,
      typeMandat: 'FORFAITAIRE',
      typeDelai: 'STANDARD',
      dateDebutDelai: randomPast(20),
      dateLimite: randomFuture(5),
      delaiJours: 21,
      alerteActive: true,
    },
  });
  console.log('✅ 3 mandats créés');

  // ── 7. ACTIVITÉS ────────────────────────────────────
  const activiteTypes = [
    { type: 'formation_equipe_urgence', label: 'Formation pour équipe d\'urgence', duration: '2h30 – 3h00', dureeHeures: 3.0 },
    { type: 'exercice_evacuation', label: 'Exercice d\'évacuation annuel', duration: '3h00', dureeHeures: 3.0 },
    { type: 'formation_locataires', label: 'Formation aux locataires', duration: '1h00', dureeHeures: 1.0 },
    { type: 'exercice_table', label: 'Exercice de table', duration: '2h00', dureeHeures: 2.0 },
    { type: 'formation_epi', label: 'Formation équipe de première intervention (EPI)', duration: '2h00', dureeHeures: 2.0 },
  ];

  const statuts = ['fait', 'fait', 'fait', 'a_faire', 'reporte'];

  for (const projet of [projet1, projet2, projet3]) {
    for (let i = 0; i < 4; i++) {
      const act = activiteTypes[randomBetween(0, activiteTypes.length - 1)];
      const statut = statuts[randomBetween(0, statuts.length - 1)];
      const isFait = statut === 'fait';
      await prisma.projectActivity.create({
        data: {
          projectId: projet.id,
          organizationId: org.id,
          type: act.type,
          label: act.label,
          duration: act.duration,
          dureeHeures: act.dureeHeures,
          mode: randomBetween(0, 1) === 0 ? 'presentiel' : 'teams',
          status: statut,
          scheduledDate: isFait ? randomPast(60) : randomFuture(60),
          reportedDate: isFait ? randomPast(60) : null,
          isRecurring: randomBetween(0, 1) === 1,
          sourceMandate: true,
        },
      });
    }
  }
  console.log('✅ Activités créées');

  // ── 8. TÂCHES ET HEURES ─────────────────────────────
  const categoriesTaches = [
    { cat: 'Planification', taches: ['Réunion de démarrage client', 'Envoi de l\'offre signée', 'Confirmation des accès bâtiment'] },
    { cat: 'Visite', taches: ['Visite pour relevé technique', 'Collecte des plans existants', 'Photos du site'] },
    { cat: 'Rédaction', taches: ['Rédaction Module 1-2', 'Rédaction Module 3-4', 'Rédaction Module 7-8'] },
    { cat: 'Révision', taches: ['Révision interne', 'Soumission pour approbation'] },
    { cat: 'Livraison', taches: ['Envoi au client', 'Formation des occupants'] },
  ];

  for (const projet of [projet1, projet2, projet3]) {
    const userId = projet.userId;
    for (const categorie of categoriesTaches) {
      for (const tacheTitle of categorie.taches) {
        const estFait = projet.status === 'VALIDATED' ||
          (projet.status === 'REVIEW' && categorie.cat !== 'Livraison') ||
          (projet.status === 'IN_PROGRESS' && ['Planification', 'Visite'].includes(categorie.cat));

        const tache = await prisma.projectTask.create({
          data: {
            projectId: projet.id,
            organizationId: org.id,
            categoryName: categorie.cat,
            taskTitle: tacheTitle,
            status: estFait ? 'fait' : 'a_faire',
            dueDate: estFait ? randomPast(30) : randomFuture(30),
            assigneeId: userId,
            order: categoriesTaches.indexOf(categorie) * 10 + categorie.taches.indexOf(tacheTitle),
          },
        });

        // Ajouter des entrées de temps sur les tâches complétées
        if (estFait) {
          const heures = randomBetween(1, 4) + randomBetween(0, 1) * 0.5;
          await prisma.taskTimeEntry.create({
            data: {
              taskId: tache.id,
              userId,
              organizationId: org.id,
              date: randomPast(40),
              heures,
              note: randomBetween(0, 1) === 1 ? 'Travail effectué selon le plan' : null,
            },
          });
        }
      }
    }
  }
  console.log('✅ Tâches et entrées de temps créées');

  // ── 9. TIMELOG GÉNÉRAL ──────────────────────────────
  const categories = ['deplacement', 'reunion_interne', 'administration', 'formation_continue'];
  const labels = ['Déplacement client', 'Réunion d\'équipe hebdomadaire', 'Facturation et rapports', 'Webinaire NFPA'];

  for (const user of [conseiller1, conseiller2]) {
    for (let i = 0; i < 12; i++) {
      const idx = randomBetween(0, categories.length - 1);
      await prisma.timelogEntry.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          date: randomPast(60),
          heures: randomBetween(1, 4),
          category: categories[idx],
          note: labels[idx],
          isBillable: idx === 0,
        },
      });
    }
  }
  console.log('✅ Timelog général créé');

  // ── 10. COMMENTAIRES ────────────────────────────────
  const commentaires = [
    'Client très satisfait de la qualité du document. Demande une formation supplémentaire pour les nouveaux locataires.',
    'Attention : changement de coordonnées du service incendie depuis janvier 2026.',
    'Le responsable bâtiment souhaite une réunion de suivi dans 3 mois.',
  ];

  for (const [i, projet] of [projet1, projet2, projet3].entries()) {
    await prisma.projectComment.create({
      data: {
        projectId: projet.id,
        userId: admin.id,
        organizationId: org.id,
        contenu: commentaires[i],
      },
    });
  }
  console.log('✅ Commentaires créés');

  // ── 11. RÉSUMÉ ──────────────────────────────────────
  console.log('\n🎉 Seed démo terminé avec succès !');
  console.log('─────────────────────────────────────');
  console.log('Organisation : Sécurité Conseil Démo inc.');
  console.log('');
  console.log('Comptes créés :');
  console.log('  ADMIN   → admin@demo.getcoro.io / Demo2026!');
  console.log('  OPERATOR → jean.dupont@demo.getcoro.io / Conseiller2026!');
  console.log('  OPERATOR → marie.leclair@demo.getcoro.io / Conseiller2026!');
  console.log('');
  console.log('Projets :');
  console.log('  PMU Tour Le Carrefour 2026 → VALIDÉ ✅');
  console.log('  PMU Usine Boréal Site A 2026 → EN COURS 🔵');
  console.log('  PSI Complexe Saint-Laurent 2026 → EN RÉVISION 🟡');
  console.log('─────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());