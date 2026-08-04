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
  console.log('Organisation test créée :', testOrg.id);

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
  console.log('Utilisateur test créé :', testUser.email);
  console.log('Mot de passe : Test2026!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });