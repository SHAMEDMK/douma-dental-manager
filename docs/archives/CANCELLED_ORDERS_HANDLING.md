# Gestion des Commandes Annulées

## Problème identifié

Lorsqu'une commande était annulée (par le client ou par l'admin), le système :
- ✅ Libérait le stock
- ✅ Mettait le statut à `CANCELLED`
- ✅ Créait des mouvements de stock
- ❌ **MAIS** ne réduisait pas le `user.balance` (qui avait été augmenté lors de la création de la commande)
- ❌ **ET** ne gérait pas la facture associée

## Solution implémentée

### 1. Réduction du balance client

Lors de l'annulation d'une commande, le `user.balance` est maintenant réduit du montant de la commande :

```typescript
// Dans cancelOrderAction (client) et updateOrderStatus (admin)
await tx.user.update({
  where: { id: order.userId },
  data: {
    balance: {
      decrement: order.total
    }
  }
})
```

**Pourquoi ?** Lors de la création d'une commande, le `user.balance` est augmenté de `orderTotal` (car les commandes impayées sont autorisées). Lors de l'annulation, il faut donc annuler cette augmentation pour que le plafond de crédit soit correctement calculé.

### 2. Gestion de la facture

Lors de l'annulation, si une facture existe et n'est pas payée, elle est marquée comme `CANCELLED` :

```typescript
if (order.invoice && order.invoice.status !== 'PAID') {
  await tx.invoice.update({
    where: { id: order.invoice.id },
    data: {
      status: 'CANCELLED',
      balance: 0 // Reset balance since order is cancelled
    }
  })
}
```

**Note :** Les factures partiellement payées peuvent être annulées, mais les paiements existants sont conservés (pour traçabilité).

### 3. Affichage du statut CANCELLED

Le statut `CANCELLED` a été ajouté aux affichages :
- `/admin/orders` : Badge gris "Annulée" pour les factures annulées
- `/admin/orders/[id]` : Affichage du statut de facture annulée
- `/admin/invoices` : Badge gris "Annulée" dans la liste
- `/admin/invoices/[id]` : Affichage du statut de facture annulée

## Fichiers modifiés

1. **`prisma/schema.prisma`**
   - Ajout de `CANCELLED` dans le commentaire du statut Invoice

2. **`app/actions/order.ts`** (`cancelOrderAction`)
   - Réduction du `user.balance`
   - Mise à jour du statut de facture

3. **`app/actions/admin-orders.ts`** (`updateOrderStatus`)
   - Réduction du `user.balance`
   - Mise à jour du statut de facture

4. **`app/admin/orders/page.tsx`**
   - Affichage du badge "Annulée" pour les factures annulées

5. **`app/admin/orders/[id]/page.tsx`**
   - Affichage du statut de facture annulée

6. **`app/admin/invoices/page.tsx`**
   - Ajout de `CANCELLED` dans `getStatusBadge`

7. **`app/admin/invoices/[id]/page.tsx`**
   - Affichage du statut de facture annulée

## Workflow côté Admin

### Quand un client annule une commande :

1. **Le client annule** via `/portal/orders` → `cancelOrderAction`
2. **Le système :**
   - Libère le stock
   - Réduit le `user.balance` du montant de la commande
   - Marque la facture comme `CANCELLED` (si elle existe et n'est pas payée)
   - Met le statut de la commande à `CANCELLED`

3. **Côté admin :**
   - La commande apparaît avec le statut "Annulée" dans `/admin/orders`
   - La facture apparaît avec le statut "Annulée" dans `/admin/invoices`
   - Le balance du client est automatiquement corrigé
   - Le plafond de crédit est recalculé correctement

### Quand l'admin annule une commande :

1. **L'admin change le statut** via `/admin/orders` → `updateOrderStatus('CANCELLED')`
2. **Le système :**
   - Vérifie que la facture n'est pas payée (bloque si payée)
   - Libère le stock
   - Réduit le `user.balance` du montant de la commande
   - Marque la facture comme `CANCELLED`
   - Met le statut de la commande à `CANCELLED`

## Tests à effectuer

1. **Test d'annulation par le client :**
   - Créer une commande (balance augmente)
   - Annuler la commande
   - ✅ Vérifier que le balance est réduit
   - ✅ Vérifier que la facture est marquée "Annulée"
   - ✅ Vérifier que le stock est libéré

2. **Test d'annulation par l'admin :**
   - Créer une commande
   - Admin change le statut à "Annulée"
   - ✅ Vérifier que le balance est réduit
   - ✅ Vérifier que la facture est marquée "Annulée"
   - ✅ Vérifier que le stock est libéré

3. **Test de plafond de crédit :**
   - Client avec plafond 1000€, balance 800€
   - Créer commande 300€ → balance 1100€ (dépasse le plafond)
   - Annuler la commande → balance 800€
   - ✅ Vérifier que le client peut maintenant créer une nouvelle commande jusqu'à 200€

4. **Test de facture payée :**
   - Créer une commande et payer la facture
   - ✅ Vérifier que l'annulation est bloquée (par le client et par l'admin)

## Migration Prisma

**Aucune migration nécessaire** : Le champ `status` de `Invoice` est déjà un `String`, donc la valeur `CANCELLED` peut être utilisée directement. Le commentaire dans le schéma a été mis à jour pour documenter ce statut.

## Notes importantes

- ⚠️ **Les commandes payées ne peuvent pas être annulées** (règle métier)
- ⚠️ **Les factures partiellement payées peuvent être annulées** (les paiements existants sont conservés pour traçabilité)
- ✅ **Le balance est toujours corrigé** lors de l'annulation
- ✅ **Le stock est toujours libéré** lors de l'annulation
- ✅ **La traçabilité est maintenue** (mouvements de stock, historique des paiements)

