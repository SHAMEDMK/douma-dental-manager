# Refactoring Accordéon - Page Commandes

## 📋 Résumé

Refactorisation de la page `/portal/orders` pour remplacer les checkboxes par un comportement accordéon, améliorer la navigation et rendre le menu sticky.

---

## ✅ Modifications effectuées

### 1. **Menu Portal - Ajout "Nouvelle commande"**
- **Fichier modifié :** `app/portal/layout.tsx`
- **Changements :**
  - Ajout du lien "Nouvelle commande" dans la navigation principale (aligné avec Catalogue / Mes Commandes)
  - Le lien redirige vers `/portal` (catalogue)
  - Style cohérent avec les autres liens de navigation
  - Menu rendu sticky avec `sticky top-0 z-50`
  - Ajout de padding top (`pt-24`) au contenu principal pour éviter le chevauchement avec le header fixe

### 2. **Page Commandes - Suppression bouton page-level**
- **Fichier modifié :** `app/portal/orders/page.tsx`
- **Changements :**
  - Suppression du bouton "Nouvelle commande" au niveau de la page
  - Suppression des imports inutilisés (`Link`, `ShoppingCart`)
  - Simplification du layout (seulement le titre et la liste)

### 3. **OrdersList - Accordéon au lieu de checkbox**
- **Fichier modifié :** `app/portal/orders/OrdersList.tsx`
- **Changements :**
  - Remplacement de `selectedOrderId` par `expandedOrderId` pour l'accordéon
  - Logique d'accordéon : un seul ordre ouvert à la fois
  - **Filtrage intelligent :** Seules les commandes modifiables (CONFIRMED/PREPARED + non payées) peuvent être expandées
  - Les commandes DELIVERED ou PAID ne peuvent pas être expandées
  - Suppression de la checkbox et de son UI
  - Passe `isExpanded`, `isModifiable`, et `onToggle` à `OrderCard`

### 4. **OrderCard - Header cliquable et accordéon**
- **Fichier modifié :** `app/portal/orders/OrderCard.tsx`
- **Changements :**
  - Remplacement de `isSelected` par `isExpanded`, `isModifiable`, `onToggle`
  - **Header cliquable :** Le header est cliquable uniquement pour les commandes modifiables
  - **Icône chevron :** Affichage de `ChevronDown` (fermé) ou `ChevronUp` (ouvert) pour les commandes modifiables
  - **Numéro de commande :** Utilisation de `break-words` pour permettre le wrapping et éviter la troncature
  - **Contenu expandable :** Le tableau des articles et les actions ne s'affichent que lorsque `isExpanded === true`
  - **Pas de message "contact vendeur" :** Les commandes non modifiables n'affichent aucun message ni UI d'expansion
  - Les commandes non modifiables restent visibles mais ne sont pas cliquables

---

## 📁 Fichiers modifiés

1. **`app/portal/layout.tsx`**
   - Menu sticky + lien "Nouvelle commande" dans la nav
   - Padding top pour le contenu principal

2. **`app/portal/orders/page.tsx`**
   - Suppression du bouton "Nouvelle commande" page-level

3. **`app/portal/orders/OrdersList.tsx`**
   - Accordéon avec un seul ordre ouvert à la fois
   - Filtrage des commandes modifiables

4. **`app/portal/orders/OrderCard.tsx`**
   - Header cliquable avec chevron
   - Contenu expandable conditionnel
   - Numéro de commande avec wrapping

---

## 🎯 Comportement final

### **Menu Portal :**
- ✅ Menu sticky en haut de la page lors du scroll
- ✅ Lien "Nouvelle commande" dans la navigation (Catalogue / Mes Commandes / Nouvelle commande)
- ✅ Contenu principal avec padding top pour éviter le chevauchement

### **Page Commandes :**
- ✅ Pas de bouton "Nouvelle commande" au niveau de la page
- ✅ Liste des commandes avec accordéon

### **Commandes modifiables (CONFIRMED/PREPARED + non payées) :**
- ✅ Header cliquable avec icône chevron
- ✅ Clic sur le header → expand/collapse
- ✅ Quand expandé : affiche tableau des articles + actions (Modifier, Annuler, Télécharger facture)
- ✅ Un seul ordre ouvert à la fois (accordéon classique)

### **Commandes non modifiables (DELIVERED, PAID, etc.) :**
- ✅ Header non cliquable (pas de chevron)
- ✅ Aucune zone d'actions visible
- ✅ Aucun message "contact vendeur"
- ✅ Commande toujours visible et lisible (statut, total, date)

### **Numéro de commande :**
- ✅ Entièrement visible avec `break-words` pour permettre le wrapping
- ✅ Pas de troncature importante
- ✅ Format complet : `CMD-YYYYMMDD-XXXX`

---

## ✅ Règles métier respectées

- ✅ **Commandes modifiables :** CONFIRMED ou PREPARED ET facture non payée
- ✅ **Commandes non modifiables :** DELIVERED, SHIPPED, CANCELLED, ou facture PAID → pas d'UI d'expansion
- ✅ **Accordéon :** Un seul ordre ouvert à la fois
- ✅ **Aucun changement de schéma :** Pas de modification Prisma
- ✅ **Mode édition global :** Conservé (bouton "Modifier la commande" au niveau de l'ordre)

---

## 🧪 Comment vérifier

### **Test 1 : Menu sticky**
1. Aller sur `/portal/orders`
2. Scroller vers le bas
3. **Vérifier :**
   - ✅ Le menu reste fixe en haut
   - ✅ Le contenu ne passe pas derrière le menu

### **Test 2 : Lien "Nouvelle commande"**
1. Vérifier la navigation en haut
2. **Vérifier :**
   - ✅ Lien "Nouvelle commande" visible entre "Mes Commandes" et les icônes de droite
   - ✅ Style cohérent avec les autres liens
   - ✅ Clic redirige vers `/portal`

### **Test 3 : Accordéon - Commande modifiable**
1. Trouver une commande CONFIRMED ou PREPARED (non payée)
2. **Vérifier :**
   - ✅ Icône chevron visible dans le header
   - ✅ Header cliquable (hover effect)
   - ✅ Clic sur le header → expande la commande
   - ✅ Affiche tableau des articles + actions
   - ✅ Clic à nouveau → collapse

### **Test 4 : Accordéon - Un seul ouvert**
1. Ouvrir une commande modifiable
2. Ouvrir une autre commande modifiable
3. **Vérifier :**
   - ✅ La première se ferme automatiquement
   - ✅ Seule la dernière cliquée reste ouverte

### **Test 5 : Commande non modifiable**
1. Trouver une commande DELIVERED ou avec facture PAID
2. **Vérifier :**
   - ✅ Pas d'icône chevron
   - ✅ Header non cliquable
   - ✅ Aucune zone d'actions visible
   - ✅ Aucun message "contact vendeur"
   - ✅ Commande toujours visible (statut, total, date)

### **Test 6 : Numéro de commande**
1. Vérifier l'affichage du numéro de commande
2. **Vérifier :**
   - ✅ Format complet visible : `CMD-YYYYMMDD-XXXX`
   - ✅ Pas de troncature importante
   - ✅ Wrapping si nécessaire

---

## 📝 Notes techniques

- **Sticky header :** Utilise `sticky top-0 z-50` avec padding top sur le main
- **Accordéon :** Géré dans `OrdersList` avec état `expandedOrderId`
- **Filtrage :** Seules les commandes modifiables peuvent être expandées
- **Performance :** Aucun impact, seulement conditionnement d'affichage
- **Accessibilité :** Header cliquable avec hover effect pour indiquer l'interactivité

---

**Date :** 2025-01-29  
**Statut :** ✅ Terminé

