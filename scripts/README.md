# Scripts de Migration et Maintenance

## Migration des deliveryAgentId

### Problème
Les commandes expédiées avant l'ajout du champ `deliveryAgentId` ont ce champ à `null`. Cela empêche les livreurs de voir leurs commandes assignées si le matching se fait uniquement par ID.

### Solution
Le script `migrate-delivery-agent-ids.ts` met à jour automatiquement les `deliveryAgentId` manquants en utilisant le `deliveryAgentName` pour trouver l'utilisateur correspondant.

### Utilisation

```bash
npm run db:migrate:delivery-agents
```

Ou directement avec tsx:

```bash
npx tsx scripts/migrate-delivery-agent-ids.ts
```

### Ce que fait le script

1. Trouve toutes les commandes SHIPPED avec `deliveryAgentId = null` mais avec un `deliveryAgentName`
2. Pour chaque commande, cherche l'utilisateur correspondant dans la base de données:
   - Cherche parmi les utilisateurs avec `role = 'MAGASINIER'`
   - Filtre pour ne prendre que les livreurs (`userType = 'LIVREUR'` ou `null`)
   - Essaie plusieurs variations de casse du nom (exact, uppercase, lowercase, capitalized)
   - Si pas trouvé, essaie une recherche plus large (sans filtre userType)
3. Met à jour `deliveryAgentId` avec l'ID de l'utilisateur trouvé
4. Affiche un résumé des résultats

### Exemple de sortie

```
🔍 Recherche des commandes SHIPPED avec deliveryAgentId manquant...

📦 Trouvé 16 commande(s) à corriger

✅ Commande CMD-20260125-0072: Trouvé "Ali bob" (ali@example.com) - ID: cmklp9kk300009yigdqs641wx
✅ Commande CMD-20260125-0071: Trouvé "Ali bob" (ali@example.com) - ID: cmklp9kk300009yigdqs641wx
...
❌ Commande CMD-20260122-0011: Aucun utilisateur trouvé pour "ALI BOB"

📊 Résumé de la migration:
   ✅ 15 commande(s) corrigée(s)
   ⚠️  1 commande(s) non trouvée(s)
   ❌ 0 erreur(s)
```

### Notes importantes

- Le script est **idempotent**: vous pouvez l'exécuter plusieurs fois sans problème
- Les commandes non trouvées peuvent être dues à:
  - Un nom de livreur qui ne correspond à aucun utilisateur dans la base
  - Un utilisateur qui n'existe plus
  - Un nom mal orthographié
- Pour les commandes non trouvées, vous devrez les corriger manuellement ou créer l'utilisateur manquant

## Correction des types d'utilisateurs mal classés

### Problème
Les utilisateurs créés avant l'ajout du champ `userType` ont `userType = null`. Cela peut causer des problèmes d'affichage dans l'interface admin où ils apparaissent comme "livreurs" alors qu'ils devraient être des "magasiniers".

### Solution
Le script `fix-misclassified-users.ts` permet de corriger automatiquement tous les utilisateurs avec `userType = null`.

### Utilisation

**Corriger en Magasinier (par défaut) :**
```bash
npm run db:fix:user-types
```

**Corriger en Livreur :**
```bash
npm run db:fix:user-types:livreur
```

**Ou directement avec tsx :**
```bash
npx tsx scripts/fix-misclassified-users.ts --target=MAGASINIER
npx tsx scripts/fix-misclassified-users.ts --target=LIVREUR
```

### Ce que fait le script

1. Trouve tous les utilisateurs avec `role = 'MAGASINIER'` et `userType = null`
2. Affiche la liste des utilisateurs à corriger
3. Met à jour leur `userType` selon le type cible spécifié
4. Affiche un résumé des corrections

### Exemple de sortie

```
🔍 Recherche des utilisateurs MAGASINIER avec userType=null...

📦 Trouvé 2 utilisateur(s) à corriger

Utilisateurs à corriger :
  1. Magasinier Test (magasinier@test.com) - Créé le 23/01/2026
  2. Autre Magasinier (autre@test.com) - Créé le 22/01/2026

🎯 Type cible : Magasinier (warehouse)

✅ Magasinier Test (magasinier@test.com) → MAGASINIER
✅ Autre Magasinier (autre@test.com) → MAGASINIER

📊 Résumé de la correction:
   ✅ 2 utilisateur(s) corrigé(s)
   ❌ 0 erreur(s)

✅ Correction terminée.
```

### Notes importantes

- ⚠️ Le script est **idempotent** : vous pouvez l'exécuter plusieurs fois sans problème
- ⚠️ Par défaut, corrige en `MAGASINIER` (warehouse)
- ⚠️ Utilisez `--target=LIVREUR` si vous voulez corriger en livreur (delivery)
- ⚠️ Le script ne modifie que les utilisateurs avec `userType = null`
