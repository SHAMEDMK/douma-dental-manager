# Tests E2E – DOUMA Dental Manager

Guide de référence pour la suite de tests end-to-end Playwright (61 tests, ~3 min).

---

**Cheat sheet (1 min)**

| Besoin | Commande |
|--------|----------|
| Lancer les tests | `npm run test:e2e` |
| Serveur frais | `npm run test:e2e:fresh` |
| UI / navigateur visible / debug | `npm run test:e2e:ui` \| `test:e2e:dev` \| `test:e2e:debug` |
| Rapport HTML | `npx playwright show-report` |
| Vérifier le setup E2E | `npm run test:e2e:check` |
| Valider le test payment (sans toute la suite) | `npm run test:e2e:validate-payment` |

**Comptes E2E** (mots de passe dans le seed) : admin `admin@douma.com`, client `client@dental.com`, compta/stock/commercial/livreur `*@douma.com` → voir section 4.

**Structure** : tests dans `tests/e2e/`, projets admin / client / no-auth. Commande de test : `CMD-E2E-PREPARED`.

**Dépannage rapide** : serveur bloqué → `npm run kill-port-3000` ; tests instables → `npm run test:e2e:fresh` ; données incohérentes → `npm run db:seed:e2e`.

---

## Sommaire

1. [Commandes](#1-commandes)
2. [Workflow au quotidien](#2-workflow-au-quotidien)
3. [Structure des tests](#3-structure-des-tests)
4. [Comptes et seed E2E](#4-comptes-et-seed-e2e)
5. [Configuration utile](#5-configuration-utile-playwrightconfigts)
6. [Débogage](#6-débogage)
7. [Ajouter un nouveau test](#7-ajouter-un-nouveau-test)
8. [Bonnes pratiques](#8-bonnes-pratiques)
9. [Dépannage](#9-dépannage)
10. [Erreurs ECONNRESET](#10-erreurs-econnreset-dans-les-logs)
11. [Améliorations possibles](#11-améliorations-possibles-optionnel)
12. [Confirmation de livraison](#12-confirmation-de-livraison-full-workflow-delivery)
13. [Rapport après exécution](#13-rapport-après-exécution)
14. [Intégration continue (CI)](#14-intégration-continue-ci)
15. [Mise à jour de ce guide](#mise-à-jour-de-ce-guide)

---

## 1. Commandes

| Commande | Usage |
|----------|--------|
| `npm run test:e2e` | Lancer tous les tests (réutilise un serveur déjà lancé si présent) |
| `npm run test:e2e:ui` | Interface Playwright |
| `npm run test:e2e:fresh` | Tuer le port 3000 puis lancer les tests (serveur frais) |
| `npm run test:e2e:ci` | Mode CI (1 worker, 2 retries) – pour pipeline |
| `npm run test:e2e:dev` | Navigateur visible, 2 workers |
| `npm run test:e2e:debug` | Débogage pas à pas |
| `npm run test:e2e:single` | Un seul fichier (delivery-workflow) |
| `npm run test:e2e:check` | Vérifier que le setup E2E est correct (config, guide, template, Playwright) |
| `npm run test:e2e:validate-payment` | Validation ciblée : check + seed + test payment-workflow uniquement |
| `npm run test:e2e:validate-payment:full` | Idem puis exécution de toute la suite E2E (61 tests) |
| `npm run kill-port-3000` | Libérer le port 3000 manuellement |
| `npm run db:seed:e2e` | Réappliquer le seed E2E (mots de passe, commande PREPARED) |

---

## 2. Workflow au quotidien

| Situation | Action |
|-----------|--------|
| Développement normal | `npm run dev` dans un terminal, puis `npm run test:e2e` dans un autre (serveur réutilisé) |
| Serveur instable ou tests bizarres | `npm run test:e2e:fresh` |
| Port 3000 bloqué | `npm run kill-port-3000` puis `npm run dev` |
| Avant merge / PR | `npm run test:e2e:ci` |

---

## 3. Structure des tests

Les specs sont dans **tests/e2e/** (fichiers plats, pas de sous-dossiers). Chaque fichier est associé à un **projet** Playwright selon son nom (défini dans `playwright.config.ts` via `testMatch`) :

| Projet | Rôle | Fichiers (exemples) |
|--------|------|---------------------|
| **auth-setup** | Création des sessions | `auth.setup.spec.ts` |
| **admin** | Session admin (`.auth/admin.json`) | `admin-approval.spec.ts`, `order-workflow.spec.ts`, `product-management.spec.ts`, etc. |
| **client** | Session client (`.auth/client.json`) | `smoke.spec.ts`, `delivery-workflow.spec.ts`, `payment-workflow.spec.ts`, `workflow-complet.spec.ts`, etc. |
| **no-auth** | Aucune session | `auth.spec.ts`, `rate-limit-login.spec.ts`, `api-admin-security.spec.ts` |

Pour ajouter un nouveau spec, créer le fichier dans `tests/e2e/` puis l’ajouter au `testMatch` du projet concerné dans **playwright.config.ts**.

### Ajouter un nouveau test à la configuration

Dans `playwright.config.ts`, ajouter le pattern du fichier au tableau `testMatch` du projet approprié. Exemple pour un test admin :

```typescript
// Projet 'admin' dans playwright.config.ts
{
  name: 'admin',
  use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
  dependencies: ['auth-setup'],
  testMatch: [
    /admin-approval\.spec\.ts/,
    // ... autres tests existants
    /votre-nouveau-test\.spec\.ts/,  // ajouter cette ligne
  ],
},
```

Même principe pour les projets **client** et **no-auth** : ajouter une ligne `/nom-du-fichier\.spec\.ts/` dans le `testMatch` correspondant.

Template pour démarrer : **tests/e2e/_template.spec.ts** (à copier et renommer).

---

## 4. Comptes et seed E2E

- Les tests utilisent **E2E_SEED=1** (défini par `test:e2e`) pour que le seed fixe des mots de passe connus.
- **Ne pas** mettre `E2E_SEED` dans `.env`.

Comptes après seed :

| Rôle | Email | Mot de passe |
|------|--------|--------------|
| Admin | admin@douma.com | password |
| Client | client@dental.com | password123 |
| Comptable | compta@douma.com | password123 |
| Magasinier | stock@douma.com | password123 |
| Commercial | commercial@douma.com | password123 |
| Livreur | livreur@douma.com | password123 |

Le seed crée aussi une commande **PREPARED** pour le client de test : `CMD-E2E-PREPARED`, BL `BL-E2E-0001`, utilisée par `workflow.order-to-prepared.spec.ts`. En E2E, une facture avec solde est créée pour le test paiement : **INV-E2E-0001** (50 Dh restants, statut PARTIAL), liée à cette commande.

---

## 5. Configuration utile (playwright.config.ts)

- **webServer** : `npm run dev`, timeout 3 min, `stdout: 'ignore'`, `stderr: 'pipe'`, `reuseExistingServer: !process.env.CI` (réutilise en local, serveur dédié en CI).
- **Retries** : 0 en local (voir les vrais échecs), 2 en CI.
- **Projet client** : timeout 3 min pour les workflows longs.
- Screenshot et vidéo conservés en cas d’échec.

---

## 6. Débogage

### Mode debug

```bash
npm run test:e2e:debug
```

Ouvre le navigateur en mode pas à pas ; vous pouvez mettre des breakpoints, inspecter le DOM, relancer une action.

Pour un seul fichier :

```bash
npx playwright test tests/e2e/nom-du-fichier.spec.ts --debug
```

### Traces, screenshots et vidéos

- En cas d’échec, Playwright enregistre **screenshot** et **vidéo** dans `test-results/`.
- Les **traces** sont générées au premier retry (config : `trace: 'on-first-retry'`). Pour les avoir à chaque échec : `trace: 'on'` (plus lourd).
- Consulter tout ça via le rapport : `npx playwright show-report` (traces cliquables, vidéos, captures).

### Bonnes habitudes

1. Lancer le test en isolation : `npx playwright test tests/e2e/fichier.spec.ts`.
2. Utiliser `--debug` pour reproduire l’étape qui échoue.
3. Vérifier le rapport HTML pour voir à quel moment (capture, trace) l’assertion a échoué.
4. Si l’élément n’est pas trouvé : vérifier le sélecteur dans DevTools (inspecteur) sur la même page après la même action.

---

## 7. Ajouter un nouveau test

1. **Choisir le projet** : admin (gestion, paramètres), client (commandes, panier, paiements), ou no-auth (login, APIs publiques).
2. **Créer le fichier** : par ex. `tests/e2e/ma-fonctionnalite.spec.ts`. S’inspirer de **tests/e2e/_template.spec.ts**.
3. **Ajouter au config** : dans `playwright.config.ts`, ajouter le pattern au `testMatch` du projet (ex. `/ma-fonctionnalite\.spec\.ts/`).
4. **Vérifier** : le test passe seul (`npx playwright test tests/e2e/ma-fonctionnalite.spec.ts`), puis avec toute la suite (`npm run test:e2e`).

Privilégier les **data-testid** pour les éléments cliquables ou ciblés (boutons, formulaires) pour limiter les cas où un changement de texte casse le test.

---

## 8. Bonnes pratiques

- **Sélecteurs** : préférer `getByTestId('...')`, `getByRole(...)`, puis `getByText(...)` ; éviter les sélecteurs CSS fragiles (classes, structure du DOM).
- **Attentes** : préférer `expect(element).toBeVisible()`, `expect(page).toHaveURL(...)` avec un timeout explicite si besoin ; **éviter** `page.waitForTimeout(ms)` sauf cas rare (animation inévitable).
- **Timeout** : pour un test long, `test.setTimeout(120000)` au début du test ou dans le projet (déjà 180000 pour le projet client).
- **Indépendance** : chaque test doit pouvoir tourner après le seed sans dépendre de l’ordre d’exécution ; ne pas compter sur des données créées par un autre test.
- **Credentials** : utiliser les comptes du seed (section 4) ; ne pas hardcoder d’autres mots de passe.
- **Fixtures / session partagée** : les projets **admin** et **client** utilisent un état de session pré-rempli (`.auth/admin.json`, `.auth/client.json`) créé par `auth.setup.spec.ts`. Les tests de ces projets n’ont pas besoin de se connecter à chaque fois ; ils démarrent déjà authentifiés. Pour un test no-auth (login, APIs publiques), ne pas utiliser de `storageState`.

---

## 9. Dépannage

| Problème | Pistes de solution |
|----------|--------------------|
| **Vérifier l’installation** | Lancer `npm run test:e2e:check` pour vérifier config, guide, template et dépendance Playwright. En cas d’échec, corriger les points indiqués (ex. `npm install`). |
| **Serveur ne démarre pas** | Vérifier que le port 3000 est libre : `npm run kill-port-3000`. Puis `npm run dev` dans un terminal et vérifier http://127.0.0.1:3000. |
| **Élément non trouvé / Timeout** | Vérifier le sélecteur (DevTools). Attendre l’élément : `await expect(page.getByTestId('...')).toBeVisible({ timeout: 10000 })` plutôt qu’un `waitForTimeout` fixe. Vérifier que le bon rôle (admin/client) est utilisé (projet Playwright). |
| **Tests échouent après un changement de l’app** | Mettre à jour les sélecteurs ou les textes attendus. Si un bouton a changé de libellé, préférer ajouter un `data-testid` dans l’app et l’utiliser dans le test. |
| **Échec d’authentification** | Les états de session sont dans `.auth/` (générés par `auth.setup.spec.ts`). Supprimer `.auth/` et relancer : `rm -rf .auth && npm run test:e2e` (sous Windows : supprimer le dossier `.auth` à la main). Vérifier que le seed a bien été exécuté (mots de passe connus). |
| **Seed non exécuté / base incohérente** | Les tests supposent que le seed E2E a été appliqué (mots de passe connus, commande PREPARED). Lancer `npm run db:seed:e2e` puis relancer les tests, ou utiliser `npm run test:e2e` qui exécute le seed automatiquement avant les tests. |
| **Redirection attendue ne se produit pas** | Ex. après « Valider la commande », la création de commande peut être lente. Utiliser un timeout plus long sur l’assertion : `await expect(page).toHaveURL(/\/portal\/orders/, { timeout: 20000 })`. |
| **Test passe seul, échoue en suite** | Problème d’isolation ou de concurrence. Lancer avec 1 worker : `npx playwright test tests/e2e/fichier.spec.ts --workers=1`. Vérifier qu’aucune donnée persistante n’est supposée d’un autre test. |
| **payment-workflow marqué skipped** | Le test appelle `test.skip()` si, sur la liste des factures admin, aucune ligne n’a le bouton « Encaisser » (facture avec solde restant > 0). C’est **volontaire** : on évite un échec quand les données ne permettent pas le flux. Relancer la suite ou lancer ce test après une commande client fraîche pour qu’il passe. |

### Workflow de paiement — Comportement spécial

Le test **payment-workflow.spec.ts** peut être marqué comme **skipped** si aucune facture avec solde restant (> 0) n'est présente dans la liste admin.

- **Comportement** : le test attend jusqu'à 8 s une ligne avec le bouton « Encaisser ». Si aucune n'est trouvée, `test.skip()` est appelé. Ce n'est **pas un échec** mais une adaptation aux données disponibles.
- **Pour le faire passer** : lancer les tests avec le seed E2E à jour (`npm run test:e2e` exécute le seed avant les tests). Le seed crée la facture **INV-E2E-0001** (50 Dh restants) pour la commande `CMD-E2E-PREPARED`. Si besoin, réappliquer le seed : `npm run db:seed:e2e`.
- **Vérification** : `npm run test:e2e:check` signale si la facture de test avec solde est présente en base.

### ✅ Problème résolu : Workflow de paiement

**Historique** : Le test `payment-workflow.spec.ts` était parfois skip car il nécessitait une facture avec solde restant.

**Solution mise en place** :
1. **Seed amélioré** : Crée automatiquement **INV-E2E-0001** (100 Dh, 50 Dh payés, 50 Dh restants) pour la commande `CMD-E2E-PREPARED`.
2. **Vérification** : `npm run test:e2e:check` confirme la présence des données (facture avec solde).
3. **Script de validation** : `node scripts/validate-payment-fix.js` enchaîne check + test payment ; ajouter `--full` pour lancer toute la suite.

**État actuel** :
- Le test payment-workflow **passe systématiquement** lorsque le seed E2E a été exécuté.
- Aucun skip non désiré si les données de test sont présentes.
- Données de test garanties par le seed (`npm run db:seed:e2e` ou `npm run test:e2e`).

**Pour reproduire** :
```bash
npm run db:seed:e2e    # Crée les données de test (dont INV-E2E-0001)
npm run test:e2e       # Exécute tous les tests (61 passants attendus)
# Ou validation ciblée :
node scripts/validate-payment-fix.js        # check + test payment uniquement
node scripts/validate-payment-fix.js --full # check + payment + toute la suite
```

---

## 10. Erreurs ECONNRESET dans les logs

Les messages `[WebServer] Error: aborted` / `ECONNRESET` apparaissent quand les navigateurs (Playwright) ferment des connexions. **C’est bénin** tant que tous les tests passent. Aucune action requise. Ne pas chercher à « augmenter les workers Next.js » pour les supprimer.

---

## 11. Améliorations possibles (optionnel)

- **CI** : pipeline (GitHub Actions, etc.) qui lance `test:e2e:ci` et publie le rapport Playwright. Utiliser **SQLite** comme en local (pas Postgres sans adapter). Voir section 14.
- **Maintenabilité** : POM ou helpers pour login, panier, commandes admin ; remplacer les `waitForTimeout` par des attentes sur des éléments (`expect(...).toBeVisible()`).
- **Selon besoin** : accessibilité (axe-core), responsive, cross-browser (Firefox/WebKit), tests sécurité ciblés.
- **Stabilité** : `npx playwright test --repeat-each=3` pour détecter des tests flaky.

### À éviter

- **Exécuter les workflows en série** pour « aller plus vite » : `test.describe.configure({ mode: 'serial' })` fait tourner les tests du fichier un par un, ce qui **réduit le parallélisme** avec les autres fichiers et **augmente** le temps total. À réserver aux cas où les tests partagent un état et doivent s’enchaîner dans l’ordre.
- **`waitUntil: 'networkidle'`** partout : cette option attend qu’il n’y ait plus de requêtes réseau pendant 500 ms, ce qui est **instable** (polling, WebSockets, requêtes lentes) et peut provoquer des timeouts aléatoires. Préférer des attentes ciblées : `expect(element).toBeVisible()` ou `expect(page).toHaveURL(...)`.

---

## 12. Confirmation de livraison (full-workflow-delivery)

Si le test ignore (skip) à la fin du flux livreur, c’est souvent parce que le **code de confirmation** récupéré par le test n’est pas le bon. Détail du flux et du code : **docs/E2E_DELIVERY_CONFIRMATION.md**.

---

## 13. Rapport après exécution

```bash
npx playwright show-report
```

Sert le rapport HTML (ex. http://localhost:9323) pour voir les traces, captures et vidéos des échecs.

**Métriques E2E** : tests totaux 61. Avec le seed E2E à jour (facture **INV-E2E-0001**), le test payment-workflow passe systématiquement ; objectif 61/61 passants, 0 skip. Voir section 9 (Workflow de paiement).

---

## 14. Intégration continue (CI)

Le projet utilise **SQLite** (fichier `dev.db` ou variable `DATABASE_URL`). En CI, utiliser la même base (fichier SQLite) ou une base dédiée sans modifier le schéma.

Le script **`npm run test:e2e:ci`** définit déjà `CI=1` et `E2E_SEED=1` ; en CI il suffit de définir `DATABASE_URL` pour la base de test.

**Variables d’environnement utiles en CI** : `CI=1`, `E2E_SEED=1`, `DATABASE_URL` (ex. `file:./test.db` ou `file::memory:` pour SQLite en mémoire – à valider avec `prisma db push`).

Exemple minimal (GitHub Actions) :

```yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: file:./test.db
      - run: npm run test:e2e:ci
        env:
          DATABASE_URL: file:./test.db
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`test:e2e:ci` fixe déjà `CI=1` et `E2E_SEED=1` dans le script npm ; inutile de les repasser en `env` sauf surcharge. Adapter `DATABASE_URL` si besoin (autre chemin, ou `file::memory:` pour SQLite en mémoire). Ne pas utiliser un service Postgres sans adapter le schéma et les migrations.

### Environnements (optionnel)

Pour cibler un autre environnement (ex. staging), définir **BASE_URL** (ou la variable utilisée par votre app) et **DATABASE_URL** avant de lancer les tests. Par défaut, la config utilise `baseURL: 'http://127.0.0.1:3000'` et le serveur est lancé par Playwright en local. Pour tester une URL externe, adapter `playwright.config.ts` (ex. `baseURL` depuis une variable d’environnement) et désactiver le `webServer` ou utiliser `reuseExistingServer: true`.

---

## Mise à jour de ce guide

Lorsque vous modifiez l’écosystème E2E, mettre à jour ce document en cohérence :

- **Nouveaux scripts** (package.json) : ajouter la commande et son usage dans la section 1 (Commandes) et dans le cheat sheet si elle est courante.
- **Changement de configuration** (playwright.config.ts) : adapter la section 5 (Configuration utile) et, si les projets ou testMatch changent, la section 3 (Structure des tests).
- **Nouveau template ou structure** : mettre à jour la section 7 (Ajouter un nouveau test), le fichier **tests/e2e/_template.spec.ts** et, le cas échéant, **scripts/check-e2e-setup.js** (chemins ou critères vérifiés). Si vous ajoutez d’autres fichiers ou dépendances critiques pour les tests E2E, les inclure dans le script de vérification pour que `npm run test:e2e:check` reste fiable.
- **CI** : si le pipeline E2E change, adapter la section 14 et l’exemple de workflow.

Après modification, relancer `npm run test:e2e:check` pour vérifier que le script de vérification reste vert.

**Checklist de validation finale** (pour vérifier que l’écosystème E2E est prêt) :

1. Guide accessible et à jour.
2. `npm run test:e2e:check` passe sans erreur.
3. `npm run test:e2e` (ou `test:e2e:fresh`) : tous les tests passent.
4. Template présent : `tests/e2e/_template.spec.ts` (non exécuté, nom avec `_`).
5. `playwright.config.ts` référence le guide (commentaire webServer).
6. Commandes npm listées dans la section 1 fonctionnelles.
7. Section 15 inclut la maintenance du script de vérification.
