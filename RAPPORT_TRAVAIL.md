# 📋 Rapport de Travail - Système de Gestion de Commandes

## 🎯 Vue d'ensemble

Ce document résume toutes les fonctionnalités implémentées pour le système de gestion de commandes avec tarification par segment, remises clients, calcul de marge et modification de commandes.

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### 1. 📊 TARIFICATION PAR SEGMENT CLIENT (C1-1)

#### **Modèle de données Prisma**

**Modèle `User` :**
- ✅ Champ `segment` (String, default: "LABO") - LABO, DENTISTE, REVENDEUR
- ✅ Champ `discountRate` (Float?) - Remise client en pourcentage (ex: 5 = -5%)

**Modèle `Product` :**
- ✅ Champ `cost` (Float, default: 0) - Coût d'achat du produit
- ✅ Champs legacy `priceLabo`, `priceDentiste`, `priceRevendeur` (maintenus pour compatibilité)

**Nouveau modèle `ProductPrice` :**
```prisma
model ProductPrice {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  segment   String   // LABO, DENTISTE, REVENDEUR
  price     Float
  createdAt DateTime @default(now())
  @@unique([productId, segment])
}
```

**Modèle `OrderItem` :**
- ✅ Champ `priceAtTime` (Float) - Prix unitaire au moment de la commande (après remise)
- ✅ Champ `costAtTime` (Float, default: 0) - Coût unitaire au moment de la commande

#### **Fichiers créés/modifiés :**

1. **`prisma/schema.prisma`**
   - Ajout du modèle `ProductPrice`
   - Ajout des champs `segment`, `discountRate` à `User`
   - Ajout du champ `cost` à `Product`
   - Ajout du champ `costAtTime` à `OrderItem`

2. **`prisma/migrations/20251229210749_add_product_prices/migration.sql`**
   - Migration pour créer la table `ProductPrice`

3. **`prisma/migrations/20251229212000_add_discounts_and_costs/migration.sql`**
   - Migration pour ajouter `discountRate` à `User`
   - Migration pour ajouter `cost` à `Product`
   - Migration pour ajouter `costAtTime` à `OrderItem`

4. **`app/lib/pricing.ts`**
   - Fonction `getPriceForSegment(product, segment)` :
     - Priorité au modèle `ProductPrice`
     - Fallback vers les champs legacy (`priceLabo`, `priceDentiste`, `priceRevendeur`)
     - Fallback final vers `product.price`

5. **`prisma/seed.ts`**
   - Création de prix segment par défaut pour les produits :
     - LABO: prix de base
     - DENTISTE: prix de base + 10%
     - REVENDEUR: prix de base - 10%
   - Seed idempotent (utilise `upsert`)

6. **`app/portal/page.tsx`**
   - Requête Prisma inclut `segmentPrices` pour les produits
   - Affichage du prix selon le segment de l'utilisateur connecté

7. **`app/admin/products/[id]/EditProductForm.tsx`**
   - Section pour éditer les 3 prix segment (LABO, DENTISTE, REVENDEUR)
   - Validation : prix >= 0

8. **`app/admin/products/new/CreateProductForm.tsx`**
   - Champ pour le coût d'achat du produit

---

### 2. 💰 REMISES CLIENTS ET CALCUL DE MARGE (C1-2)

#### **Fonctionnalités implémentées :**

**Remise client :**
- ✅ Champ `discountRate` dans le modèle `User`
- ✅ Application automatique lors de la création de commande
- ✅ Calcul : `prixFinal = prixSegment * (1 - discountRate/100)`
- ✅ Snapshot du prix final dans `OrderItem.priceAtTime`

**Coût produit :**
- ✅ Champ `cost` dans le modèle `Product`
- ✅ Snapshot du coût dans `OrderItem.costAtTime` au moment de la commande

**Calcul de marge :**
- ✅ Marge = `(priceAtTime - costAtTime) * quantity`
- ✅ Marge % = `(marge / prixVente) * 100`
- ✅ Affichage dans `/admin/orders/[id]` et `/admin/invoices/[id]`
- ✅ Affichage "-" si `costAtTime = 0`

#### **Fichiers créés/modifiés :**

1. **`app/actions/order.ts`**
   - `createOrderAction` :
     - Récupère `segment` et `discountRate` de l'utilisateur
     - Calcule le prix segment avec `getPriceForSegment`
     - Applique la remise si `discountRate > 0`
     - Stocke `priceAtTime` (prix final) et `costAtTime` (coût produit)

2. **`app/admin/clients/invite/page.tsx`**
   - Champ "Remise client (%)" lors de l'invitation

3. **`app/actions/invitation.ts`**
   - Gestion du champ `discountRate` lors de la création d'utilisateur

4. **`app/admin/products/[id]/EditProductForm.tsx`**
   - Champ "Coût d'achat (€)" pour éditer le coût

5. **`app/admin/products/new/CreateProductForm.tsx`**
   - Champ "Coût d'achat (€)" lors de la création

6. **`app/actions/product.ts`**
   - `createProductAction` et `updateProductAction` gèrent le champ `cost`
   - Gestion des erreurs `NEXT_REDIRECT` pour les redirections

7. **`app/admin/orders/[id]/page.tsx`**
   - Colonnes "Marge" et "Marge %" dans le tableau des articles
   - Calcul et affichage de la marge par ligne

8. **`app/admin/invoices/[id]/page.tsx`**
   - Colonnes "Marge" et "Marge %" dans le tableau des articles
   - Calcul et affichage de la marge par ligne

---

### 3. 🔄 MODIFICATION DE COMMANDES EN ATTENTE

#### **Fonctionnalités implémentées :**

**Bouton unique "Modifier la commande" :**
- ✅ Un seul bouton au niveau de la commande (pas par ligne)
- ✅ Active le mode édition pour toutes les lignes simultanément
- ✅ Visible uniquement si la commande est modifiable (CONFIRMED ou PREPARED, non payée)

**Mode édition :**
- ✅ Toutes les lignes deviennent modifiables
- ✅ Contrôles de quantité (boutons +/- et input) pour chaque ligne
- ✅ Indicateur visuel des changements (+X ou -X)
- ✅ Boutons "Valider les modifications" et "Annuler" au niveau de la commande

**Validation globale :**
- ✅ Validation de toutes les modifications en une seule transaction
- ✅ Recalcul automatique du total de la commande
- ✅ Recalcul automatique du total de la facture
- ✅ Gestion des mouvements de stock (ajout/retrait selon les changements)

**Annulation :**
- ✅ Bouton "Annuler" pour annuler toutes les modifications
- ✅ Restauration des quantités d'origine

**Restrictions :**
- ✅ Modifications possibles uniquement si :
  - Statut = CONFIRMED ou PREPARED
  - Facture non payée
- ✅ Message informatif si la commande n'est plus modifiable : "Pour modifier cette commande, veuillez contacter le vendeur"

**Bouton "Annuler modification" (ligne individuelle) :**
- ✅ Permet de revenir à la quantité d'origine pour une ligne spécifique
- ✅ Visible uniquement si la ligne a été modifiée précédemment

#### **Fichiers créés/modifiés :**

1. **`app/actions/order.ts`**
   - `updateOrderItemAction` : Modifie une ligne de commande individuelle
   - `updateOrderItemsAction` : Modifie plusieurs lignes en une transaction
     - Validation de toutes les quantités
     - Gestion des stocks (ajout/retrait)
     - Recalcul du total de la commande
     - Recalcul du total de la facture
     - Gestion des mouvements de stock

2. **`app/portal/orders/OrderCard.tsx`** (NOUVEAU)
   - Composant client qui gère l'état d'édition global
   - Gère les quantités en mode édition
   - Passe les props à `OrderItemCard` et `OrderEditMode`

3. **`app/portal/orders/OrderEditMode.tsx`** (NOUVEAU)
   - Bouton "Modifier la commande"
   - Boutons "Valider les modifications" et "Annuler"
   - Validation globale des modifications
   - Message informatif si non modifiable

4. **`app/portal/orders/OrderItemCard.tsx`**
   - Affiche les contrôles de quantité uniquement en mode édition global
   - Suppression des boutons individuels "Modifier" par ligne
   - Conservation du bouton "Annuler modification" pour revenir à la quantité d'origine
   - Gestion du mode édition via props `isEditMode`, `editQuantity`, `onQuantityChange`

5. **`app/portal/orders/page.tsx`**
   - Utilise le nouveau composant `OrderCard` pour chaque commande

6. **`app/portal/orders/ReorderAllButton.tsx`**
   - Redirige vers le catalogue (`/portal`) au lieu d'ajouter au panier
   - Permet de créer une nouvelle commande depuis le catalogue

---

## 📁 STRUCTURE DES FICHIERS

### **Actions serveur :**
- `app/actions/order.ts` - Création, modification, annulation de commandes
- `app/actions/product.ts` - Création et modification de produits (avec coût)
- `app/actions/invitation.ts` - Invitation de clients (avec remise)

### **Composants client :**
- `app/portal/orders/OrderCard.tsx` - Wrapper pour gérer l'état d'édition
- `app/portal/orders/OrderEditMode.tsx` - Boutons de modification globale
- `app/portal/orders/OrderItemCard.tsx` - Affichage et édition d'une ligne
- `app/portal/orders/ReorderAllButton.tsx` - Bouton "Nouvelle commande"

### **Pages :**
- `app/portal/page.tsx` - Catalogue avec prix segment
- `app/portal/orders/page.tsx` - Liste des commandes
- `app/admin/products/[id]/page.tsx` - Édition produit (prix segment + coût)
- `app/admin/orders/[id]/page.tsx` - Détail commande (avec marge)
- `app/admin/invoices/[id]/page.tsx` - Détail facture (avec marge)
- `app/admin/clients/invite/page.tsx` - Invitation client (avec remise)

### **Librairies :**
- `app/lib/pricing.ts` - Fonction `getPriceForSegment`

### **Migrations Prisma :**
- `prisma/migrations/20251229210749_add_product_prices/` - Table ProductPrice
- `prisma/migrations/20251229212000_add_discounts_and_costs/` - Remises et coûts

---

## 🔧 COMMANDES À EXÉCUTER

### **Migrations :**
```bash
# Migration pour les prix segment
npx prisma migrate dev --name add_product_prices

# Migration pour les remises et coûts
npx prisma migrate dev --name add_discounts_and_costs

# Générer le client Prisma
npx prisma generate
```

### **Seed :**
```bash
npm run db:seed
```

---

## ✅ CHECKLIST DE TEST

### **Tarification par segment :**
- [ ] Client LABO voit le prix LABO
- [ ] Client DENTISTE voit le prix DENTISTE (+10%)
- [ ] Client REVENDEUR voit le prix REVENDEUR (-10%)
- [ ] Ajout au panier garde le bon prix
- [ ] Admin peut modifier les 3 prix segment

### **Remises et marge :**
- [ ] Client avec `discountRate=10` : prix 100 → prix final 90
- [ ] La commande garde le prix final même si le prix produit change
- [ ] Coût produit stocké dans `costAtTime`
- [ ] Marge calculée : `(priceAtTime - costAtTime) * quantity`
- [ ] Marge % affichée dans admin/orders et admin/invoices
- [ ] Affichage "-" si `costAtTime = 0`

### **Modification de commandes :**
- [ ] Bouton "Modifier la commande" visible uniquement si modifiable
- [ ] Mode édition active les contrôles pour toutes les lignes
- [ ] Validation globale applique toutes les modifications
- [ ] Annulation restaure les quantités d'origine
- [ ] Message informatif si commande non modifiable
- [ ] Bouton "Annuler modification" pour revenir à la quantité d'origine

---

## 🎯 ÉTAT ACTUEL

### ✅ **TERMINÉ :**
1. ✅ Tarification par segment client (LABO, DENTISTE, REVENDEUR)
2. ✅ Remise client avec snapshot dans la commande
3. ✅ Coût produit avec snapshot dans la commande
4. ✅ Calcul et affichage de la marge (admin)
5. ✅ Modification globale de commandes en attente
6. ✅ Validation/annulation globale des modifications
7. ✅ Bouton "Nouvelle commande" redirige vers le catalogue
8. ✅ Bouton "Annuler modification" pour revenir à la quantité d'origine

### 🔄 **EN COURS / À VÉRIFIER :**
- Tests manuels des fonctionnalités
- Vérification des migrations Prisma
- Vérification du seed

### 📝 **AMÉLIORATIONS POSSIBLES :**
- Historique des modifications de commandes
- Notifications lors de modifications
- Export PDF des commandes avec marge

---

## 📊 STATISTIQUES

- **Fichiers créés :** 3
  - `app/portal/orders/OrderCard.tsx`
  - `app/portal/orders/OrderEditMode.tsx`
  - `app/lib/pricing.ts`

- **Fichiers modifiés :** ~15
  - Actions serveur : `order.ts`, `product.ts`, `invitation.ts`
  - Composants client : `OrderItemCard.tsx`, `ReorderAllButton.tsx`
  - Pages : `portal/page.tsx`, `portal/orders/page.tsx`, `admin/products/*`, `admin/orders/*`, `admin/invoices/*`
  - Schema Prisma : `schema.prisma`
  - Seed : `prisma/seed.ts`

- **Migrations Prisma :** 2
  - `add_product_prices`
  - `add_discounts_and_costs`

---

## 🚀 PROCHAINES ÉTAPES

1. **Tests manuels :**
   - Tester la tarification par segment
   - Tester les remises clients
   - Tester le calcul de marge
   - Tester la modification de commandes

2. **Vérifications :**
   - Vérifier que les migrations sont appliquées
   - Vérifier que le seed fonctionne
   - Vérifier qu'il n'y a pas d'erreurs de lint

3. **Documentation :**
   - Documenter les nouvelles fonctionnalités pour les utilisateurs
   - Documenter les nouvelles fonctionnalités pour les développeurs

---

**Date de création :** 2025-01-29  
**Dernière mise à jour :** 2025-01-29

