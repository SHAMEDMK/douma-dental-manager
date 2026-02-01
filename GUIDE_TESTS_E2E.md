# Guide de Démarrage des Tests E2E (Playwright)

## 🎯 Objectif

Valider les workflows critiques :
- ✅ Login (admin + client)
- ✅ Panier → Commande client
- ✅ Crédit client bloquant
- ✅ Workflow admin (CONFIRMED → PREPARED → SHIPPED → DELIVERED)
- ✅ Génération PDF (Facture + BL)

---

## 🚀 ÉTAPE A — Vérifier l'installation

Dans PowerShell :

```powershell
cd C:\dev\trae_projects\tactac
npm list @playwright/test
```

✅ **Résultat attendu** : `@playwright/test@...` (n'importe quelle version récente)

➡️ **Important** : L'important est que `@playwright/test` soit installé, pas le numéro exact de version.

---

## 🚀 ÉTAPE B — Installer les navigateurs (une fois)

```powershell
npx playwright install
```

Cela installera Chromium, Firefox et WebKit. Cela peut prendre quelques minutes.

---

## 🚀 ÉTAPE C — Seed DB (pour avoir admin + client)

```powershell
npm run db:seed
```

✅ **Résultat attendu** : Messages `✓ Created admin user`, `✓ Created demo client`, etc.

---

## 🚀 ÉTAPE D — Lancer les tests

### Option 1 : Mode UI (recommandé pour debug)

**PowerShell #1** (optionnel - si tu veux contrôler le serveur toi-même) :

```powershell
npm run dev
```

**PowerShell #2** :

```powershell
cd C:\dev\trae_projects\tactac
npx playwright test --ui
```

➡️ **Note importante** : 
- Si tu as `webServer` dans `playwright.config.ts` (ce qui est le cas), Playwright démarre le serveur automatiquement ✅
- Pour le mode UI, c'est souvent plus confortable de lancer `npm run dev` toi-même pour avoir plus de contrôle

### Option 2 : Mode normal (headless)

```powershell
npx playwright test
```

➡️ **Note** : Pas besoin de `$env:ADMIN_PASSWORD` si ton `.env` contient déjà `ADMIN_PASSWORD="Douma@2025!123"`. Playwright lit automatiquement le `.env`.

➡️ **Si tu veux tester avec un autre mot de passe** sans modifier `.env` :

```powershell
$env:ADMIN_PASSWORD="AutreMotDePasse"
npx playwright test
```

---

## 📋 Tests Disponibles

### Tests de base

1. **`smoke.spec.ts`** — Test de fumée
   - Login client → Vérifier accès au portal

2. **`workflow.order-to-prepared.spec.ts`** — Workflow complet
   - Client crée commande → Admin prépare → BL généré

### Tests existants (à vérifier/compléter)

3. **`auth.spec.ts`** — Tests d'authentification
4. **`credit-limit.spec.ts`** — Tests de plafond de crédit
5. **`order-workflow.spec.ts`** — Workflow de commande
6. **`admin-approval.spec.ts`** — Tests d'approbation admin
7. **`invoice-lock.spec.ts`** — Tests de verrouillage facture
8. **`pdf-generation.spec.ts`** — Tests de génération PDF
9. **`workflow-complet.spec.ts`** — Workflow complet end-to-end

---

## 🧪 Lancer un test spécifique

```powershell
npx playwright test smoke --ui
npx playwright test workflow.order-to-prepared --ui
```

---

## 🔍 ÉTAPE 3 — Vérifier les résultats

### Après les tests

Les rapports HTML sont générés dans :

```
playwright-report/index.html
```

Pour voir le rapport :

```powershell
npx playwright show-report
```

### Si un test échoue

1. **Dans le mode UI** : Clique sur le test échoué pour voir :
   - Les captures d'écran automatiques
   - Les étapes détaillées
   - Les messages d'erreur

2. **Vérifier les sélecteurs** :
   - Les tests utilisent des `data-testid` pour les éléments importants (recommandation PRO)
   - Les sélecteurs par texte peuvent nécessiter des ajustements si l'UI change

---

## 🛠️ Debugging

### Mode debug pas à pas

```powershell
npx playwright test --debug
```

### Générer un trace

Le trace est automatiquement généré si un test échoue. Pour voir le trace :

```powershell
npx playwright show-trace trace.zip
```

### Screenshots automatiques

Les screenshots sont sauvegardés dans `test-results/` en cas d'échec.

---

## ✅ Checklist avant de lancer les tests

- [ ] Playwright installé (`npm list @playwright/test`)
- [ ] Navigateurs installés (`npx playwright install`)
- [ ] `.env` contient `ADMIN_PASSWORD="Douma@2025!123"`
- [ ] Base de données seedée (`npm run db:seed`)
- [ ] (Optionnel) Serveur dev démarré (`npm run dev` dans une fenêtre)

---

## 📝 Notes importantes

1. **Le serveur dev** : Playwright démarre automatiquement le serveur s'il n'est pas déjà lancé (grâce à `webServer` dans `playwright.config.ts`). Pour le mode UI, tu peux aussi le lancer toi-même pour plus de contrôle.

2. **Variable d'environnement** : Si ton `.env` contient `ADMIN_PASSWORD`, tu n'as pas besoin de le setter dans PowerShell. Utilise `$env:ADMIN_PASSWORD="..."` seulement si tu veux tester avec un autre mot de passe sans modifier `.env`.

3. **Base de données** : Les tests utilisent la même base que le serveur dev. Si tu veux une base propre, lance `npm run db:reset` puis `npm run db:seed` avant les tests.

4. **Sélecteurs** : Les tests utilisent des `data-testid` pour les éléments importants (login, ajouter panier, valider commande, préparer, expédier, livrer). Cela rend les tests plus stables.

---

## 🎯 Prochaines étapes

Une fois les tests de base passants :

1. ✅ Compléter les tests existants (`credit-limit`, `pdf-generation`, etc.)
2. ✅ Ajouter des tests pour les cas limites
3. ✅ Intégrer dans CI/CD si nécessaire

---

## 🔧 Data-testid disponibles

Les éléments suivants ont des `data-testid` pour des tests stables :

- `data-testid="login-submit"` - Bouton de connexion
- `data-testid="add-to-cart"` - Bouton ajouter au panier
- `data-testid="validate-order"` - Bouton valider la commande
- `data-testid="order-action-prepared"` - Bouton préparer
- `data-testid="order-action-shipped"` - Bouton expédier
- `data-testid="order-action-delivered"` - Bouton livrer
- `data-testid="confirm-ship-order"` - Bouton confirmer expédition (modal)
- `data-testid="confirm-deliver-order"` - Bouton confirmer livraison (modal)

Utilise ces `data-testid` dans tes tests pour plus de stabilité :

```typescript
await page.getByTestId('login-submit').click()
await page.getByTestId('add-to-cart').first().click()
await page.getByTestId('validate-order').click()
await page.getByTestId('order-action-prepared').click()
await page.getByTestId('order-action-shipped').click()
await page.getByTestId('confirm-ship-order').click()
```

➡️ **Recommandation PRO** : Utilise `getByTestId()` au lieu de `getByText()` ou `getByRole()` avec des textes variables pour rendre tes tests plus robustes face aux changements d'UI.
