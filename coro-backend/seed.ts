const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Crée le super-administrateur d'une base LOCALE vide.
// Le mot de passe n'est jamais versionné : SEED_ADMIN_PASSWORD (12+ caractères).
async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed.ts est réservé au développement local.');
  }
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Définir SEED_ADMIN_PASSWORD (12 caractères minimum) avant de lancer le seed.');
  }
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@coro.app',
      password: hash,
      firstName: 'Admin',
      lastName: 'CORO',
      role: 'SUPER_ADMIN',
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());