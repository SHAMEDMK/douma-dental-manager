require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const clientEmail = 'client@dental.com';
  const password = process.env.ADMIN_PASSWORD || 'Douma@2025!123';
  
  const user = await prisma.user.findUnique({
    where: { email: clientEmail }
  });
  
  if (!user) {
    console.error(`❌ Utilisateur ${clientEmail} introuvable. Exécutez d'abord: npm run db:seed`);
    process.exit(1);
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email: clientEmail },
    data: { passwordHash }
  });
  
  console.log(`✅ Mot de passe mis à jour pour ${clientEmail}`);
  console.log(`   Mot de passe: ${password}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
