# Checklist de Validation G — Sécurité & Cohérence Métier 🔒

## ✅ 1. Impossible de modifier une commande facturée

### Tests à effectuer :

**Test 1.1 : Modification quantité (client)**
- [ ] Créer une commande CONFIRMED
- [ ] Générer une facture (invoice créée)
- [ ] Essayer de modifier la quantité d'un produit
- [ ] **Attendu** : Erreur "Facture émise : modification interdite."
- [ ] **Vérifier** : Aucune modification en base de données

**Test 1.2 : Ajout de produit (client)**
- [ ] Commande CONFIRMED avec facture
- [ ] Essayer d'ajouter un produit
- [ ] **Attendu** : Erreur "Facture émise : modification interdite."

**Test 1.3 : Modification multiple (client)**
- [ ] Commande CONFIRMED avec facture
- [ ] Essayer de modifier plusieurs quantités
- [ ] **Attendu** : Erreur "Facture émise : modification interdite."

**Test 1.4 : UI — Boutons masqués**
- [ ] Commande avec facture émise
- [ ] Aller sur `/portal/orders/[id]`
- [ ] **Attendu** : Pas de boutons "Modifier quantité" / "Ajouter produit"
- [ ] **Vérifier** : `OrderEditMode` retourne `null` si `!isOrderModifiable`

### Code vérifié :
- ✅ `app/actions/order.ts` : `updateOrderItemAction`, `addOrderLinesAction`, `addOrderItemAction` utilisent `canModifyOrder()`
- ✅ `app/lib/invoice-lock.ts` : `canModifyOrder()` vérifie `isInvoiceLocked(invoice)`

---

## ✅ 2. Impossible de surpayer une facture

### Tests à effectuer :

**Test 2.1 : Surpaiement lors de création**
- [ ] Créer une facture (ex: 100€ TTC)
- [ ] Essayer d'enregistrer un paiement de 150€
- [ ] **Attendu** : Erreur "Le montant (150.00 €) dépasse le solde restant (100.00 €)"
- [ ] **Vérifier** : Aucun paiement créé en base

**Test 2.2 : Surpaiement lors de modification**
- [ ] Facture avec paiement partiel (ex: 50€ payé sur 100€)
- [ ] Essayer de modifier le paiement à 60€ (reste = 50€)
- [ ] **Attendu** : Erreur "Le montant (60.00 €) dépasse le solde restant (50.00 €)"
- [ ] **Vérifier** : Paiement non modifié

**Test 2.3 : Paiement exact (limite)**
- [ ] Facture de 100€ TTC
- [ ] Enregistrer un paiement de 100.01€ (tolérance 0.01€)
- [ ] **Attendu** : Paiement accepté (tolérance pour arrondis)

**Test 2.4 : UI — Validation côté client**
- [ ] Formulaire de paiement avec montant > reste
- [ ] **Attendu** : Message d'erreur avant soumission
- [ ] **Vérifier** : `PaymentForm.tsx` valide `amount <= balance + 0.01`

### Code vérifié :
- ✅ `app/actions/admin-orders.ts` : `markInvoicePaid()` vérifie `amount > remaining + 0.01`
- ✅ `app/actions/admin-payments.ts` : `updatePaymentAction()` vérifie `newAmount > remainingBefore + 0.01`
- ✅ `app/admin/invoices/PaymentForm.tsx` : Validation côté client

---

## ✅ 3. Impossible de supprimer un paiement d'une facture payée

### Tests à effectuer :

**Test 3.1 : Suppression paiement — facture payée**
- [ ] Facture avec statut PAID
- [ ] Essayer de supprimer un paiement
- [ ] **Attendu** : Erreur "Impossible de supprimer un paiement d'une facture déjà payée"
- [ ] **Vérifier** : Aucun paiement supprimé

**Test 3.2 : Suppression paiement — facture partielle**
- [ ] Facture PARTIAL (ex: 50€ payé sur 100€)
- [ ] Supprimer le paiement de 50€
- [ ] **Attendu** : Paiement supprimé, facture repasse en UNPAID
- [ ] **Vérifier** : Statut facture = UNPAID, balance utilisateur restaurée

**Test 3.3 : Modification paiement — facture payée**
- [ ] Facture avec statut PAID
- [ ] Essayer de modifier un paiement
- [ ] **Attendu** : Erreur "Impossible de modifier un paiement d'une facture déjà payée"

**Test 3.4 : UI — Boutons masqués**
- [ ] Facture avec statut PAID
- [ ] Aller sur `/admin/invoices/[id]`
- [ ] **Attendu** : Pas de boutons "Supprimer" / "Modifier" sur les paiements
- [ ] **Vérifier** : Boutons désactivés avec tooltip explicatif

### Code vérifié :
- ✅ `app/actions/admin-payments.ts` : `deletePaymentAction()` vérifie `invoice.status === 'PAID'`
- ✅ `app/actions/admin-payments.ts` : `updatePaymentAction()` vérifie `invoice.status === 'PAID'`

---

## ✅ 4. Numéros BL/FAC jamais régénérés

### Tests à effectuer :

**Test 4.1 : Régénération numéro BL**
- [ ] Commande CONFIRMED
- [ ] Passer à PREPARED → numéro BL généré (ex: BL-20250110-0001)
- [ ] Revenir à CONFIRMED (si possible) puis repasser à PREPARED
- [ ] **Attendu** : Même numéro BL conservé (BL-20250110-0001)
- [ ] **Vérifier** : `deliveryNoteNumber` inchangé en base

**Test 4.2 : Régénération numéro facture**
- [ ] Commande avec facture (numéro généré)
- [ ] Essayer de régénérer le numéro facture
- [ ] **Attendu** : Erreur "Ce numéro est déjà attribué et ne peut pas être régénéré"
- [ ] **Vérifier** : `invoiceNumber` inchangé

**Test 4.3 : Génération BL multiple fois**
- [ ] Commande PREPARED avec BL existant
- [ ] Appeler `generateDeliveryNoteAction()` ou `createDeliveryNoteAction()`
- [ ] **Attendu** : Erreur "Un bon de livraison existe déjà pour cette commande"
- [ ] **Vérifier** : Aucun nouveau BL créé

**Test 4.4 : Transition SHIPPED → DELIVERED**
- [ ] Commande SHIPPED avec BL
- [ ] Passer à DELIVERED
- [ ] **Attendu** : Numéro BL conservé (pas de régénération)

### Code vérifié :
- ✅ `app/actions/admin-orders.ts` : `updateOrderStatus()` vérifie `isDeliveryNoteNumberAlreadyAssigned()` avant génération
- ✅ `app/actions/admin-orders.ts` : `generateDeliveryNoteAction()` vérifie `isDeliveryNoteNumberAlreadyAssigned()`
- ✅ `app/lib/invoice-lock.ts` : `isDeliveryNoteNumberAlreadyAssigned()` et `isInvoiceNumberAlreadyAssigned()`

---

## ✅ 5. Messages d'erreur clairs et cohérents

### Tests à effectuer :

**Test 5.1 : Message facture verrouillée**
- [ ] Essayer de modifier une commande facturée
- [ ] **Attendu** : Message "Facture émise : modification interdite." (pas "Cette commande ne peut pas être modifiée")

**Test 5.2 : Message surpaiement**
- [ ] Essayer de surpayer une facture
- [ ] **Attendu** : Message "Le montant (X.XX €) dépasse le solde restant (Y.YY €)"

**Test 5.3 : Message suppression paiement payé**
- [ ] Essayer de supprimer un paiement d'une facture payée
- [ ] **Attendu** : Message "Impossible de supprimer un paiement d'une facture déjà payée"

**Test 5.4 : Message régénération numéro**
- [ ] Essayer de régénérer un numéro BL/FAC
- [ ] **Attendu** : Message "Ce numéro est déjà attribué et ne peut pas être régénéré. Les numéros de facture et BL sont figés dès leur attribution."

### Code vérifié :
- ✅ `app/lib/invoice-lock.ts` : Messages standardisés (`ORDER_NOT_MODIFIABLE_ERROR`, `NUMBER_ALREADY_ASSIGNED_ERROR`)
- ✅ Toutes les actions utilisent les messages centralisés

---

## ⚠️ 6. UI cohérente (boutons cachés/désactivés)

### Tests à effectuer :

**Test 6.1 : Boutons modification commande (client)**
- [ ] Commande CONFIRMED sans facture → **Attendu** : Boutons "Modifier" visibles
- [ ] Commande CONFIRMED avec facture → **Attendu** : Boutons "Modifier" masqués
- [ ] Commande PREPARED avec facture → **Attendu** : Boutons "Modifier" masqués
- [ ] Commande DELIVERED → **Attendu** : Boutons "Modifier" masqués

**Test 6.2 : Boutons actions commande (admin)**
- [ ] Commande avec facture verrouillée
- [ ] Aller sur `/admin/orders/[id]`
- [ ] **Attendu** : `OrderActionButtons` retourne `null` si `isInvoiceLocked`
- [ ] **Vérifier** : Pas de boutons "Préparer", "Expédier", "Livrer"

**Test 6.3 : Boutons paiement (admin)**
- [ ] Facture UNPAID → **Attendu** : Bouton "Encaisser" visible
- [ ] Facture PARTIAL → **Attendu** : Bouton "Encaisser" visible
- [ ] Facture PAID → **Attendu** : Bouton "Encaisser" masqué

**Test 6.4 : Boutons supprimer/modifier paiement**
- [ ] Facture UNPAID avec paiements → **Attendu** : Boutons "Supprimer" / "Modifier" visibles
- [ ] Facture PARTIAL avec paiements → **Attendu** : Boutons "Supprimer" / "Modifier" visibles
- [ ] Facture PAID avec paiements → **Attendu** : Boutons "Supprimer" / "Modifier" masqués/désactivés avec tooltip

**Test 6.5 : Badges visuels**
- [ ] Commande avec facture verrouillée → **Attendu** : Badge "Commande non modifiable" ou "Facture verrouillée"
- [ ] Facture PAID → **Attendu** : Badge "Payée" visible

**Test 6.6 : Tooltips explicatifs**
- [ ] Bouton désactivé (ex: modifier paiement facture payée)
- [ ] **Attendu** : Tooltip "Impossible de modifier un paiement d'une facture déjà payée"

### Code à vérifier :
- ⚠️ `app/portal/orders/OrderEditMode.tsx` : Vérifier que `isOrderModifiable` utilise `canModifyOrder()`
- ⚠️ `app/admin/orders/OrderActionButtons.tsx` : Déjà vérifie `isInvoiceLocked` ✅
- ⚠️ `app/admin/invoices/[id]/page.tsx` : Ajouter boutons supprimer/modifier paiement avec vérifications
- ⚠️ `app/admin/invoices/PaymentForm.tsx` : Masquer si facture PAID

---

## 📋 Résumé des vérifications

### ✅ Implémenté côté serveur :
1. ✅ Vérification `canModifyOrder()` dans toutes les actions
2. ✅ Vérification surpaiement dans `markInvoicePaid()` et `updatePaymentAction()`
3. ✅ Vérification suppression/modification paiement facture payée
4. ✅ Protection régénération numéros BL/FAC
5. ✅ Messages d'erreur standardisés

### ⚠️ À compléter côté UI :
1. ⚠️ Boutons modification commande masqués si facture verrouillée (partiellement fait)
2. ⚠️ Boutons supprimer/modifier paiement avec vérifications (à ajouter)
3. ⚠️ Tooltips explicatifs sur boutons désactivés (à ajouter)
4. ⚠️ Badges visuels cohérents (partiellement fait)

---

## 🚀 Prochaines étapes

1. **Exécuter la migration Prisma** :
   ```bash
   npx prisma db push
   # ou
   npx prisma migrate dev --name add_audit_fields
   ```

2. **Tester chaque point de la checklist** :
   - Cocher chaque case après validation
   - Noter les éventuels problèmes

3. **Compléter l'UI** :
   - Ajouter boutons supprimer/modifier paiement dans `app/admin/invoices/[id]/page.tsx`
   - Ajouter tooltips et désactivation selon règles
   - Vérifier cohérence des badges

4. **Documenter les résultats** :
   - Noter les cas de test réussis/échoués
   - Corriger les problèmes identifiés
