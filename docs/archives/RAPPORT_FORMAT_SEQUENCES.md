# Rapport : Mise à jour du format des numéros de séquence

## Format validé

**Commandes** : `CMD-2025-0001`, `CMD-2025-0002`, …  
**Factures** : `FAC-2025-0001`, `FAC-2025-0002`, …  
**Bons de livraison** : `BL-2025-0001`, `BL-2025-0002`, …

**Règles :**
- Séquence unique par type et par année
- Reset uniquement au changement d'année (pas par jour)
- Format : `TYPE-YYYY-NNNN` (4 chiffres pour la séquence)

---

## Format actuel

**Commandes** : `CMD-YYYYMMDD-0001` (basé sur date complète)  
**Factures** : `INV-YYYYMMDD-0001` (basé sur date complète)  
**BL** : `BL-{orderNumber}` (basé sur le numéro de commande)

**Problèmes :**
- Format basé sur la date complète (YYYYMMDD) au lieu de l'année (YYYY)
- Préfixe facture : `INV-` au lieu de `FAC-`
- BL basé sur orderNumber au lieu d'avoir sa propre séquence

---

## Changements à effectuer

### 1. Modèle Prisma `DailySequence`

**Actuel :**
```prisma
model DailySequence {
  id         String   @id @default(cuid())
  date       String   @unique // Format: YYYYMMDD
  orderSeq   Int      @default(0)
  invoiceSeq Int      @default(0)
  updatedAt  DateTime @updatedAt
}
```

**Nouveau :**
```prisma
model DailySequence {
  id              String   @id @default(cuid())
  year            String   @unique // Format: YYYY
  orderSeq        Int      @default(0)
  invoiceSeq      Int      @default(0)
  deliveryNoteSeq Int      @default(0) // Nouveau : pour les BL
  updatedAt       DateTime @updatedAt
}
```

**Actions :**
- ✅ Créer migration Prisma
- ✅ Changer `date` en `year`
- ✅ Ajouter `deliveryNoteSeq`

### 2. Fonctions dans `app/lib/sequence.ts`

**Modifications :**

- **`formatDateKey` → `formatYearKey`** : Retourne `YYYY` au lieu de `YYYYMMDD`
- **`getNextOrderNumber`** : Format `CMD-YYYY-0001` au lieu de `CMD-YYYYMMDD-0001`
- **`getNextInvoiceNumber`** : Format `FAC-YYYY-0001` au lieu de `INV-YYYYMMDD-0001`
- **`getNextDeliveryNoteNumber`** : Nouvelle fonction pour `BL-YYYY-0001`

**Code à modifier :**
- Utiliser `year` au lieu de `dateKey`
- Utiliser `year` au lieu de `date` dans les upsert/update
- Changer préfixe `INV-` en `FAC-`
- Ajouter fonction `getNextDeliveryNoteNumber`

### 3. Utilisation dans le code

**Fichiers à mettre à jour :**

1. **`app/actions/order.ts`** :
   - Les fallbacks doivent utiliser le nouveau format (si nécessaire)
   - Pas de changement majeur, les fonctions sont déjà utilisées

2. **Pages delivery-note** :
   - `app/admin/orders/[id]/delivery-note/page.tsx`
   - `app/portal/orders/[id]/delivery-note/page.tsx`
   - `app/admin/invoices/[id]/print/page.tsx`
   - `app/portal/invoices/[id]/print/page.tsx`
   
   **Actuel :** `const blNumber = `BL-${orderNumber}``  
   **Nouveau :** Utiliser `getNextDeliveryNoteNumber(tx, date)` lors de la création du BL

**Note :** Pour les BL, il faut déterminer si on génère le numéro :
- À la création du BL (si stocké en DB)
- À l'affichage (si calculé à la volée)

Si les BL ne sont pas stockés en DB, on peut générer le numéro à l'affichage, mais il faut s'assurer qu'il soit stable (même BL = même numéro).

### 4. Migration de données

**Options :**
- **Option A** : Migration automatique (convertir les anciennes dates en années)
- **Option B** : Reset complet (perdre les anciennes séquences)
- **Option C** : Garder les deux systèmes en parallèle (complexe)

**Recommandation :** Option B (reset) pour la simplicité, car c'est un changement de format majeur.

---

## Plan d'implémentation

### Phase 1 : Schéma Prisma
1. Modifier `prisma/schema.prisma`
2. Créer migration : `npx prisma migrate dev --name update_sequence_format_to_year`
3. Vérifier la migration

### Phase 2 : Code
1. Modifier `app/lib/sequence.ts`
2. Tester les fonctions individuellement
3. Vérifier que les appels existants fonctionnent toujours

### Phase 3 : Pages delivery-note
1. Identifier où les BL sont générés/affichés
2. Implémenter `getNextDeliveryNoteNumber` si nécessaire
3. Mettre à jour les pages

### Phase 4 : Tests
1. Créer une commande → vérifier format `CMD-2025-0001`
2. Créer une facture → vérifier format `FAC-2025-0001`
3. Générer un BL → vérifier format `BL-2025-0001`
4. Vérifier que les séquences reset bien à chaque année

---

## Fichiers à modifier

1. ✅ `prisma/schema.prisma` - Modifier modèle DailySequence
2. ✅ `app/lib/sequence.ts` - Mettre à jour toutes les fonctions
3. ⚠️ `app/admin/orders/[id]/delivery-note/page.tsx` - Utiliser getNextDeliveryNoteNumber
4. ⚠️ `app/portal/orders/[id]/delivery-note/page.tsx` - Utiliser getNextDeliveryNoteNumber
5. ⚠️ `app/admin/invoices/[id]/print/page.tsx` - Vérifier format BL
6. ⚠️ `app/portal/invoices/[id]/print/page.tsx` - Vérifier format BL

---

## Notes importantes

- **Compatibilité ascendante** : Les anciens numéros (format YYYYMMDD) peuvent rester dans la DB, mais les nouveaux utilisent le format YYYY
- **Séquences BL** : Déterminer si on stocke le numéro BL dans la DB ou si on le calcule à l'affichage
- **Reset annuel** : Les séquences reset automatiquement quand on change d'année (nouvelle clé `year`)
- **Migration** : Les données existantes devront être migrées ou réinitialisées

---

## Statut

**En attente d'implémentation**
