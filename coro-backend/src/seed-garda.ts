import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Création de l\'organisation GardaWorld...');

  // Créer l'organisation
  const org = await prisma.organization.create({
    data: {
      name: 'GardaWorld Sécurité',
      licenseType: 'ENTREPRISE',
      isActive: true,
    },
  });
  console.log(`✅ Organisation créée : ${org.name} (${org.id})`);

  const members = [
    { firstName: 'Myriam',           lastName: 'Bordeleau',          email: 'myriam.bordeleau@gardaworld.com',          role: 'ADMIN' },
    { firstName: 'Alexandre',        lastName: 'Demers',             email: 'alexandre.demers@gardaworld.com',          role: 'ADMIN' },
    { firstName: 'Mathieu',          lastName: 'Montaroux',          email: 'mathieu.montaroux@gardaworld.com',         role: 'ADMIN' },
    { firstName: 'Delvia',           lastName: 'Lajeunesse-Sennett', email: 'delvia.lajeunesse-sennett@gardaworld.com', role: 'OPERATOR' },
    { firstName: 'Mélanie',          lastName: 'Aubé',               email: 'melanie.aube@gardaworld.com',              role: 'OPERATOR' },
    { firstName: 'Christopher',      lastName: 'Jutras',             email: 'christopher.jutras@gardaworld.com',        role: 'OPERATOR' },
    { firstName: 'Justin',           lastName: 'Charette-Savoie',   email: 'justin.charette-savoie@gardaworld.com',    role: 'OPERATOR' },
    { firstName: 'Ashley-Michelle',  lastName: 'Camber',             email: 'ashley-michelle.camber@gardaworld.com',    role: 'OPERATOR' },
    { firstName: 'Samara',           lastName: 'Kaddouri',           email: 'samara.kaddouri@gardaworld.com',           role: 'OPERATOR' },
  ];

  const defaultPassword = 'Garda2026!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  for (const member of members) {
    const user = await prisma.user.create({
      data: {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        password: hashedPassword,
        role: member.role as any,
        organizationId: org.id,
        isActive: true,
      },
    });
    console.log(`✅ ${user.firstName} ${user.lastName} (${user.role}) — ${user.email}`);
  }

  console.log('\n🎉 Organisation GardaWorld créée avec succès !');
  console.log(`📧 Mot de passe temporaire pour tous : ${defaultPassword}`);
  console.log(`🏢 Organisation ID : ${org.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });