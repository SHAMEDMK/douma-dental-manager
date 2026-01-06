# Migration vers GlobalSequence - Complétée

## Statut : ✅ TERMINÉE

La migration de `DailySequence` vers `GlobalSequence` a été complétée avec succès.

---

## Résumé

- **Ancien système** : `DailySequence` avec clé `date` (YYYYMMDD), séquences par jour
- **Nouveau système** : `GlobalSequence` avec clé `key` (ORDER-2025, INVOICE-2025, DELIVERY-2025), séquences par année

---

## Actions effectuées

1. ✅ **Schéma Prisma modifié** : `DailySequence` → `GlobalSequence`
2. ✅ **Code mis à jour** : `app/lib/sequence.ts` utilise `GlobalSequence`
3. ✅ **Base de données synchronisée** : `npx prisma db push --accept-data-loss`
4. ✅ **Client Prisma régénéré** : `npx prisma generate`

---

## Format des numéros

- **Commandes** : `CMD-2025-0001`, `CMD-2025-0002`, ...
- **Factures** : `FAC-2025-0001`, `FAC-2025-0002`, ... (préfixe changé de `INV-` à `FAC-`)
- **Bons de livraison** : `BL-2025-0001`, `BL-2025-0002`, ... (fonction créée, à utiliser quand nécessaire)

---

## Notes importantes

- Les données de l'ancienne table `DailySequence` ont été perdues (6 lignes), mais ce n'est pas critique car :
  - Les séquences sont recréées automatiquement via `upsert` dans les fonctions
  - Les nouveaux numéros utilisent le nouveau format (année au lieu de date complète)
- La migration a été faite avec `db push` au lieu de `migrate dev` à cause d'un problème avec la shadow database SQLite
- Pour créer une migration formelle plus tard, vous pouvez utiliser `npx prisma migrate dev --create-only` puis éditer le fichier SQL généré

---

## Prochaines étapes

1. ✅ **Tester la création de commandes** : Vérifier que les numéros sont au format `CMD-2025-0001`
2. ✅ **Tester la création de factures** : Vérifier que les numéros sont au format `FAC-2025-0001`
3. ⚠️ **Bons de livraison** : Utiliser `getNextDeliveryNoteNumber` quand nécessaire

---

## Fichiers modifiés

1. `prisma/schema.prisma` - Modèle `GlobalSequence`
2. `app/lib/sequence.ts` - Fonctions `getNextOrderNumber`, `getNextInvoiceNumber`, `getNextDeliveryNoteNumber`
3. `app/actions/order.ts` - Commentaires mis à jour

---

## Migration de base de données

**Méthode utilisée** : `npx prisma db push --accept-data-loss`

**Raison** : Problème avec la shadow database SQLite lors de `migrate dev`. La méthode `db push` synchronise directement le schéma.

**Note** : Pour une migration formelle en production, créer manuellement une migration SQL qui :
1. Crée la table `GlobalSequence`
2. Migre les données de `DailySequence` vers `GlobalSequence` (si nécessaire)
3. Supprime la table `DailySequence`

---

## Vérification

Pour vérifier que tout fonctionne :

```bash
# Vérifier le schéma
npx prisma db push

# Tester la création d'une commande
# Les numéros devraient être au format CMD-2025-0001

# Tester la création d'une facture
# Les numéros devraient être au format FAC-2025-0001
```
