import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const procs = await prisma.procedureDefault.findMany({
    where: { code: { in: ['P111', 'P112', 'P113', 'P114', 'P115'] } },
    select: { code: true, isActive: true },
  });
  console.log('P111-P115 en DB:', JSON.stringify(procs, null, 2));

  const total = await prisma.procedureDefault.count();
  console.log('Total procédures en DB:', total);
}

main().finally(() => prisma.$disconnect());