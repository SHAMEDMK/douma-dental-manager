# Plan de Complétion des Logs d'Audit

## 📋 Résumé des Dernières Actions

### ✅ Phase 1: Audit Logs Critiques (TERMINÉE)

**Actions implémentées:**
1. ✅ **Livraison (DELIVERED)** - `ORDER_STATUS_CHANGED` (SHIPPED → DELIVERED)
   - `app/actions/delivery.ts` - `confirmDeliveryWithCodeAction`
   - `app/actions/admin-orders.ts` - `deliverOrderAction`

2. ✅ **Expédition (SHIPPED)** - `ORDER_STATUS_CHANGED` (PREPARED → SHIPPED)
   - `app/actions/admin-orders.ts` - `markOrderShippedAction`

3. ✅ **Modification quantités** - `ORDER_UPDATED`
   - `app/actions/order.ts` - `updateOrderItemAction`, `updateOrderItemsAction`

4. ✅ **Ajout produits** - `ORDER_ITEM_ADDED`
   - `app/actions/order.ts` - `addItemsToOrderAction`, `addOrderItemAction`, `addOrderLinesAction`

5. ✅ **Annulation commande** - `ORDER_CANCELLED`
   - `app/actions/order.ts` - `cancelOrderAction`

6. ✅ **Paramètres** - `SETTINGS_UPDATED`
   - `app/actions/company-settings.ts` - `updateCompanySettingsAction`
   - `app/actions/admin-settings.ts` - `updateAdminSettingsAction`

### ✅ Phase 2: Rate Limiting + Audit Sécurité (TERMINÉE)

**Implémentations:**
- ✅ Helper audit sécurité créé (`lib/audit-security.ts`)
- ✅ 16+ routes API protégées avec rate limiting
- ✅ Événements de sécurité loggés: `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED_ACCESS`

---

## ❌ Actions Non Loggées (À Compléter)

### Priorité 1: Actions Métier Critiques

#### 1. Ajustement Stock ❌
**Fichier:** `app/actions/stock.ts`
**Fonction:** `updateStock(productId, operation, quantity, reason)`
**Action manquante:** `STOCK_ADJUSTED`

**Détails à logger:**
- `productId`, `productName`
- `oldStock`, `newStock`, `change` (delta)
- `operation` (ADD/REMOVE/SET)
- `reason`
- `type` (IN/OUT/ADJUSTMENT)

**Où placer le log:**
```typescript
// Après la transaction réussie, ligne ~111
try {
  const { logEntityUpdate } = await import('@/lib/audit')
  const session = await getSession()
  await logEntityUpdate(
    'STOCK_ADJUSTED',
    'STOCK',
    productId,
    session as any,
    { stock: product.stock }, // oldStock
    {
      stock: newStock,
      change: change,
      operation: operation,
      type: type,
      reason: reason || 'Manuel'
    }
  )
} catch (auditError) {
  console.error('Failed to log stock adjustment:', auditError)
}
```

---

#### 2. Modification Client ❌
**Fichier:** `app/actions/client.ts`
**Fonction:** `updateClient(clientId, data)`
**Action manquante:** `CLIENT_UPDATED`

**Détails à logger:**
- `clientId`, `email`, `name`
- Anciennes valeurs (name, companyName, segment, discountRate, creditLimit, etc.)
- Nouvelles valeurs (seulement les champs modifiés)

**Où placer le log:**
```typescript
// Avant l'update, récupérer oldClient (ligne ~74)
const oldClient = await prisma.user.findUnique({
  where: { id: clientId },
  select: {
    name: true,
    companyName: true,
    segment: true,
    discountRate: true,
    creditLimit: true,
    phone: true,
    address: true,
    city: true,
    ice: true
  }
})

// Après l'update réussi (ligne ~88)
try {
  const { logEntityUpdate } = await import('@/lib/audit')
  await logEntityUpdate(
    'CLIENT_UPDATED',
    'CLIENT',
    clientId,
    session as any,
    oldClient || {},
    validatedData // Nouvelles valeurs
  )
} catch (auditError) {
  console.error('Failed to log client update:', auditError)
}
```

---

#### 3. Création Client (via Invitation) ❌
**Fichier:** `app/actions/invite.ts`
**Fonction:** `acceptInvitationAction(token, prevState, formData)`
**Action manquante:** `CLIENT_CREATED`

**Note:** La création de client se fait via l'acceptation d'invitation. Il faut vérifier si un log existe déjà.

**Où vérifier:** `app/actions/invite.ts` - chercher `logEntityCreation` ou `CLIENT_CREATED`

**Si manquant, ajouter:**
```typescript
// Après la création du user (après prisma.user.create)
try {
  const { logEntityCreation } = await import('@/lib/audit')
  await logEntityCreation(
    'CLIENT_CREATED',
    'CLIENT',
    user.id,
    null, // Pas de session (création via invitation)
    {
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      segment: user.segment
    }
  )
} catch (auditError) {
  console.error('Failed to log client creation:', auditError)
}
```

---

#### 4. Création Invitation ❌
**Fichier:** `app/actions/admin.ts`
**Fonction:** `createInvitationAction(formData)`
**Action manquante:** `INVITATION_CREATED`

**Détails à logger:**
- `email` (email invité)
- `token` (optionnel, pour traçabilité)
- `expiresAt`

**Où placer le log:**
```typescript
// Après la création de l'invitation (ligne ~20)
try {
  const { logEntityCreation } = await import('@/lib/audit')
  const session = await getSession()
  await logEntityCreation(
    'INVITATION_CREATED',
    'USER', // ou créer type INVITATION si nécessaire
    invitation.id,
    session as any,
    {
      email: email,
      expiresAt: expiresAt.toISOString()
    }
  )
} catch (auditError) {
  console.error('Failed to log invitation creation:', auditError)
}
```

---

#### 5. Approbation Commande ❌
**Fichier:** `app/actions/admin-orders.ts`
**Fonction:** `approveOrderAction(orderId)`
**Action manquante:** `ORDER_APPROVED` ou `ORDER_STATUS_CHANGED` (si on considère comme changement de statut)

**Détails à logger:**
- `orderId`, `orderNumber`
- `requiresAdminApproval`: false (changement de true → false)

**Où placer le log:**
```typescript
// Après l'update réussi (ligne ~445)
try {
  const { logStatusChange } = await import('@/lib/audit')
  await logStatusChange(
    'ORDER_APPROVED', // ou ORDER_STATUS_CHANGED avec oldStatus/newStatus
    'ORDER',
    orderId,
    'PENDING_APPROVAL', // ou null si pas de statut
    'APPROVED', // ou null
    session as any,
    {
      orderNumber: order.orderNumber,
      requiresAdminApproval: false
    }
  )
} catch (auditError) {
  console.error('Failed to log order approval:', auditError)
}
```

**Note:** Vérifier si `ORDER_APPROVED` existe dans `AuditAction` type, sinon utiliser `ORDER_STATUS_CHANGED`.

---

#### 6. Modification Paiement ❌
**Fichier:** `app/actions/admin-payments.ts`
**Fonction:** `updatePaymentAction(paymentId, newAmount, newMethod, newReference)`
**Action manquante:** `PAYMENT_UPDATED`

**Détails à logger:**
- `paymentId`
- Anciennes valeurs: `oldAmount`, `oldMethod`, `oldReference`
- Nouvelles valeurs: `newAmount`, `newMethod`, `newReference`
- `invoiceId`, `invoiceNumber`

**Où placer le log:**
```typescript
// Avant l'update, récupérer oldPayment (ligne ~182)
// oldPayment est déjà récupéré dans la fonction

// Après l'update réussi (après prisma.payment.update)
try {
  const { logEntityUpdate } = await import('@/lib/audit')
  await logEntityUpdate(
    'PAYMENT_UPDATED',
    'PAYMENT',
    paymentId,
    session as any,
    {
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference
    },
    {
      amount: newAmount,
      method: newMethod,
      reference: newReference,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber
    }
  )
} catch (auditError) {
  console.error('Failed to log payment update:', auditError)
}
```

---

## 📝 Plan d'Implémentation Exact

### Étape 1: Ajouter Types d'Actions Manquants

**Fichier:** `lib/audit.ts`

**Types déjà présents dans `AuditAction`:**
- ✅ `STOCK_ADJUSTED` (ligne 27)
- ✅ `CLIENT_CREATED` (ligne 29)
- ✅ `CLIENT_UPDATED` (ligne 30)
- ✅ `CLIENT_DELETED` (ligne 31)

**Types à ajouter:**
```typescript
| 'INVITATION_CREATED'
| 'ORDER_APPROVED'
| 'PAYMENT_UPDATED'
```

### Étape 2: Implémenter les Logs (par priorité)

#### Priorité 1: Actions Métier Critiques

1. **STOCK_ADJUSTED** - `app/actions/stock.ts` ligne ~111
   - Helper: `logEntityUpdate`
   - Action: `STOCK_ADJUSTED`
   - EntityType: `STOCK`

2. **CLIENT_UPDATED** - `app/actions/client.ts` ligne ~88
   - Helper: `logEntityUpdate`
   - Action: `CLIENT_UPDATED`
   - EntityType: `CLIENT`

3. **PAYMENT_UPDATED** - `app/actions/admin-payments.ts` après update
   - Helper: `logEntityUpdate`
   - Action: `PAYMENT_UPDATED`
   - EntityType: `PAYMENT`

#### Priorité 2: Actions Administration

4. **ORDER_APPROVED** - `app/actions/admin-orders.ts` ligne ~445
   - Helper: `logStatusChange` ou `logEntityUpdate`
   - Action: `ORDER_APPROVED` (ou `ORDER_STATUS_CHANGED`)
   - EntityType: `ORDER`

5. **INVITATION_CREATED** - `app/actions/admin.ts` ligne ~20
   - Helper: `logEntityCreation`
   - Action: `INVITATION_CREATED`
   - EntityType: `USER` (ou créer `INVITATION`)

6. **CLIENT_CREATED** - `app/actions/invite.ts` après création user
   - Helper: `logEntityCreation`
   - Action: `CLIENT_CREATED`
   - EntityType: `CLIENT`

### Étape 3: Mettre à Jour la Page Audit

**Fichier:** `app/admin/audit/page.tsx`

**Labels déjà présents:**
- ✅ `STOCK_ADJUSTED: 'Stock ajusté'` (ligne 47)
- ✅ `CLIENT_CREATED: 'Client créé'` (ligne 48)
- ✅ `CLIENT_UPDATED: 'Client modifié'` (ligne 49)
- ✅ `CLIENT_DELETED: 'Client supprimé'` (ligne 50)

**Labels à ajouter:**
```typescript
INVITATION_CREATED: 'Invitation créée',
ORDER_APPROVED: 'Commande approuvée',
PAYMENT_UPDATED: 'Paiement modifié',
```

---

## 📊 Résumé des Actions

### Actions Déjà Loggées ✅ (16)
- `LOGIN`, `LOGIN_FAILED`
- `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_ITEM_ADDED`, `ORDER_STATUS_CHANGED`, `ORDER_CANCELLED`
- `INVOICE_CREATED`
- `PAYMENT_RECORDED`, `PAYMENT_DELETED`
- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`
- `CLIENT_DELETED`
- `SETTINGS_UPDATED`
- `DELIVERY_AGENT_CREATED`, `DELIVERY_AGENT_DELETED`
- `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED_ACCESS`

### Actions Manquantes ❌ (6)
- `STOCK_ADJUSTED` (type existe, log manquant)
- `CLIENT_CREATED` (type existe, log manquant dans `invite.ts`)
- `CLIENT_UPDATED` (type existe, log manquant)
- `INVITATION_CREATED` (type et log manquants)
- `ORDER_APPROVED` (type et log manquants)
- `PAYMENT_UPDATED` (type et log manquants)

---

## ✅ Checklist d'Implémentation

- [ ] Ajouter 3 types manquants dans `lib/audit.ts` (`INVITATION_CREATED`, `ORDER_APPROVED`, `PAYMENT_UPDATED`)
- [ ] Implémenter `STOCK_ADJUSTED` dans `app/actions/stock.ts` (ligne ~111)
- [ ] Implémenter `CLIENT_UPDATED` dans `app/actions/client.ts` (ligne ~88)
- [ ] Implémenter `CLIENT_CREATED` dans `app/actions/invite.ts` (ligne ~29, après création user)
- [ ] Implémenter `PAYMENT_UPDATED` dans `app/actions/admin-payments.ts` (après update)
- [ ] Implémenter `ORDER_APPROVED` dans `app/actions/admin-orders.ts` (ligne ~445)
- [ ] Implémenter `INVITATION_CREATED` dans `app/actions/admin.ts` (ligne ~20)
- [ ] Ajouter 3 labels manquants dans `app/admin/audit/page.tsx` (`INVITATION_CREATED`, `ORDER_APPROVED`, `PAYMENT_UPDATED`)
- [ ] Tester chaque action pour vérifier que les logs apparaissent

---

## 🎯 Objectif Final

**Couverture complète:** 22 actions loggées (16 existantes + 6 nouvelles)

**Toutes les actions critiques de l'application seront tracées dans les logs d'audit !** ✅
