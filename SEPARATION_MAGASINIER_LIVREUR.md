# Séparation Magasinier / Livreur - Implémentation

## Changements Apportés

### 1. Schéma Prisma
- ✅ Ajout du champ `userType` dans le modèle `User`
- Type : `String?` (optionnel)
- Valeurs : `'MAGASINIER'` ou `'LIVREUR'`
- Permet de distinguer les sous-types du rôle `MAGASINIER`

### 2. Actions de Création
- ✅ `CreateMagasinierModal` : Crée avec `userType: 'MAGASINIER'`
- ✅ `CreateDeliveryAgentForm` : Crée avec `userType: 'LIVREUR'`
- ✅ `createAccountantAction` : `userType: null` (pas de sous-type)

### 3. Redirection après Login
- ✅ `userType === 'MAGASINIER'` → `/magasinier/dashboard`
- ✅ `userType === 'LIVREUR'` ou `null` → `/delivery`

### 4. Layouts et Protection
- ✅ `/magasinier/*` : Accessible uniquement si `userType === 'MAGASINIER'`
- ✅ `/delivery` : Accessible si `userType === 'LIVREUR'` ou `null` (backward compatibility)
- ✅ Redirections automatiques si mauvais type

### 5. Interface Utilisateurs
- ✅ Section "Magasiniers" : Affiche uniquement `userType === 'MAGASINIER'`
- ✅ Section "Livreurs" : Affiche uniquement `userType === 'LIVREUR'` ou `null`

## Actions Requises

### 1. Appliquer les Changements de Schéma

```bash
# Générer le client Prisma avec le nouveau champ
npx prisma generate

# Appliquer les changements à la base de données
npx prisma db push
```

### 2. Mettre à Jour les Utilisateurs Existants (Optionnel)

Si vous avez des utilisateurs MAGASINIER existants, vous pouvez les mettre à jour :

```sql
-- Mettre tous les MAGASINIER existants en LIVREUR (par défaut)
UPDATE "User" SET "userType" = 'LIVREUR' WHERE "role" = 'MAGASINIER' AND "userType" IS NULL;
```

Ou via Prisma Studio :
- Ouvrir `npx prisma studio`
- Pour chaque utilisateur MAGASINIER, définir `userType` :
  - `'MAGASINIER'` pour les magasiniers (préparation)
  - `'LIVREUR'` pour les livreurs (livraison)

## Interfaces Distinctes

### Interface Magasinier (`/magasinier/*`)
- **Dashboard** : Stats commandes à préparer, stock bas
- **Commandes** : Liste des commandes CONFIRMED/PREPARED
- **Stock** : Gestion et ajustement du stock
- **Mouvements** : Historique des mouvements de stock

### Interface Livreur (`/delivery`)
- **Commandes à livrer** : Liste des commandes SHIPPED assignées
- **Confirmation** : Formulaire de confirmation de livraison avec code
- **Informations client** : Nom, adresse, téléphone

## Distinction Logique

| Aspect | Magasinier | Livreur |
|--------|------------|---------|
| **Rôle DB** | `MAGASINIER` | `MAGASINIER` |
| **userType** | `'MAGASINIER'` | `'LIVREUR'` |
| **Interface** | `/magasinier/*` | `/delivery` |
| **Commandes** | CONFIRMED → PREPARED | SHIPPED → DELIVERED |
| **Stock** | ✅ Gestion complète | ❌ Pas d'accès |
| **Livraison** | ❌ Pas d'accès | ✅ Confirmation uniquement |

## Backward Compatibility

- Les utilisateurs existants avec `userType = null` sont traités comme **LIVREUR** par défaut
- Ils sont redirigés vers `/delivery` (interface livreur)
- Pour les convertir en magasinier, mettre à jour `userType = 'MAGASINIER'`

## Prochaines Étapes

1. ✅ Exécuter `npx prisma generate`
2. ✅ Exécuter `npx prisma db push`
3. ✅ Tester la création d'un magasinier → doit aller sur `/magasinier/dashboard`
4. ✅ Tester la création d'un livreur → doit aller sur `/delivery`
5. ✅ Vérifier les redirections automatiques
