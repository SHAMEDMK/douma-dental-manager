# Rapport : Migration vers GlobalSequence

## Changement : DailySequence → GlobalSequence

### Ancien système (DailySequence)
- Clé : `date` (YYYYMMDD) - une entrée par jour
- Champs : `orderSeq`, `invoiceSeq`
- Format : `CMD-YYYYMMDD-0001`, `INV-YYYYMMDD-0001`
- Reset : chaque jour

### Nouveau système (GlobalSequence)
- Clé : `key` (TYPE-YYYY) - une entrée par type et par année
- Champs : `seq` (séquence unique)
- Format : `CMD-YYYY-0001`, `FAC-YYYY-0001`, `BL-YYYY-0001`
- Reset : chaque année (automatique via nouvelle clé)

---

## Modifications effectuées

### 1. Schéma Prisma (`prisma/schema.prisma`)

**Avant :**
```prisma
model DailySequence {
  id         String   @id @default(cuid())
  date       String   @unique // Format: YYYYMMDD
  orderSeq   Int      @default(0)
  invoiceSeq Int      @default(0)
  updatedAt  DateTime @updatedAt
}
```

**Après :**
```prisma
model GlobalSequence {
  id        String   @id @default(cuid())
  key       String   @unique // Format: ORDER-2025, INVOICE-2025, DELIVERY-2025
  seq       Int      @default(0)
  updatedAt DateTime @updatedAt
}
```

### 2. Fonctions (`app/lib/sequence.ts`)

#### `getNextOrderNumber`
- **Format** : `CMD-YYYY-0001` (au lieu de `CMD-YYYYMMDD-0001`)
- **Clé** : `ORDER-${year}`
- Utilise `GlobalSequence` avec clé `ORDER-2025`

#### `getNextInvoiceNumber`
- **Format** : `FAC-YYYY-0001` (au lieu de `INV-YYYYMMDD-0001`)
- **Préfixe** : `FAC-` (au lieu de `INV-`)
- **Clé** : `INVOICE-${year}`
- Utilise `GlobalSequence` avec clé `INVOICE-2025`

#### `getNextDeliveryNoteNumber` (nouveau)
- **Format** : `BL-YYYY-0001`
- **Clé** : `DELIVERY-${year}`
- Utilise `GlobalSequence` avec clé `DELIVERY-2025`

### 3. Actions serveur

#### `createOrderAction` (`app/actions/order.ts`)
- ✅ Utilise déjà `getNextOrderNumber(tx, now)`
- ✅ Fonctionne automatiquement avec le nouveau format
- ✅ Format généré : `CMD-2025-0001`

#### Création de facture (`app/actions/order.ts`)
- ✅ Utilise déjà `getNextInvoiceNumber(tx, now)`
- ✅ Fonctionne automatiquement avec le nouveau format
- ✅ Format généré : `FAC-2025-0001`

### 4. Seed (`prisma/seed.ts`)

**Statut** : ✅ Aucune modification nécessaire
- Le seed ne créait pas d'entrées DailySequence
- Les séquences sont créées automatiquement via `upsert` dans les fonctions
- Les compteurs s'initialisent à 0 automatiquement à la première utilisation

---

## Migration de la base de données

### Étape 1 : Créer la migration

```bash
npx prisma migrate dev --name replace_daily_sequence_with_global_sequence
```

**Actions de la migration :**
1. Créer le modèle `GlobalSequence`
2. Supprimer le modèle `DailySequence` (ou le garder pour référence temporaire)
3. Optionnel : Migrer les données existantes (voir ci-dessous)

### Étape 2 : Migration des données (optionnel)

Si vous voulez préserver les numéros existants, vous pouvez migrer les séquences :

```sql
-- Exemple pour migrer ORDER-2025
INSERT INTO GlobalSequence (id, key, seq, updatedAt)
SELECT 
  generate_random_uuid(),
  'ORDER-2025',
  MAX(orderSeq),
  NOW()
FROM DailySequence
WHERE date LIKE '2025%'
GROUP BY SUBSTR(date, 1, 4);

-- Exemple pour migrer INVOICE-2025
INSERT INTO GlobalSequence (id, key, seq, updatedAt)
SELECT 
  generate_random_uuid(),
  'INVOICE-2025',
  MAX(invoiceSeq),
  NOW()
FROM DailySequence
WHERE date LIKE '2025%'
GROUP BY SUBSTR(date, 1, 4);
```

**Note** : Pour SQLite, utiliser `hex(randomblob(16))` au lieu de `generate_random_uuid()`.

### Étape 3 : Générer le client Prisma

```bash
npx prisma generate
```

---

## Tests à effectuer

### 1. Test création de commande
- Créer une nouvelle commande
- ✅ Vérifier format : `CMD-2025-0001`
- ✅ Vérifier que la séquence s'incrémente : `CMD-2025-0002`, `CMD-2025-0003`

### 2. Test création de facture
- Créer une nouvelle facture (via création de commande)
- ✅ Vérifier format : `FAC-2025-0001`
- ✅ Vérifier préfixe : `FAC-` (pas `INV-`)
- ✅ Vérifier que la séquence s'incrémente : `FAC-2025-0002`, `FAC-2025-0003`

### 3. Test bon de livraison (futur)
- Quand `getNextDeliveryNoteNumber` sera utilisé
- ✅ Vérifier format : `BL-2025-0001`
- ✅ Vérifier que la séquence s'incrémente indépendamment

### 4. Test changement d'année
- Simuler une date en 2026
- ✅ Vérifier que les séquences reset : `CMD-2026-0001`, `FAC-2026-0001`
- ✅ Vérifier que les séquences 2025 restent intactes

### 5. Test transactions concurrentes
- Créer plusieurs commandes simultanément
- ✅ Vérifier qu'il n'y a pas de doublons
- ✅ Vérifier que les numéros sont séquentiels

---

## Fichiers modifiés

1. ✅ `prisma/schema.prisma` - Modèle `GlobalSequence`
2. ✅ `app/lib/sequence.ts` - Toutes les fonctions mises à jour
3. ⚠️ `prisma/seed.ts` - Aucune modification nécessaire (initialisation automatique)

---

## Fichiers à vérifier après migration

1. **`app/actions/order.ts`**
   - ✅ Utilise `getNextOrderNumber` et `getNextInvoiceNumber`
   - ✅ Fonctionne automatiquement avec le nouveau format

2. **Pages d'affichage** (si elles utilisent des formats hardcodés)
   - `app/admin/orders/page.tsx`
   - `app/portal/orders/page.tsx`
   - `app/admin/invoices/page.tsx`
   - `app/portal/invoices/[id]/page.tsx`

3. **Pages delivery-note** (pour futur usage de `getNextDeliveryNoteNumber`)
   - `app/admin/orders/[id]/delivery-note/page.tsx`
   - `app/portal/orders/[id]/delivery-note/page.tsx`

---

## Avantages du nouveau système

1. **Simplification** : Un seul champ `seq` au lieu de plusieurs (`orderSeq`, `invoiceSeq`)
2. **Extensibilité** : Facile d'ajouter de nouveaux types (DELIVERY, QUOTATION, etc.)
3. **Format standardisé** : `TYPE-YYYY-NNNN` pour tous les types
4. **Reset annuel** : Automatique via changement de clé (nouvelle année)
5. **Pas de duplication** : Une seule entrée par type/année au lieu d'une par jour

---

## Notes importantes

- **Compatibilité ascendante** : Les anciens numéros (format YYYYMMDD) restent dans la DB mais ne seront plus générés
- **Migration de données** : Optionnelle, dépend si vous voulez préserver les séquences existantes
- **Performance** : Meilleure performance (moins d'entrées dans la table)
- **Préfixe facture** : Changé de `INV-` à `FAC-` selon le format validé

---

## Statut

✅ **Code prêt** - En attente de migration de la base de données

### Prochaines étapes

1. ⚠️ Créer la migration Prisma
2. ⚠️ Exécuter la migration
3. ⚠️ Tester la création de commandes et factures
4. ⚠️ Vérifier les formats générés
5. ⚠️ Optionnel : Migrer les données existantes
