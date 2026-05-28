const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin2026!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@coro.app',
      password: hash,
      firstName: 'Admin',
      lastName: 'CORO',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Utilisateur créé:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());