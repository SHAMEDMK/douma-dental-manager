# Audit RBAC – Matrice et sécurité des rôles

**Date :** 2025-02-08  
**Objectif :** Audit RBAC complet et production-ready (sécurité rôles).

---

## 1. Matrice RBAC (Ressource × Action × Rôles × Enforcement × Statut)

Légende **Statut** : **OK** = guard/ownership en place ; **Weak** = protégé uniquement par layout ou partiel ; **Missing** = pas de check rôle/ownership sur la mutation ou la route.

| Ressource   | Action        | Rôles autorisés                          | Emplacement enforcement                    | Statut |
|------------|---------------|-------------------------------------------|-------------------------------------------|--------|
| **Orders** | READ (list)   | ADMIN, COMMERCIAL, COMPTABLE, MAGASINIER  | layout admin / comptable / magasinier      | OK     |
| Orders     | READ (mine)   | CLIENT                                    | layout portal + ownership dans actions    | OK     |
| Orders     | CREATE       | ADMIN, COMMERCIAL, CLIENT                 | Server Action: createOrderAction (role + forUserId) | OK |
| Orders     | UPDATE (items)| ADMIN, COMMERCIAL, MAGASINIER + CLIENT (own) | Server Action: updateOrderItemAction etc. (order.userId === session.id) | OK |
| Orders     | UPDATE (status)| ADMIN, MAGASINIER, COMMERCIAL            | admin-orders.ts getSession + role         | OK     |
| Orders     | SHIP/DELIVER  | ADMIN, MAGASINIER                        | admin-orders.ts + delivery layout          | OK     |
| Orders     | APPROVE      | ADMIN, COMMERCIAL                         | approveOrderAction role check             | OK     |
| Orders     | CANCEL       | CLIENT (own), ADMIN/COMMERCIAL (via UI)   | cancelOrderAction order.userId === session.id | OK  |
| **Invoices** | READ       | ADMIN, COMPTABLE, MAGASINIER, COMMERCIAL, CLIENT (own) | Layout + API PDF ownership (invoice.order.userId) | OK |
| Invoices   | LOCK / PAY    | ADMIN, COMPTABLE                          | markInvoicePaid, deletePaymentAction      | OK     |
| Invoices   | DELETE       | ADMIN                                     | deleteInvoiceAction session.role === 'ADMIN' | OK  |
| **Payments** | READ       | ADMIN, COMPTABLE                          | layout + actions                           | OK     |
| Payments   | CREATE       | ADMIN, COMPTABLE                          | markInvoicePaid                            | OK     |
| Payments   | UPDATE/DELETE| ADMIN, COMPTABLE                          | admin-payments.ts                          | OK     |
| **Products** | READ (catalog) | Tous (portal) + ADMIN/COMMERCIAL/MAGASINIER | getAvailableProducts (ADMIN/COMMERCIAL pour clientId) | OK |
| Products   | CREATE/UPDATE/DELETE | ADMIN only                         | product.ts getSession + session.role === 'ADMIN' | OK |
| **Stock**  | READ          | ADMIN, MAGASINIER                        | getStockUnits role check                   | OK     |
| Stock      | UPDATE        | ADMIN, MAGASINIER                        | updateStock **sans check rôle en entrée**  | **Missing** |
| Stock      | ADJUST (legacy) | (stub, pas d’écriture réelle)           | adjustStock                                | Weak   |
| **Settings** | Company READ | Utilisé depuis admin/settings uniquement | getCompanySettingsAction **sans session** | **Weak** |
| Settings   | Company UPDATE | ADMIN only                              | updateCompanySettingsAction               | OK     |
| Settings   | Accounting lock | ADMIN only                              | updateAccountingLockAction                | OK     |
| Settings   | Admin (approval) | ADMIN only                             | admin-settings.ts                          | OK     |
| **Exports** | Orders/Invoices/Payments/Clients | ADMIN, COMPTABLE, MAGASINIER (selon route) | requireAdminAuth sur chaque route API     | OK     |
| **Backups** | CREATE/LIST/RESTORE | ADMIN only                          | requireAdminAuth(request, ['ADMIN'])       | OK     |
| **Audit**  | READ          | ADMIN only                               | audit page getSession + role               | OK     |
| **Portal CLIENT** | Orders/Invoices (own) | CLIENT + order.userId / invoice.order.userId | Actions + API PDF ownership               | OK     |
| **Delivery** | Assign / Confirm | ADMIN, MAGASINIER                      | delivery.ts + delivery layout             | OK     |
| **Users/Agents** | CRUD (invitations, comptable, commercial, livreurs) | ADMIN | admin.ts, delivery-agent.ts, user.ts fixUserTypeAction | OK |
| **Favorites** | Toggle/List  | Session requise (CLIENT en pratique)     | API getSession, pas de requireClientAuth  | Weak   |
| **Upload** | company-logo / product-image | ADMIN only                        | getSession + session.role !== 'ADMIN' → 401 | OK  |
| **PDF**    | Admin invoices | ADMIN, COMPTABLE, MAGASINIER            | getSession + role check                    | OK     |
| **PDF**    | Portal invoice/BL | CLIENT + ownership                    | getSession + role CLIENT + invoice.order.userId / order.userId | OK |

---

## 2. Audit technique

### A) Server Actions – mutations et check de rôle

Toute **mutation** (create/update/delete/transaction) doit avoir un `getSession()` puis un check explicite sur `session.role` (ou ownership pour CLIENT).

| Fichier / fonction | Écriture DB | getSession + role / ownership | Statut |
|--------------------|-------------|-------------------------------|--------|
| admin-orders.ts (updateOrderStatus, approveOrderAction, updateDeliveryInfo*, markOrderShippedAction, reassignDeliveryAgentAction, deliverOrderAction, markOrderDeliveredAction, markInvoicePaid, createDeliveryNoteAction, generateDeliveryNoteAction) | Oui | Oui (ADMIN, COMMERCIAL, MAGASINIER, ou ADMIN+COMPTABLE pour markInvoicePaid) | OK |
| admin-payments.ts (deletePaymentAction, updatePaymentAction, deleteInvoiceAction) | Oui | Oui (ADMIN, COMPTABLE ou ADMIN seul pour deleteInvoice) | OK |
| order.ts (createOrderAction, updateOrderItemAction, updateOrderItemsAction, addItemsToOrderAction, addOrderItemAction, addOrderLinesAction, cancelOrderAction) | Oui | Session + ownership (order.userId === session.id) pour les actions client ; role ADMIN/COMMERCIAL pour forUserId | OK |
| company-settings.ts (updateCompanySettingsAction, updateAccountingLockAction) | Oui | session.role === 'ADMIN' | OK |
| company-settings.ts getCompanySettingsAction | Read + possible create default | **Aucun** getSession | **Weak** (création default si absent) |
| product.ts (toutes mutations CRUD produits/variantes/options) | Oui | session.role === 'ADMIN' | OK |
| stock.ts **updateStock** | Oui (product/variant update + StockMovement) | **Aucun check en entrée** ; getSession uniquement après tx pour audit | **Missing** |
| stock.ts adjustStock | Stub (transaction sans update réel) | Aucun | **Weak** |
| stock.ts getStockUnits | Read | session.role ADMIN ou MAGASINIER | OK |
| admin-settings.ts (getAdminSettingsAction, updateAdminSettingsAction) | Read + upsert / Update | session.role === 'ADMIN' | OK |
| user.ts (updateMyProfileAction, fixUserTypeAction) | Oui | Session + fixUserTypeAction ADMIN only | OK |
| client-request.ts (createClientRequestAction, updateRequestStatusAction) | Oui | create: session quelconque ; updateRequestStatus: ADMIN | OK |
| client.ts (updateClient, deleteClientAction) | Oui | ADMIN only | OK |
| invitation.ts createInvitation | Oui | ADMIN only | OK |
| invitation.ts acceptInvitation | Oui (user + invitation update) | Aucun (flux public par token) | OK (volontaire) |
| admin.ts (createInvitationAction, createAccountantAction, createCommercialAction, deleteAccountantAction) | Oui | ADMIN only | OK |
| delivery-agent.ts (createDeliveryAgentAction, deleteDeliveryAgentAction) | Oui | ADMIN only | OK |
| delivery.ts (assignOrderToMeAction, confirmDeliveryWithCodeAction) | Oui | ADMIN, MAGASINIER | OK |
| auth.ts (loginAction, requestPasswordReset, resetPasswordAction) | Oui (session / password) | Pas de rôle (flux public) | OK |

**Synthèse A :**  
- **Missing :** `stock.ts` → **updateStock** (mutation sans vérification de rôle en entrée).  
- **Weak :** `getCompanySettingsAction` (lecture + création default sans session), `adjustStock` (stub sans guard).

---

### B) API routes – guards requireAdminAuth / requireClientAuth

| Route | Méthode | Guard actuel | Statut |
|-------|---------|--------------|--------|
| /api/admin/export/clients | GET | requireAdminAuth(['ADMIN']) | OK |
| /api/admin/export/orders | GET | requireAdminAuth(['ADMIN','COMPTABLE','MAGASINIER']) | OK |
| /api/admin/export/invoices | GET | requireAdminAuth(['ADMIN','COMPTABLE']) | OK |
| /api/admin/export/payments | GET | requireAdminAuth(['ADMIN','COMPTABLE']) | OK |
| /api/admin/stats/alerts | GET | requireAdminAuth(['ADMIN','COMPTABLE','MAGASINIER']) | OK |
| /api/admin/backup | GET/POST/DELETE | requireAdminAuth(['ADMIN']) | OK |
| /api/pdf/admin/invoices/[id] | GET | getSession + role ADMIN/COMPTABLE/MAGASINIER | OK |
| /api/pdf/admin/orders/[id]/delivery-note | GET | getSession + role ADMIN/COMPTABLE/MAGASINIER | OK |
| /api/pdf/portal/invoices/[id] | GET | getSession + role CLIENT + **ownership** (invoice.order.userId === session.id) | OK |
| /api/pdf/portal/orders/[id]/delivery-note | GET | getSession + role CLIENT + **ownership** (order.userId === session.id) | OK |
| /api/delivery/orders-count | GET | getSession + MAGASINIER ou ADMIN | OK |
| /api/delivery/agents | GET | getSession + ADMIN ou MAGASINIER | OK |
| /api/favorites, /api/favorites/check | GET/POST/DELETE | getSession (pas de rôle explicite CLIENT) | **Weak** |
| /api/upload/company-logo | POST | getSession + session.role === 'ADMIN' | OK |
| /api/upload/product-image | POST | getSession + session.role === 'ADMIN' | OK |
| /api/auth/login, /api/auth/logout, /api/auth/callback | POST/GET | Pas de guard (volontaire) | OK |
| /api/health | GET | Optionnel Bearer token (healthcheck) | OK |

**Synthèse B :**  
- **Weak :** `/api/favorites` et `/api/favorites/check` : session requise mais pas de `requireClientAuth` (ou check rôle CLIENT explicite). À renforcer si l’usage est strictement CLIENT.

---

### C) Portal CLIENT – ownership (userId)

Toutes les actions et API utilisées par le portail client sur les commandes / factures doivent vérifier **order.userId === session.id** ou **invoice.order.userId === session.id**.

| Point d’entrée | Vérification ownership | Statut |
|----------------|------------------------|--------|
| order.ts createOrderAction | forUserId réservé ADMIN/COMMERCIAL ; sinon session.id | OK |
| order.ts updateOrderItemAction | order.userId !== session.id → throw | OK |
| order.ts updateOrderItemsAction | order.userId !== session.id → throw | OK |
| order.ts addItemsToOrderAction | order.userId !== session.id → throw | OK |
| order.ts addOrderItemAction | order.userId !== session.id → throw | OK |
| order.ts addOrderLinesAction | order.userId !== session.id → throw | OK |
| order.ts cancelOrderAction | orderForCheck.userId !== session.id → { error } + dans tx | OK |
| /api/pdf/portal/invoices/[id] | invoice.order.userId !== session.id → 403 | OK |
| /api/pdf/portal/orders/[id]/delivery-note | order.userId !== session.id → 403 | OK |

**Synthèse C :** Ownership correct sur les actions commandes et les PDF portal. Aucun gap identifié.

---

## 3. Liste des gaps

| # | Type | Détail | Sévérité |
|---|------|--------|----------|
| 1 | Server Action | **stock.ts updateStock** : mutation (product/variant update + StockMovement) sans `getSession()` ni check rôle en entrée. | **Missing** |
| 2 | Server Action | **company-settings.ts getCompanySettingsAction** : peut créer la ligne default si absente ; aucun check session. Protégé uniquement par layout admin. | **Weak** |
| 3 | Server Action | **stock.ts adjustStock** : stub avec transaction sans update réel ; aucun guard. À sécuriser si implémentation complétée. | **Weak** |
| 4 | API | **/api/favorites** et **/api/favorites/check** : session requise mais pas de vérification explicite du rôle CLIENT (requireClientAuth ou équivalent). | **Weak** |

Aucun gap sur :  
- Routes API admin (export, backup, stats) : guards OK.  
- PDF admin/portal : rôle + ownership OK.  
- Actions Orders/Invoices/Payments/Products/Admin/Delivery/User/Client/Invitation : rôle ou ownership OK.

---

## 4. Patches proposés (minimaux, sans changement fonctionnel silencieux)

### Gap 1 – updateStock : ajouter check rôle en entrée

**Fichier :** `app/actions/stock.ts`

**Modification :** En tout début de `updateStock`, après validation des paramètres (operation, quantity, reason), ajouter :

```ts
const session = await getSession()
if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
  throw new Error('Non autorisé')
}
```

Conserver le `getSession()` actuel après la transaction pour l’audit (logEntityUpdate). Retour : pas de `return { error }` actuel (la fonction est `Promise<void>` et throw). Si on souhaite rester cohérent avec le reste des actions, on peut faire retourner `Promise<{ error?: string }>` et en cas de refus `return { error: 'Non autorisé' }` au lieu de throw ; à décider selon la convention du projet (ici patch minimal = throw pour ne pas casser les appels existants qui n’attendent pas d’objet).

**Recommandation :** Ajouter le guard en entrée + garder le throw pour « Non autorisé » (aligné avec d’autres actions qui throw sur refus dans des transactions). Les appels à `updateStock` sont côté admin/magasinier ; si un appel existant ne gère pas l’exception, il faudra un retour `{ error }` côté formulaire.

**Alternative (retour explicite) :**  
Remplacer le throw par `return` si on standardise toutes les actions sur `{ error?: string }` :

```ts
const session = await getSession()
if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
  return { error: 'Non autorisé' }
}
// puis adapter la signature en Promise<{ error?: string } | void> et les appels UI
```

À appliquer de façon cohérente avec le reste de l’app (ex. admin-orders qui retourne `{ error }`).

---

### Gap 2 – getCompanySettingsAction : protéger la création default

**Fichier :** `app/actions/company-settings.ts`

**Modification :** Avant toute lecture/création, exiger un rôle autorisé (ex. ADMIN) pour éviter qu’un utilisateur non authentifié ou non autorisé ne déclenche la création de la ligne default :

```ts
export async function getCompanySettingsAction() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { settings: null, error: 'Non autorisé' }
  }
  try {
    const settings = await prisma.companySettings.findUnique({
      // ...
    })
    // reste inchangé, y compris create si !settings
    return { settings, error: null }
  } catch (error: any) {
    return { settings: null, error: error.message || '...' }
  }
}
```

**Impact :** Les pages qui appellent `getCompanySettingsAction` sont sous layout admin (settings/company). Vérifier que le layout exige déjà ADMIN (ou au moins un rôle autorisé) pour cette page ; si oui, pas de changement fonctionnel pour les utilisateurs légitimes.

---

### Gap 3 – adjustStock

**Recommandation :** Ne pas modifier pour l’instant (stub sans écriture réelle). Lors d’une future implémentation, ajouter le même guard que pour `updateStock` (ADMIN, MAGASINIER) en entrée.

---

### Gap 4 – API Favorites : renforcer le rôle

**Fichier :** `app/api/favorites/route.ts` et `app/api/favorites/check/route.ts`

**Option 1 – requireClientAuth :**  
Après rate limit, appeler `requireClientAuth(request)` ; si retour non null, renvoyer cette réponse. Ainsi seuls les CLIENT peuvent utiliser les favoris (si c’est le contrat métier).

**Option 2 – check explicite :**  
Garder `getSession()` et ajouter :

```ts
if (session.role !== 'CLIENT') {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}
```

Documenter dans le rapport : tout changement RBAC doit être listé (ex. « Favorites : réservé au rôle CLIENT »).

---

## 5. Tests E2E « forbidden » (au moins 3 scénarios)

À ajouter dans le projet Playwright (ou équivalent) pour les modules critiques :

1. **Admin export sans auth / mauvais rôle**  
   - Requête GET vers `/api/admin/export/orders` (ou clients) sans cookie de session → 401.  
   - Requête avec session COMPTABLE vers `/api/admin/export/clients` (ADMIN only) → 403.  
   - Vérifier que le corps de la réponse contient un message d’erreur (ex. « Non authentifié » / « Accès refusé »).

2. **Portal : accès PDF facture / BL d’un autre client**  
   - Connexion en tant que CLIENT A.  
   - Appel GET `/api/pdf/portal/invoices/{invoiceId}` où `invoiceId` appartient à un autre utilisateur (CLIENT B).  
   - Attendu : 403 (ownership).  
   - Idem pour `/api/pdf/portal/orders/{orderId}/delivery-note` avec une commande d’un autre client → 403.

3. **Server Action refus (rôle)**  
   - Connexion en tant que CLIENT (ou COMPTABLE selon le cas).  
   - Déclencher une action réservée à ADMIN uniquement (ex. suppression facture, export clients, ou après patch : updateStock / getCompanySettings sans être ADMIN).  
   - Via l’UI ou un appel direct à l’action : vérifier que le résultat est `{ error: '...' }` et qu’aucune donnée n’est modifiée (pas de suppression, pas d’export, pas de mise à jour stock).

4. **Delivery / Magasinier**  
   - Connexion en tant que CLIENT.  
   - Tenter d’accéder à une page ou API réservée aux rôles MAGASINIER/ADMIN (ex. `/delivery`, ou API delivery/orders-count).  
   - Attendu : redirection vers login ou 401/403 selon l’entrée (page vs API).

Ces scénarios restent **déterministes** (pas de Date.now pour les décisions d’accès) et **ne dépendent pas d’un état DB réel** au-delà des fixtures (utilisateurs/rôles et une commande/facture par client).

**Fichier ajouté :** `tests/e2e/rbac-forbidden.spec.ts`  
- No-auth GET /api/admin/export/orders → 401  
- COMPTABLE GET /api/admin/export/clients → 403  
- COMPTABLE GET /api/pdf/portal/invoices/[id] → 403 (rôle CLIENT requis)  
- CLIENT accédant à /admin/stock → redirection (layout)

---

## 6. Résumé des changements RBAC à appliquer

| Changement | Fichier | Description |
|------------|---------|-------------|
| Guard updateStock | app/actions/stock.ts | Ajouter getSession() + check ADMIN ou MAGASINIER en début de updateStock. |
| Guard getCompanySettingsAction | app/actions/company-settings.ts | Ajouter getSession() + check ADMIN avant lecture/création. |
| (Optionnel) Favorites API | app/api/favorites/route.ts, check/route.ts | Utiliser requireClientAuth ou check session.role === 'CLIENT'. |
| E2E forbidden | tests/e2e/ | Ajouter au moins 3 scénarios : export no-auth/403, portal PDF ownership 403, action refusée par rôle. |

Aucun changement fonctionnel silencieux : chaque ajout de guard ou de check est listé ci-dessus. Les Server Actions continuent de retourner `{ error }` en cas de refus lorsque c’est déjà le contrat (sinon throw documenté). Comportement fail-closed conservé (refus par défaut en cas de doute).
