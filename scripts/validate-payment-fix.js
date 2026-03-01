#!/usr/bin/env node
/**
 * Validation de la correction du test payment-workflow.
 * Vérifie que le setup E2E est OK, que le test payment passe (non skip), et optionnellement toute la suite.
 *
 * Usage:
 *   node scripts/validate-payment-fix.js           # check + payment test uniquement
 *   node scripts/validate-payment-fix.js --full    # check + payment + toute la suite E2E
 */
const { execSync } = require('child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path'); // eslint-disable-line @typescript-eslint/no-require-imports

const root = path.resolve(__dirname, '..');
const fullSuite = process.argv.includes('--full');

console.log('🧪 Validation de la correction du test payment-workflow\n');

try {
  // 1. Vérifier le setup
  console.log('1. Vérification du setup...');
  execSync('npm run test:e2e:check', { cwd: root, stdio: 'inherit' });

  // 2. S'assurer que les données de test (dont INV-E2E-0001) sont présentes
  console.log('\n2. Données E2E (seed)...');
  execSync('npm run db:seed:e2e', { cwd: root, stdio: 'pipe' });

  // 3. Exécuter le test payment
  console.log('\n3. Exécution du test payment-workflow...');
  const paymentOutput = execSync(
    'npx playwright test tests/e2e/payment-workflow.spec.ts --reporter=list',
    { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 }
  );

  if (paymentOutput.includes('1 skipped') || (paymentOutput.includes('skipped') && paymentOutput.includes('payment-workflow'))) {
    console.log('❌ Test payment-workflow SKIPPED — problème persistant (aucune facture avec solde ?)');
    console.log('   → Lancer: npm run db:seed:e2e puis relancer ce script.');
    process.exit(1);
  }
  if (!paymentOutput.includes('passed') || paymentOutput.includes('failed')) {
    console.log('❌ Test payment-workflow en échec ou sortie inattendue.');
    console.log(paymentOutput.slice(-500));
    process.exit(1);
  }
  console.log('✅ Test payment-workflow PASSED (non skip)');

  if (fullSuite) {
    console.log('\n4. Exécution de tous les tests E2E...');
    execSync('npm run test:e2e', { cwd: root, stdio: 'inherit' });
    console.log('\n🎉 VALIDATION RÉUSSIE — payment-workflow OK et suite complète exécutée.');
  } else {
    console.log('\n🎉 VALIDATION RÉUSSIE — Le test payment-workflow n\'est plus skip.');
    console.log('   Pour lancer toute la suite : npm run test:e2e');
    console.log('   Ou : npm run test:e2e:validate-payment:full');
  }
} catch (error) {
  if (error.status !== undefined) {
    process.exit(error.status);
  }
  console.error('❌ Erreur lors de la validation:', error.message);
  process.exit(1);
}
