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
  
  // S'assurer que le client a un creditLimit suffisant (5000)
  const creditLimit = 5000;
  const balance = 0;
  
  await prisma.user.update({
    where: { email: clientEmail },
    data: { 
      creditLimit: creditLimit,
      balance: balance
    }
  });
  
  console.log(`✅ Crédit configuré pour ${clientEmail}`);
  console.log(`   Solde: ${balance.toFixed(2)}`);
  console.log(`   Plafond: ${creditLimit.toFixed(2)}`);
  console.log(`   Disponible: ${creditLimit.toFixed(2)}`);
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
