# Correction du Matching des Livreurs - Utilisation de l'ID

## Problème Identifié

Le livreur ne voyait pas les commandes expédiées qui lui étaient assignées car la correspondance se faisait uniquement par nom (`deliveryAgentName`), ce qui pouvait créer des incohérences :
- Différences de casse
- Espaces supplémentaires
- Nom différent entre la session et la base de données

## Solution Implémentée

### 1. Ajout du champ `deliveryAgentId` dans le schéma

- ✅ Ajout de `deliveryAgentId String?` dans le modèle `Order`
- Permet de stocker l'ID du livreur (plus fiable que le nom)
- `deliveryAgentName` est conservé pour l'affichage et la compatibilité

### 2. Modification du modal d'expédition

- ✅ Le modal envoie maintenant l'ID du livreur en plus du nom
- Un champ caché `deliveryAgentId` est rempli automatiquement lors de la sélection

### 3. Amélioration de la logique de recherche

- ✅ Priorité à la correspondance par `deliveryAgentId` (100% fiable)
- ✅ Fallback sur `deliveryAgentName` pour la compatibilité avec les anciennes commandes

## Actions Requises

### 1. Appliquer les Changements de Schéma

```bash
# Générer le client Prisma avec le nouveau champ
npx prisma generate

# Appliquer les changements à la base de données
npx prisma db push
```

### 2. Migration des Commandes Existantes (Optionnel)

Si vous avez des commandes SHIPPED existantes sans `deliveryAgentId`, vous pouvez les mettre à jour :

```sql
-- Trouver les livreurs par nom et mettre à jour deliveryAgentId
-- (À adapter selon votre base de données)
UPDATE "Order" o
SET "deliveryAgentId" = (
  SELECT u.id 
  FROM "User" u 
  WHERE u.role = 'MAGASINIER' 
    AND (u.name = o."deliveryAgentName" OR u.email = o."deliveryAgentName")
  LIMIT 1
)
WHERE o.status = 'SHIPPED' 
  AND o."deliveryAgentId" IS NULL 
  AND o."deliveryAgentName" IS NOT NULL;
```

Ou via Prisma Studio :
- Ouvrir `npx prisma studio`
- Pour chaque commande SHIPPED, trouver le livreur correspondant et mettre à jour `deliveryAgentId`

## Comportement Attendu

### Avant (problématique)
- Correspondance uniquement par nom → pouvait échouer si le nom ne correspondait pas exactement

### Après (corrigé)
- **Priorité 1** : Correspondance par `deliveryAgentId` → 100% fiable
- **Priorité 2** : Correspondance par `deliveryAgentName` → pour les anciennes commandes

## Test

1. ✅ Créer une nouvelle commande
2. ✅ La préparer (statut PREPARED)
3. ✅ L'expédier en assignant un livreur
4. ✅ Vérifier que le livreur voit la commande dans son interface `/delivery`

## Diagnostic en Cas de Problème

Si le livreur ne voit toujours pas les commandes :

1. **Vérifier que le schéma a été appliqué** :
   ```bash
   npx prisma studio
   ```
   - Ouvrir la table `Order`
   - Vérifier qu'une commande SHIPPED a bien un champ `deliveryAgentId` rempli

2. **Vérifier les logs de la console** (en développement) :
   - Lors de l'expédition, vérifier les logs dans la console du navigateur
   - Vérifier les logs serveur pour voir si `deliveryAgentId` est bien stocké

3. **Vérifier le message de debug** :
   - Se connecter en tant que livreur
   - Aller sur `/delivery`
   - Si aucune commande, vérifier le message de debug qui affiche :
     - Votre ID de session
     - Toutes les commandes SHIPPED avec leur `deliveryAgentId` et `deliveryAgentName`
     - Les correspondances trouvées

4. **Vérifier manuellement dans la base de données** :
   ```sql
   SELECT id, orderNumber, status, deliveryAgentId, deliveryAgentName 
   FROM "Order" 
   WHERE status = 'SHIPPED';
   ```
   Comparer `deliveryAgentId` avec l'ID du livreur connecté.

## Notes

- Les nouvelles commandes expédiées auront automatiquement `deliveryAgentId` rempli
- Les anciennes commandes continueront de fonctionner grâce au fallback sur `deliveryAgentName`
- Le champ `deliveryAgentName` est conservé pour l'affichage et la compatibilité
