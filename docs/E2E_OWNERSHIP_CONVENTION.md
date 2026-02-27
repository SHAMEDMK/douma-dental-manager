# Convention ownership (CLIENT) – 404 vs 403

Pour les ressources du portail client (commandes, factures, BL, PDF), la convention suivante est utilisée quand un CLIENT tente d’accéder à une ressource qui ne lui appartient pas.

## Règle

| Contexte | Réponse | Raison |
|----------|---------|--------|
| **Routes API** (PDF, exports, etc.) | **403** + `{ error: "Accès refusé" }` | Aligné sur les guards globaux (requireAdminAuth / rôle). Le client est authentifié mais n’a pas le droit sur cette ressource. |
| **Pages portail** (SSR) | **404** `notFound()` | Ne pas révéler l’existence de la ressource : même message qu’une ressource inexistante. |
| **Server actions** (mutations) | **200** + `{ error: "Non authentifié" }` ou `{ error: "Accès refusé" }` | Même messages que l’API : pas de session = "Non authentifié", rôle/ownership = "Accès refusé". |

## Cohérence

- **API** : toujours **403** + `"Accès refusé"` pour un accès interdit (rôle ou ownership) ; **401** + `"Non authentifié"` si pas de session.
- **Pages** : toujours **404** pour une ressource inexistante ou non accessible (ownership).
- **Actions** : `{ error: "Non authentifié" }` si pas de session, `{ error: "Accès refusé" }` si rôle ou ownership insuffisant (aligné sur lib/auth-errors.ts).

## Tests E2E

Les tests d’ownership (ex. `portal-ownership.spec.ts`) utilisent :

- **clientA** = `client@dental.com` (commande E2E + facture INV-E2E-0001).
- **clientB** = `clientB@dental.com` (aucune ressource partagée avec clientA).

Les fixtures E2E (`/api/e2e/fixtures/clientA-order-id`, `clientA-invoice-id`, `invoice-id`) renvoient les IDs des ressources de clientA / facture E2E ; les tests se connectent en clientB et vérifient 403 (API) ou 404 (page).

**Sécurité :** les routes `/api/e2e/fixtures/*` sont **masquées (404) hors E2E** : le serveur ne répond avec un corps valide que si `E2E_SEED=1`. Sinon, toutes les fixtures retournent 404 (pas d’exposition des IDs en prod ou en dev sans E2E). Voir `tests/e2e/e2e-fixtures-guard.spec.ts`.
