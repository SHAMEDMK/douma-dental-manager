# Méthodes de Paiement - DOUMA Dental Manager

Ce document décrit les méthodes de paiement disponibles dans le système et leur utilisation.

## 📋 Méthodes Disponibles

Le système supporte **5 méthodes de paiement** :

### 1. **CASH** - Espèces 💵
- **Description** : Paiement en espèces (liquide)
- **Utilisation** : Pour les paiements en espèces reçus directement
- **Traçabilité** : Référence optionnelle pour suivre les encaissements

### 2. **CHECK** - Chèque 📝
- **Description** : Paiement par chèque
- **Utilisation** : Pour les paiements par chèque
- **Traçabilité** : Référence recommandée (numéro de chèque)

### 3. **TRANSFER** - Virement 💳
- **Description** : Paiement par virement bancaire
- **Utilisation** : Pour les virements bancaires
- **Traçabilité** : Référence recommandée (numéro de virement, référence bancaire)

### 4. **CARD** - Carte Bancaire 💳
- **Description** : Paiement par carte bancaire via TPE (Terminal de Paiement Électronique) en magasin
- **Utilisation** : Pour les paiements par carte effectués en magasin via un terminal de paiement
- **Traçabilité** : Référence recommandée (numéro de transaction TPE, référence bancaire)
- **Spécificité** : Enregistrement manuel du paiement (le paiement réel se fait via TPE)

### 5. **COD** - Cash On Delivery (Paiement à la livraison) 🚚
- **Description** : Contexte de paiement à la livraison (contre remboursement)
- **Utilisation** : Pour les commandes payées lors de la livraison par le livreur
- **Méthode de paiement** : Le client peut payer par Espèces, Chèque, Carte Bancaire ou Virement lors de la livraison
- **Traçabilité** : Référence recommandée (numéro de chèque, transaction, note du livreur)
- **Spécificité** : Utilisé uniquement pour les commandes expédiées (SHIPPED), avec code de confirmation
- **Note** : COD est un contexte (où/quand), pas une méthode de paiement. La méthode réelle est choisie lors de l'enregistrement (CASH, CHECK, CARD, TRANSFER)

---

## 🗄️ Structure dans la Base de Données

### Modèle `Payment`

```prisma
model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  invoice   Invoice  @relation(fields: [invoiceId], references: [id])
  amount    Float
  method    String   // CASH, CHECK, TRANSFER, CARD (COD est un contexte, pas une méthode)
  reference String?  // Référence optionnelle (numéro chèque, virement, etc.)
  createdBy String?  // ID de l'utilisateur qui a créé le paiement
  createdAt DateTime @default(now())
}
```

### Champs Importants

- **`method`** : Méthode de paiement (CASH, CHECK, TRANSFER, CARD). Note: COD est un contexte de livraison, pas une méthode de paiement (les paiements COD utilisent CASH, CHECK, CARD, ou TRANSFER)
- **`amount`** : Montant du paiement (en Dirhams)
- **`reference`** : Référence optionnelle (numéro de chèque, virement, note)
- **`createdBy`** : ID de l'utilisateur qui a enregistré le paiement (audit)

---

## 💼 Utilisation dans l'Application

### 1. **Encaissement Standard** (Admin/Comptable)

**Formulaire** : `app/admin/invoices/PaymentForm.tsx`

**Méthodes disponibles** :
- ✅ Espèces (CASH)
- ✅ Chèque (CHECK)
- ✅ Virement (TRANSFER)
- ✅ Carte Bancaire (CARD)

**Utilisation** :
- Accessible depuis la page de détail d'une facture
- Permet d'encaisser un montant partiel ou total
- Validation : le montant ne peut pas dépasser le solde restant

**Exemple** :
```typescript
// Dans PaymentForm.tsx
<select name="method" required>
  <option value="CASH">Espèces</option>
  <option value="CHECK">Chèque</option>
  <option value="TRANSFER">Virement</option>
  <option value="CARD">Carte Bancaire</option>
</select>
```

### 2. **Encaissement COD** (Paiement à la livraison)

**Formulaire** : `app/admin/orders/[id]/CODPaymentForm.tsx`

**Méthode** :
- ✅ COD uniquement

**Utilisation** :
- Accessible uniquement pour les commandes **SHIPPED** (expédiées)
- Permet au livreur ou à l'admin d'encaisser le paiement après livraison
- Affiché dans la page de détail d'une commande expédiée

**Spécificités** :
- Le formulaire COD affiche :
  - Montant facture TTC
  - Total déjà payé
  - Reste à payer
- Validation : empêche le surpaiement

---

## 🔐 Validation et Sécurité

### Validation des Méthodes

Dans `app/actions/admin-orders.ts` :

```typescript
if (!paymentMethod || !['CASH', 'CHECK', 'TRANSFER', 'COD'].includes(paymentMethod)) {
  return { error: 'Méthode de paiement invalide' }
}
```

### Autorisations

**Qui peut enregistrer un paiement ?**
- ✅ **ADMIN** : Toutes les méthodes
- ✅ **COMPTABLE** : Toutes les méthodes
- ❌ **MAGASINIER** : Non autorisé
- ❌ **CLIENT** : Non autorisé

### Validation du Montant

```typescript
// Empêche le surpaiement
if (amount > remaining + 0.01) {
  return { error: `Le montant dépasse le solde restant` }
}
```

---

## 📊 Affichage dans l'Interface

### Traduction des Méthodes

Les méthodes sont traduites en français dans l'interface :

```typescript
{payment.method === 'CASH' && 'Espèces'}
{payment.method === 'CHECK' && 'Chèque'}
{payment.method === 'TRANSFER' && 'Virement'}
{payment.method === 'CARD' && 'Carte Bancaire'}
```

### Où sont affichées les méthodes ?

1. **Page des paiements** (`/admin/payments`)
   - Liste tous les paiements avec leur méthode

2. **Détail d'une facture** (`/admin/invoices/[id]`)
   - Historique des paiements avec méthode et référence

3. **Détail d'une commande** (`/admin/orders/[id]`)
   - Formulaire COD pour les commandes expédiées

4. **Interface comptable** (`/comptable/invoices/[id]`)
   - Historique des paiements

5. **Portail client** (`/portal/invoices/[id]`)
   - Historique des paiements (lecture seule)

---

## 🔄 Workflow de Paiement

### Scénario 1 : Paiement Standard

1. **Facture créée** → Statut : `UNPAID`
2. **Admin/Comptable encaisse** → Utilise `PaymentForm`
   - Sélectionne méthode (CASH, CHECK, TRANSFER)
   - Saisit montant (partiel ou total)
   - Optionnel : référence (numéro chèque, virement)
3. **Paiement enregistré** → `Payment` créé
4. **Statut facture mis à jour** :
   - `PARTIAL` si montant < total TTC
   - `PAID` si montant = total TTC

### Scénario 2 : Paiement COD (Cash On Delivery)

1. **Commande créée** → Statut : `CONFIRMED`
2. **Magasinier prépare** → Statut : `PREPARED`
3. **Admin expédie** → Statut : `SHIPPED`
   - Code de confirmation généré (6 chiffres)
   - Bon de livraison créé avec code
4. **Livreur livre** → Confirme avec code
5. **Admin/Comptable encaisse COD** → Utilise `CODPaymentForm`
   - Méthode : Choix (Espèces, Chèque, Carte Bancaire, Virement)
   - Montant : reste à payer
   - Optionnel : note/référence (ex: "Chèque #12345" ou "Encaissé par livreur")
6. **Paiement enregistré** → Statut facture : `PAID`

---

## 📝 Champs de Référence

### Quand utiliser la référence ?

| Méthode | Référence Recommandée | Exemple |
|---------|----------------------|---------|
| **CASH** | Optionnel | "Encaissement caisse 1" |
| **CHECK** | **Recommandé** | "Chèque #12345" |
| **TRANSFER** | **Recommandé** | "Virement REF-2026-001" |
| **CARD** | **Recommandé** | "Transaction TPE #12345" ou "Réf. bancaire XYZ" |
| **COD** | Optionnel | "Encaissé par livreur Ali" |

### Format de Référence

- **Type** : Texte libre (String)
- **Longueur** : Illimitée (mais recommandé < 100 caractères)
- **Validation** : Aucune (champ optionnel)

---

## 💡 Bonnes Pratiques

### 1. **Références pour Traçabilité**

✅ **À faire** :
- Toujours saisir une référence pour les chèques
- Toujours saisir une référence pour les virements
- Utiliser un format cohérent (ex: "CHQ-2026-001")

❌ **À éviter** :
- Laisser vide pour les chèques/virements
- Formats incohérents

### 2. **Paiements Partiels**

✅ **Autorisé** :
- Plusieurs paiements pour une même facture
- Exemple : 500 Dh en chèque + 300 Dh en espèces

❌ **Empêché** :
- Surpaiement (montant > reste à payer)
- Montant négatif ou zéro

### 3. **COD Workflow**

✅ **Processus recommandé** :
1. Commande expédiée → Code généré
2. Livreur confirme livraison avec code
3. Admin/Comptable encaisse COD immédiatement après livraison

---

## 🔍 Audit et Traçabilité

### Champs d'Audit

Chaque paiement enregistre :
- **`createdBy`** : ID de l'utilisateur qui a créé le paiement
- **`createdAt`** : Date et heure de création
- **`method`** : Méthode utilisée
- **`reference`** : Référence optionnelle

### Logs d'Audit

Les paiements sont loggés dans l'audit :
- Action : `PAYMENT_RECORDED`
- Détails : montant, méthode, référence, facture

---

## 🎯 Cas d'Usage

### Cas 1 : Client paie par chèque

1. Facture créée (1000 Dh TTC)
2. Client envoie chèque de 1000 Dh
3. Admin/Comptable :
   - Va sur `/admin/invoices/[id]`
   - Clique "Encaisser"
   - Méthode : **Chèque**
   - Montant : **1000.00**
   - Référence : **"CHQ-2026-001"**
   - Confirme
4. Facture → Statut : `PAID`

### Cas 2 : Client paie partiellement

1. Facture créée (1000 Dh TTC)
2. Client paie 600 Dh en espèces
3. Admin/Comptable :
   - Méthode : **Espèces**
   - Montant : **600.00**
   - Confirme
4. Facture → Statut : `PARTIAL`
5. Plus tard, client paie 400 Dh par virement
6. Admin/Comptable :
   - Méthode : **Virement**
   - Montant : **400.00**
   - Référence : **"VIR-2026-001"**
   - Confirme
7. Facture → Statut : `PAID`

### Cas 3 : Paiement COD

1. Commande créée et expédiée
2. Code de confirmation : **123456**
3. Livreur livre et confirme avec code
4. Admin/Comptable :
   - Va sur `/admin/orders/[id]`
   - Section "Encaisser (COD)"
   - Montant : **reste à payer** (pré-rempli)
   - Référence : **"Encaissé par livreur"** (optionnel)
   - Clique "Encaisser (COD)"
5. Paiement COD enregistré
6. Facture → Statut : `PAID`

---

## 📈 Statistiques

Les méthodes de paiement sont utilisées pour :
- **Rapports** : Analyse des méthodes préférées
- **Comptabilité** : Traçabilité des encaissements
- **Audit** : Historique complet des paiements

---

## 🔧 Actions Disponibles

### `markInvoicePaid`

**Fichier** : `app/actions/admin-orders.ts`

**Paramètres** :
- `invoiceId` : ID de la facture
- `paymentMethod` : CASH, CHECK, TRANSFER, ou COD
- `reference` : Référence optionnelle
- `amount` : Montant à encaisser

**Fonctionnalités** :
- ✅ Validation de la méthode
- ✅ Validation du montant (pas de surpaiement)
- ✅ Mise à jour du statut de la facture
- ✅ Mise à jour du solde client
- ✅ Audit logging

---

## ⚠️ Limitations Actuelles

1. **Pas de paiement en ligne** : Seulement paiements manuels
2. **Pas de carte bancaire** : Non implémenté
3. **Pas de paiement mobile** : Non implémenté
4. **COD uniquement pour commandes expédiées** : Logique métier

---

## 🚀 Améliorations Possibles

### Futures Méthodes

- **CARD** : Carte bancaire
- **MOBILE** : Paiement mobile (Orange Money, etc.)
- **CREDIT** : Paiement à crédit (déjà supporté via `balance`)

### Améliorations UX

- Badges visuels pour chaque méthode
- Filtres par méthode dans la liste des paiements
- Statistiques par méthode de paiement

---

## 📞 Support

Pour toute question sur les méthodes de paiement, consultez :
- La documentation des actions : `app/actions/admin-orders.ts`
- Les formulaires : `app/admin/invoices/PaymentForm.tsx` et `app/admin/orders/[id]/CODPaymentForm.tsx`
