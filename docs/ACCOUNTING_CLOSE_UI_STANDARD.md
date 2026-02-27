# Standard { error: string } — vérification UI / clôture comptable

Toutes les Server Actions liées à la clôture comptable retournent `{ error: string }` (jamais de throw pour l’UI). Les callers doivent **toujours** attendre le résultat, tester `result?.error` et afficher un message (toast / état) sans faire de redirect succès si une erreur est présente.

## Actions concernées

| Fichier | Actions |
|---------|--------|
| `app/actions/order.ts` | createOrderAction, updateOrderItemAction, updateOrderItemsAction, addItemsToOrderAction, addOrderItemAction, addOrderLinesAction, cancelOrderAction |
| `app/actions/admin-orders.ts` | updateOrderStatus, approveOrderAction, markInvoicePaid |
| `app/actions/admin-payments.ts` | deletePaymentAction, updatePaymentAction, deleteInvoiceAction |
| `app/actions/company-settings.ts` | updateAccountingLockAction (non appelée depuis l’UI actuelle ; réglage clôture via script E2E) |

## Callers vérifiés

| Caller | Action(s) | Vérification |
|--------|-----------|----------------|
| `app/admin/invoices/PaymentForm.tsx` | markInvoicePaid | ✅ await, `if (result.error)` → setError, pas de redirect si error. Commentaire ajouté. |
| `app/admin/invoices/[id]/DeleteInvoiceButton.tsx` | deleteInvoiceAction | ✅ await, `if (result.error)` → toast.error + return. Fix: return early + commentaire. |
| `app/admin/invoices/[id]/page.tsx` | (PaymentForm, DeleteInvoiceButton) | Composants enfants gèrent result.error. |
| `app/admin/orders/[id]/CODPaymentForm.tsx` | markInvoicePaid | ✅ await, `if (result.error)` → setError. |
| `app/admin/orders/OrderActionButtons.tsx` | updateOrderStatus, approveOrderAction | ✅ await, `if (result.error)` → setError, pas de redirect si error. |
| `app/admin/orders/OrderStatusSelect.tsx` | updateOrderStatus | ✅ await, `if (result.error)` → setError, revert status. |
| `app/admin/settings/company/CompanySettingsForm.tsx` | updateCompanySettingsAction | ✅ await, `if (result.success)` / else setError. (updateAccountingLockAction non utilisée dans ce formulaire.) |
| `app/portal/cart/page.tsx` | createOrderAction | ✅ await, `if (result.error)` → setError, pas de redirect si error. |
| `app/admin/clients/[id]/create-order/CreateOrderForClientForm.tsx` | createOrderAction | ✅ await, `if (result.error)` → toast.error + return. |
| `app/portal/orders/OrderCard.tsx` | updateOrderItemsAction | ✅ **Fix appliqué** : retourne `{ error: result.error }` au lieu de throw ; pas de redirect si error. Commentaire "Always handle result.error". |
| `app/portal/orders/OrderEditMode.tsx` | updateOrderItemsAction (via onValidate) | ✅ **Fix appliqué** : vérifie `res?.error` après await onValidate, setError + return early. Type onValidate = Promise<{ error?: string } \| void>. |
| `app/portal/orders/AddProductPanel.tsx` | addOrderItemAction (×2) | ✅ await, `if (result.error)` → setError, pas de redirect si error. |
| `app/portal/orders/AddOrderLinesModal.tsx` | addOrderLinesAction | ✅ await, `if (result.error)` → setError. |
| `app/portal/orders/OrderActions.tsx` | cancelOrderAction | ✅ await, `if (result.error)` → setError, pas de redirect si error. |

## Actions sans caller UI (référence)

- **deletePaymentAction**, **updatePaymentAction** : définies dans `admin-payments.ts` ; pas d’appel trouvé dans l’UI (facture détail utilise PaymentForm pour encaisser, pas ces actions directement). Si un composant les appelle à l’avenir, il devra respecter le même standard.
- **updateAccountingLockAction** : appelée uniquement par scripts (ex. E2E). Aucun formulaire UI ne modifie la date de clôture dans l’app actuelle.

## Fix appliqués

1. **OrderCard.tsx** : `handleValidate` ne lance plus d’erreur ; il retourne `{ error: result.error }` pour que OrderEditMode affiche le message. Évite les échecs silencieux et respecte le standard.
2. **OrderEditMode.tsx** : après `await onValidate(quantities)`, vérification de `res?.error` ; si présent, `setError(res.error)` et return (pas de fermeture du mode édition ni refresh).
3. **DeleteInvoiceButton.tsx** : après `if (result.error)`, ajout de `setIsDeleting(false)` et `return` pour ne pas enchaîner sur le bloc succès.
