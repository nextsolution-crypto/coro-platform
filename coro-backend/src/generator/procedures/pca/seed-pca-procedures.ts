// ============================================================
// CORO — Script de seed des procédures PCA en base de données
// Exécuter avec : npx ts-node src/generator/procedures/pca/seed-pca-procedures.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
import { PCA_PROCEDURES_REGISTRY } from './index';

const prisma = new PrismaClient();

async function seedPcaProcedures() {
  console.log('🌱 Seed des procédures PCA en cours...');

  for (const procedure of PCA_PROCEDURES_REGISTRY) {
    try {
      // Vérifier si la procédure existe déjà
      const existing = await prisma.procedureDefault.findFirst({
        where: { code: procedure.code },
      });

      if (existing) {
        // Mettre à jour
        await prisma.procedureDefault.update({
          where: { id: existing.id },
          data: {
            code: procedure.code,
            isActive: true,
            content: procedure as any,
          },
        });
        console.log(`✅ Mise à jour : ${procedure.code} — ${procedure.titleFR}`);
      } else {
        // Créer
        await prisma.procedureDefault.create({
          data: {
            code: procedure.code,
            isActive: true,
            content: procedure as any,
          },
        });
        console.log(`✅ Créé : ${procedure.code} — ${procedure.titleFR}`);
      }
    } catch (err) {
      console.error(`❌ Erreur pour ${procedure.code}:`, err);
    }
  }

  console.log('✅ Seed PCA terminé !');
  await prisma.$disconnect();
}

seedPcaProcedures();