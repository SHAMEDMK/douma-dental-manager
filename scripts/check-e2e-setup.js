#!/usr/bin/env node
/**
 * Vérifie que l'environnement E2E est correctement configuré.
 * Usage : npm run test:e2e:check
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function fail(msg, hint) {
  console.log(`❌ ${msg}`);
  errors.push({ msg, hint });
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
}

console.log('🔍 Vérification du setup E2E...\n');

// 1. Fichiers et dossiers essentiels
if (fs.existsSync(path.join(root, 'playwright.config.ts'))) {
  ok('playwright.config.ts présent');
} else {
  fail('playwright.config.ts non trouvé', 'Créer la configuration Playwright à la racine du projet.');
}

if (fs.existsSync(path.join(root, 'docs', 'E2E_DOUMA_GUIDE.md'))) {
  ok('Guide E2E présent (docs/E2E_DOUMA_GUIDE.md)');
} else {
  fail('Guide E2E non trouvé', 'Vérifier que docs/E2E_DOUMA_GUIDE.md existe.');
}

if (fs.existsSync(path.join(root, 'tests', 'e2e'))) {
  ok('Dossier tests/e2e présent');
} else {
  fail('Dossier tests/e2e non trouvé', 'Créer le dossier tests/e2e et y placer les specs.');
}

if (fs.existsSync(path.join(root, 'tests', 'e2e', '_template.spec.ts'))) {
  ok('Template de test présent (_template.spec.ts)');
} else {
  fail('Template de test non trouvé', 'Vérifier que tests/e2e/_template.spec.ts existe.');
}

// 2. package.json
let pkg;
try {
  pkg = require(path.join(root, 'package.json'));
} catch (e) {
  fail('package.json illisible ou absent', 'Vérifier la syntaxe de package.json.');
  pkg = {};
}

if (pkg.devDependencies?.['@playwright/test'] || pkg.dependencies?.['@playwright/test']) {
  ok('@playwright/test déclaré dans package.json');
} else {
  fail('@playwright/test non trouvé dans les dépendances', 'Ajouter : npm install -D @playwright/test');
}

if (pkg.scripts?.['test:e2e']) {
  ok('Script test:e2e défini');
} else {
  fail('Script test:e2e non défini', 'Ajouter "test:e2e" dans package.json scripts.');
}

// 3. Playwright installé
try {
  require.resolve('@playwright/test', { paths: [root] });
  ok('Playwright installé (node_modules)');
} catch {
  fail('Playwright non installé', 'Exécuter : npm install');
}

// 4. Configuration Playwright (lecture seulement si le fichier existe)
let configContent = '';
if (fs.existsSync(path.join(root, 'playwright.config.ts'))) {
  try {
    configContent = fs.readFileSync(path.join(root, 'playwright.config.ts'), 'utf8');
  } catch (e) {
    fail('playwright.config.ts illisible', 'Vérifier les droits et la syntaxe du fichier.');
  }
}

if (configContent) {
  if (configContent.includes('webServer')) {
    ok('Configuration Playwright définit un webServer');
  } else {
    warn('Configuration Playwright sans webServer (les tests peuvent nécessiter un serveur lancé manuellement).');
  }
  if (configContent.includes('E2E_DOUMA_GUIDE')) {
    ok('Configuration référence le guide E2E');
  } else {
    warn('Configuration ne référence pas le guide E2E (commentaire dans webServer recommandé).');
  }
}

// Résultat
console.log('');
if (errors.length > 0) {
  console.log('❌ Problèmes détectés :');
  errors.forEach(({ msg, hint }) => console.log(`   • ${msg}\n     → ${hint}`));
  console.log('\n🔧 Corrigez ces points puis relancez : npm run test:e2e:check');
  process.exit(1);
}

console.log('✅ Tous les checks passent !');

// Vérification optionnelle : facture avec solde pour payment-workflow.spec.ts
(async function checkPaymentTestData() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: 'INV-E2E-0001',
        balance: { gt: 0 },
      },
    });
    await prisma.$disconnect();
    if (invoice) {
      console.log(`✅ Facture de test avec solde présente: ${invoice.invoiceNumber} (${invoice.balance} Dh)`);
    } else {
      warn('Aucune facture avec solde trouvée (INV-E2E-0001) — payment-workflow peut être skip. Lancer: npm run db:seed:e2e');
    }
  } catch (e) {
    warn('Impossible de vérifier les données de test paiement: ' + (e.message || e));
  }
})().catch(() => {}).then(() => {
  console.log('\n🚀 Vous pouvez lancer les tests avec : npm run test:e2e');
});
