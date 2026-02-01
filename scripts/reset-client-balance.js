require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const clientEmail = 'client@dental.com';
  
  const user = await prisma.user.findUnique({
    where: { email: clientEmail }
  });
  
  if (!user) {
    console.error(`❌ Utilisateur ${clientEmail} introuvable.`);
    process.exit(1);
  }
  
  // Réinitialiser le solde à 0
  await prisma.user.update({
    where: { email: clientEmail },
    data: { balance: 0 }
  });
  
  console.log(`✅ Solde réinitialisé pour ${clientEmail}`);
  console.log(`   Solde: 0.00`);
  console.log(`   Plafond: ${user.creditLimit || 0}`);
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
