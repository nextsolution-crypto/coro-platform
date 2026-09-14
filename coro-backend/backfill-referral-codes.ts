import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';

    for (let i = 0; i < 6; i++) {
      suffix += chars[randomInt(0, chars.length)];
    }

    const referralCode = `CR-${suffix}`;

    const existing = await prisma.organization.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!existing) {
      return referralCode;
    }
  }

  throw new Error('Impossible de générer un code unique.');
}

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {
      referralCode: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`${organizations.length} organisation(s) sans code.`);

  for (const organization of organizations) {
    const referralCode = await generateUniqueReferralCode();

    await prisma.organization.update({
      where: { id: organization.id },
      data: { referralCode },
    });

    console.log(`✓ ${organization.name} → ${referralCode}`);
  }

  console.log('Backfill terminé.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });