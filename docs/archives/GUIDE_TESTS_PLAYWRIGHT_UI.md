# Guide : Utiliser Playwright UI pour les tests E2E

## 🎯 Vue d'ensemble

L'interface Playwright UI est un outil visuel qui permet de :
- Voir tous vos tests
- Les exécuter un par un ou tous ensemble
- Voir les résultats en temps réel
- Déboguer facilement avec des captures d'écran et des vidéos

## 📋 Étape 1 : Comprendre l'interface

Quand vous ouvrez Playwright UI (`npx playwright test --ui`), vous voyez :

```
┌─────────────────────────────────────────┐
│  Playwright Test Runner                  │
├─────────────────────────────────────────┤
│                                          │
│  📁 tests/e2e/                          │
│    📄 smoke.spec.ts                     │
│    📄 workflow.order-to-prepared.spec.ts │
│                                          │
│  [▶️ Run all]  [▶️ Run]  [🔍 Watch]     │
└─────────────────────────────────────────┘
```

## 🧪 Étape 2 : Exécuter smoke.spec.ts

### Ce que fait `smoke.spec.ts` :

1. **Se connecter en tant que client**
   - Va sur `/login`
   - Remplit l'email : `client@dental.com`
   - Remplit le mot de passe : `Douma@2025!123` (ou depuis `ADMIN_PASSWORD`)
   - Clique sur "Se connecter"

2. **Accéder au portail client**
   - Va sur `/portal`
   - Vérifie que l'URL contient `/portal`

### Comment l'exécuter :

1. **Dans l'interface Playwright UI :**
   - Cliquez sur `smoke.spec.ts` dans la liste à gauche
   - Vous verrez le test : `"Smoke: login client -> portal accessible"`
   - Cliquez sur le bouton **▶️ Run** (ou le bouton play à côté du test)

2. **Ce qui va se passer :**
   - Un navigateur Chromium va s'ouvrir automatiquement
   - Le test va exécuter les actions (login, navigation)
   - Vous verrez les actions en temps réel dans le navigateur

3. **Résultat attendu :**
   - ✅ **Succès (vert)** : Le test passe, tout fonctionne
   - ❌ **Échec (rouge)** : Le test échoue, il y a un problème

## 🔍 Étape 3 : Comprendre les résultats

### Si le test passe (✅) :

Vous verrez :
```
✓ Smoke: login client -> portal accessible (2.5s)
```

**Cela signifie :**
- Le login fonctionne
- La redirection vers `/portal` fonctionne
- Le portail client est accessible

### Si le test échoue (❌) :

Vous verrez quelque chose comme :
```
✗ Smoke: login client -> portal accessible (1.2s)
  Error: expect(page).toHaveURL(/\/portal/)
  Expected: /\/portal/
  Received: /login
```

**Cela signifie :**
- Le login a probablement échoué
- La redirection n'a pas eu lieu
- Il faut vérifier les identifiants ou le code de login

## 🐛 Étape 4 : Déboguer un test qui échoue

### Option 1 : Voir la trace (recommandé)

1. Cliquez sur le test qui a échoué
2. Cliquez sur l'onglet **"Trace"** ou **"Time Travel"**
3. Vous verrez une timeline avec toutes les actions
4. Cliquez sur chaque étape pour voir l'état de la page à ce moment

### Option 2 : Voir la vidéo

1. Cliquez sur le test qui a échoué
2. Cliquez sur l'onglet **"Video"**
3. Regardez la vidéo de l'exécution du test

### Option 3 : Voir les captures d'écran

1. Cliquez sur le test qui a échoué
2. Regardez les captures d'écran à chaque étape
3. Identifiez où le problème se produit

## 🎬 Étape 5 : Exécuter le workflow complet

Une fois que `smoke.spec.ts` passe, vous pouvez exécuter `workflow.order-to-prepared.spec.ts` :

### Ce que fait ce test :

1. **Client : Créer une commande**
   - Se connecte en tant que client
   - Va sur le catalogue (`/portal`)
   - Ajoute un produit au panier
   - Va au panier (`/portal/cart`)
   - Valide la commande

2. **Admin : Préparer la commande**
   - Se connecte en tant qu'admin
   - Va sur la page des commandes (`/admin/orders`)
   - Ouvre la première commande
   - Clique sur "Préparer"
   - Vérifie que le statut devient "Préparée"
   - Vérifie que le numéro BL (Bon de Livraison) existe

### Comment l'exécuter :

1. Cliquez sur `workflow.order-to-prepared.spec.ts` dans la liste
2. Cliquez sur **▶️ Run**
3. Observez l'exécution dans le navigateur

## 💡 Conseils pratiques

### 1. Mode Watch (surveillance)

- Cliquez sur **🔍 Watch** pour activer le mode surveillance
- Les tests se relancent automatiquement quand vous modifiez le code

### 2. Exécuter tous les tests

- Cliquez sur **▶️ Run all** pour exécuter tous les tests d'un coup

### 3. Filtrer les tests

- Utilisez la barre de recherche pour filtrer les tests par nom

### 4. Voir les logs

- Dans l'onglet **"Logs"**, vous verrez tous les messages de console
- Utile pour déboguer les problèmes

## ⚠️ Problèmes courants

### Problème 1 : "Test timeout"

**Cause :** Le serveur n'est pas démarré ou est trop lent

**Solution :**
- Vérifiez que `npm run dev` tourne sur `http://localhost:3000`
- Le `playwright.config.ts` devrait démarrer automatiquement le serveur

### Problème 2 : "Element not found"

**Cause :** Un élément (bouton, champ) n'existe pas ou a changé

**Solution :**
- Vérifiez que les `data-testid` sont bien présents
- Regardez la trace pour voir où le test s'arrête

### Problème 3 : "Login failed"

**Cause :** Les identifiants sont incorrects

**Solution :**
- Vérifiez que `ADMIN_PASSWORD` est défini dans `.env`
- Ou utilisez le mot de passe par défaut : `Douma@2025!123`
- Vérifiez que les utilisateurs existent : `npm run db:seed`

## 📝 Checklist avant de lancer les tests

- [ ] Le serveur dev est démarré (`npm run dev`) OU `playwright.config.ts` a `webServer` configuré
- [ ] La base de données est seedée (`npm run db:seed`)
- [ ] Les `data-testid` sont présents dans le code
- [ ] Le fichier `.env` contient `ADMIN_PASSWORD` (ou vous utilisez le fallback)

## 🚀 Prochaines étapes

Une fois que `smoke.spec.ts` passe :
1. Exécutez `workflow.order-to-prepared.spec.ts`
2. Si un test échoue, utilisez la trace pour comprendre pourquoi
3. Partagez-moi les erreurs si vous avez besoin d'aide !
