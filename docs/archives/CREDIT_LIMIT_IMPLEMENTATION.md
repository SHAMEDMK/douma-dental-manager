# Implémentation du Plafond de Crédit

## 📋 Cause racine

Le système permettait les commandes impayées sans vérifier si le client avait un plafond de crédit suffisant, ce qui pouvait entraîner un endettement non contrôlé.

---

## ✅ Fichiers modifiés/créés

### **Schéma et migration :**
1. **`prisma/schema.prisma`**
   - Ajout du champ `creditLimit Float @default(0)` au modèle `User`
   - Commentaire : `0 = pas de crédit autorisé`

2. **`prisma/migrations/20251230000000_add_credit_limit/migration.sql`** (NOUVEAU)
   - Migration pour ajouter la colonne `creditLimit` à la table `User`

3. **`prisma/seed.ts`**
   - Admin et utilisateurs non-clients : `creditLimit: 0` (pas de crédit)
   - Clients : `creditLimit: 5000` par défaut

### **Actions serveur :**
4. **`app/actions/order.ts`** (createOrderAction)
   - Récupère `balance` et `creditLimit` de l'utilisateur
   - Vérifie le plafond AVANT de créer la commande ou de décrémenter le stock
   - Règle : `creditLimit <= 0` = pas de crédit autorisé (bloque si `orderTotal > 0`)
   - Règle : `(balance + orderTotal) > creditLimit` = bloque avec message d'erreur détaillé
   - Incrémente `user.balance` par `orderTotal` après création de la commande (commandes impayées augmentent la dette)

5. **`app/actions/admin-orders.ts`** (markInvoicePaid)
   - Récupère l'utilisateur associé à la facture
   - Réduit `user.balance` par `payment.amount` lors de l'enregistrement d'un paiement
   - Clamp le solde à `>= 0` pour éviter les valeurs négatives

6. **`app/actions/user.ts`** (NOUVEAU)
   - Action serveur `getUserCreditInfo()` pour récupérer `balance`, `creditLimit`, et `available` (crédit disponible)

7. **`app/actions/invitation.ts`** (createInvitation)
   - Ajout du paramètre `creditLimit` optionnel
   - Validation : `creditLimit >= 0`
   - Valeur par défaut : `5000` pour les nouveaux clients si non fourni
   - Persiste `creditLimit` lors de la création/mise à jour d'utilisateur

### **UI Client :**
8. **`app/portal/cart/page.tsx`**
   - Appel à `getUserCreditInfo()` au chargement
   - Affichage d'un résumé de crédit :
     - Solde dû : `balance`
     - Plafond : `creditLimit`
     - Disponible : `creditLimit - balance`
   - Désactive le bouton "Valider la commande" si `available < total` (prévisualisation côté client)
   - Affiche un message d'avertissement si la commande dépasserait le plafond
   - Affiche les erreurs de `createOrderAction` de manière proéminente (boîte rouge)

### **UI Admin :**
9. **`app/admin/clients/invite/page.tsx`**
   - Ajout d'un champ input "Plafond de crédit (€)"
   - Valeur par défaut : `5000`
   - Placeholder et texte d'aide explicatifs
   - Passe `creditLimit` à `createInvitation`

---

## 🧪 Comment tester

### **Test 1 : Commande bloquée par plafond**
1. Aller dans l'admin et inviter un client avec `creditLimit = 100`
2. Se connecter en tant que ce client
3. Ajouter des produits pour un total > 100€ au panier
4. Aller au panier
5. **Vérifier :**
   - ✅ Résumé de crédit affiché (Solde: 0€, Plafond: 100€, Disponible: 100€)
   - ✅ Bouton "Valider la commande" désactivé si total > disponible
   - ✅ Message d'avertissement visible
6. Tenter de valider la commande
7. **Vérifier :**
   - ✅ Erreur : "Plafond de crédit dépassé..." avec détails
   - ✅ Aucune commande créée
   - ✅ Stock non décrémenté

### **Test 2 : Commande autorisée**
1. Avec le même client, réduire le panier à un total < 100€
2. **Vérifier :**
   - ✅ Bouton "Valider la commande" activé
   - ✅ Pas de message d'avertissement
3. Valider la commande
4. **Vérifier :**
   - ✅ Commande créée avec succès
   - ✅ `user.balance` incrémenté par le total de la commande
   - ✅ Stock décrémenté

### **Test 3 : Paiement réduit le solde**
1. En tant qu'admin, aller sur la facture de la commande créée
2. Enregistrer un paiement partiel (ex: 50€ sur 80€)
3. **Vérifier :**
   - ✅ `user.balance` réduit de 50€
   - ✅ Solde dû = 30€ (80€ - 50€)
4. Le client peut maintenant commander jusqu'à 70€ (100€ - 30€)

### **Test 4 : Client sans crédit (creditLimit = 0)**
1. Inviter un client avec `creditLimit = 0`
2. Se connecter en tant que ce client
3. Tenter de valider une commande
4. **Vérifier :**
   - ✅ Erreur : "Crédit non autorisé. Veuillez contacter le vendeur..."

### **Test 5 : Admin invite avec creditLimit**
1. Aller sur `/admin/clients/invite`
2. Remplir le formulaire avec un `creditLimit` personnalisé (ex: 2000)
3. **Vérifier :**
   - ✅ Le client créé a `creditLimit = 2000`
   - ✅ Si non fourni, défaut = 5000

---

## 📝 Notes techniques

- **Vérification du plafond :** Effectuée AVANT toute modification de stock ou création de commande
- **Balance utilisateur :** Incrémentée lors de la création de commande, décrémentée lors des paiements
- **Clamp du solde :** Le solde ne peut jamais être négatif (clamp à `>= 0`)
- **Transaction atomique :** Toutes les opérations (création commande, facture, mise à jour balance) dans une seule transaction
- **UI préventive :** Désactivation du bouton côté client, mais validation finale côté serveur (source of truth)

---

**Date :** 2025-01-30  
**Statut :** ✅ Terminé

**Commande migration :**
```bash
npx prisma migrate dev --name add_credit_limit
```

