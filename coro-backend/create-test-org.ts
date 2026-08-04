import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const testOrg = await prisma.organization.create({
    data: {
      name: 'Firme Test ABC',
      isInternal: false,
      licenseType: 'STANDARD',
    },
  });

  const hashedPassword = await bcrypt.hash('Test2026!', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'test@firmeabc.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Utilisateur',
      role: 'ADMIN',
      organizationId: testOrg.id,
    },
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });