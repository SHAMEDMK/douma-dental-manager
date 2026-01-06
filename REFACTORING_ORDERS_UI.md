# Refactoring UI - Sélection de commandes

## 📋 Résumé

Refactorisation de la page `/portal/orders` pour réduire l'encombrement visuel en affichant les boutons d'action uniquement lorsque l'utilisateur sélectionne une commande via une checkbox.

---

## ✅ Modifications effectuées

### 1. **Nouveau composant : `OrdersList.tsx`**
- **Fichier créé :** `app/portal/orders/OrdersList.tsx`
- **Rôle :** Composant client qui gère l'état de sélection des commandes
- **Fonctionnalités :**
  - Gère `selectedOrderId` dans un état local
  - Affiche une checkbox "Sélectionner" pour chaque commande
  - Passe la prop `isSelected` à `OrderCard`

### 2. **Page principale : `page.tsx`**
- **Fichier modifié :** `app/portal/orders/page.tsx`
- **Changements :**
  - Utilise maintenant `OrdersList` au lieu de mapper directement les `OrderCard`
  - Ajout d'un bouton "Nouvelle commande" au niveau de la page (en haut à droite)
  - Le bouton redirige vers `/portal` (catalogue)
  - Suppression de l'import `ReorderAllButton` (déplacé au niveau page)

### 3. **Composant commande : `OrderCard.tsx`**
- **Fichier modifié :** `app/portal/orders/OrderCard.tsx`
- **Changements :**
  - Ajout de la prop `isSelected?: boolean` (défaut: `false`)
  - **Zone d'actions conditionnelle :** Les actions ne s'affichent que si `isSelected === true`
  - Suppression de `ReorderAllButton` (déplacé au niveau page)
  - Affichage conditionnel :
    - Si sélectionné ET modifiable : affiche `OrderEditMode` et `OrderActions`
    - Si sélectionné ET non modifiable : affiche le message "Pour modifier cette commande, veuillez contacter le vendeur"
    - Si sélectionné ET facture existe : affiche le bouton "Télécharger Facture (PDF)"
  - Suppression de l'import `ReorderAllButton`

### 4. **Composant ligne : `OrderItemCard.tsx`**
- **Fichier modifié :** `app/portal/orders/OrderItemCard.tsx`
- **Changements :**
  - **Suppression du bouton "Annuler modification" individuel**
  - Suppression de la logique `originalQuantityRef` et `hasBeenModified`
  - Suppression de la fonction `handleRevertToOriginal`
  - Simplification : ne gère plus que :
    - Les contrôles de quantité en mode édition global (via props)
    - Le bouton "Recommander" pour les commandes non modifiables
  - Suppression des imports inutilisés (`useRef`, `useEffect`, `Undo2`, `updateOrderItemAction`)

---

## 📁 Fichiers modifiés/créés

### **Créés :**
1. `app/portal/orders/OrdersList.tsx` - Gestion de la sélection

### **Modifiés :**
1. `app/portal/orders/page.tsx` - Utilise OrdersList + bouton page-level
2. `app/portal/orders/OrderCard.tsx` - Prop `isSelected` + actions conditionnelles
3. `app/portal/orders/OrderItemCard.tsx` - Suppression "Annuler modification"

---

## 🎯 Comportement final

### **Par défaut (aucune sélection) :**
- ✅ Checkboxes visibles pour chaque commande
- ✅ Aucun bouton d'action visible
- ✅ Détails de commande toujours visibles (tableau des articles, statuts, total)

### **Lors de la sélection d'une commande :**
- ✅ Checkbox cochée
- ✅ Zone d'actions apparaît en bas de la carte :
  - **Si modifiable (CONFIRMED/PREPARED + non payée) :**
    - Bouton "Modifier la commande" (active le mode édition global)
    - Bouton "Annuler la commande"
  - **Si non modifiable :**
    - Message : "Pour modifier cette commande, veuillez contacter le vendeur"
  - **Si facture existe :**
    - Bouton "Télécharger Facture (PDF)"

### **Bouton "Nouvelle commande" :**
- ✅ Unique bouton au niveau de la page (en haut à droite)
- ✅ Redirige vers `/portal` (catalogue)
- ✅ Visible sur toutes les pages de commandes

### **Mode édition global :**
- ✅ Un seul bouton "Modifier la commande" au niveau de la commande
- ✅ Active le mode édition pour toutes les lignes simultanément
- ✅ Boutons "Valider les modifications" et "Annuler" au niveau de la commande
- ✅ L'annulation restaure les quantités localement (pas d'appel serveur)

---

## ✅ Règles métier respectées

- ✅ **Commandes modifiables :** CONFIRMED ou PREPARED ET facture non payée
- ✅ **Commandes non modifiables :** Affichent le message de contact vendeur
- ✅ **Actions conditionnelles :** Boutons affichés uniquement selon les règles métier
- ✅ **Aucun changement de schéma :** Pas de modification Prisma
- ✅ **Aucune nouvelle fonctionnalité :** Seulement restructuration UI/UX

---

## 🧪 Comment vérifier

### **Test 1 : Vue par défaut**
1. Aller sur `/portal/orders`
2. **Vérifier :**
   - ✅ Checkboxes visibles pour chaque commande
   - ✅ Aucun bouton d'action visible
   - ✅ Bouton "Nouvelle commande" en haut à droite

### **Test 2 : Sélection d'une commande modifiable**
1. Cocher la checkbox d'une commande CONFIRMED/PREPARED (non payée)
2. **Vérifier :**
   - ✅ Zone d'actions apparaît
   - ✅ Bouton "Modifier la commande" visible
   - ✅ Bouton "Annuler la commande" visible
   - ✅ Bouton "Télécharger Facture" visible (si facture existe)

### **Test 3 : Sélection d'une commande non modifiable**
1. Cocher la checkbox d'une commande DELIVERED ou payée
2. **Vérifier :**
   - ✅ Zone d'actions apparaît
   - ✅ Message "Pour modifier cette commande, veuillez contacter le vendeur" visible
   - ✅ Pas de boutons "Modifier" ou "Annuler"

### **Test 4 : Mode édition**
1. Sélectionner une commande modifiable
2. Cliquer sur "Modifier la commande"
3. **Vérifier :**
   - ✅ Contrôles de quantité apparaissent pour toutes les lignes
   - ✅ Boutons "Valider les modifications" et "Annuler" visibles
   - ✅ L'annulation restaure les quantités sans appel serveur

### **Test 5 : Bouton "Nouvelle commande"**
1. Cliquer sur "Nouvelle commande" (en haut à droite)
2. **Vérifier :**
   - ✅ Redirection vers `/portal` (catalogue)

### **Test 6 : Scalabilité**
1. Créer 10+ commandes
2. **Vérifier :**
   - ✅ Page reste propre et lisible
   - ✅ Seule la commande sélectionnée affiche ses actions

---

## 📝 Notes techniques

- **État de sélection :** Géré dans `OrdersList` (composant client)
- **Pas de persistance :** La sélection est perdue au rafraîchissement (comportement attendu)
- **Accessibilité :** Labels ARIA ajoutés aux checkboxes
- **Performance :** Aucun impact, seulement conditionnement d'affichage

---

**Date :** 2025-01-29  
**Statut :** ✅ Terminé

