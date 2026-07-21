import { PrismaClient } from '@prisma/client';
import { getAllProcedures } from '../module4.templates';

const prisma = new PrismaClient();

async function main() {
  const procedures = getAllProcedures();
  console.log(`Migration de ${procedures.length} procédures vers la DB...`);

  let created = 0;
  let skipped = 0;

  for (const proc of procedures) {
    const existing = await prisma.procedureDefault.findUnique({
      where: { code: proc.code },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.procedureDefault.create({
      data: {
        code: proc.code,
        content: proc as any,
      },
    });
    created++;
    console.log(`  ✓ ${proc.code} — ${proc.titleFR}`);
  }

  console.log(`\nTerminé : ${created} créée(s), ${skipped} déjà existante(s).`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());