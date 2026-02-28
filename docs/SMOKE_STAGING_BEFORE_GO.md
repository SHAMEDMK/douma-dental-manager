# Smoke staging avant go-live (20–30 min)

Checklist exécutable sur l’environnement **staging** avant le jour J. Objectif : valider que la build est prête pour la production (déterministe, sécurisée, documentée). Aucun secret dans ce document ; tout est configurable via variables d’environnement.

**Référence :** `docs/GO_LIVE_PLAN_MAR_2026.md` · **Jour J :** `docs/SMOKE_PROD_GO_LIVE.md`

---

## Prérequis (staging)

- [ ] **E2E_SEED=0** en staging (pas de fixtures E2E exposées : `/api/e2e/fixtures/*` doivent répondre **404**).
- [ ] **EXPORT_MAX_ROWS=1** (temporaire) pour tester le garde-fou 413 sur les exports (optionnel mais recommandé pour cette checklist).
- [ ] **DB staging** à jour (restaurée ou migrée) ; `DATABASE_URL` et `DIRECT_URL` pointent vers la base staging.
- [ ] Application staging déployée et accessible (URL de staging connue).

---

## Étapes (ordre recommandé)

### 1) Migrations

```bash
# Depuis la racine du projet, avec .env ou .env.staging pointant vers la DB staging
npx prisma migrate deploy
```

- [ ] Sortie 0, pas d’erreur Prisma. Si des migrations sont appliquées, vérifier qu’aucune n’est cassante pour l’app actuelle.

### 2) AuditLog immuable (trigger en base)

```bash
npx tsx scripts/verify-auditlog-immutable.ts
```

- [ ] Sortie : `OK: AuditLog est bien immuable (UPDATE et DELETE refusés par le trigger).` et **exit 0**.

### 3) 401 / 403 (RBAC + ownership)

- [ ] **Sans session** : `GET /api/admin/export/orders` → **401** + body JSON `{ "error": "Non authentifié" }`.
- [ ] **Rôle insuffisant** : connecté en COMPTABLE, `GET /api/admin/export/clients` → **403** + `{ "error": "Accès refusé" }`.
- [ ] **Ownership** : (si E2E fixtures disponibles en local uniquement) clientB accédant à la facture PDF de clientA → **403** + `{ "error": "Accès refusé" }`.  
  En staging avec E2E_SEED=0, les fixtures sont 404 ; ce point peut être validé en E2E local avec `E2E_SEED=1` ou le jour J via E2E smoke.

**Option :** lancer les tests E2E RBAC/ownership (`tests/e2e/rbac-forbidden.spec.ts`, `tests/e2e/portal-ownership.spec.ts`) contre l’URL staging en surchargeant `baseURL` (voir docs E2E).

### 4) Clôture comptable (1 test rapide)

- [ ] Avec une date de clôture définie (`accountingLockedUntil`), tenter une action interdite (ex. enregistrer un paiement sur une facture dont la date ≤ clôture) → action refusée avec message explicite (ex. période clôturée).  
  Vérifier que l’UI ou l’API ne permet pas de modifier une entité en période clôturée.

### 5) Invoice lock

- [ ] **Annulation refusée** : pour une commande dont la facture est **PARTIAL** (au moins un paiement), tenter d’annuler la commande (côté client ou admin selon le flux) → message du type **« Cette commande n'est plus modifiable »** (ou équivalent), statut inchangé.
- [ ] **Paiement après livraison autorisé** : une commande livrée (DELIVERED) avec facture partielle peut recevoir un paiement (bouton Encaisser) → succès « Paiement enregistré » (ou équivalent).

### 6) Export guard 413 (EXPORT_MAX_ROWS=1)

- [ ] Avec **EXPORT_MAX_ROWS=1** sur staging : en tant qu’admin, déclencher un export (ex. commandes) → **413** + body JSON contenant un message du type **« Export refusé : trop de lignes (X > Y). Réduisez la période ou contactez l'administrateur. »**.
- [ ] Vérifier en UI que le message est affiché (si l’app affiche l’erreur d’export à l’utilisateur).

Après la checklist, remettre **EXPORT_MAX_ROWS** à une valeur raisonnable (ex. 20000) ou la retirer pour la prod.

### 7) PDF admin + PDF portal

- [ ] **Admin** : générer un PDF facture (admin) → **200**, téléchargement OK, contenu lisible (montants, TVA).
- [ ] **Portal** : en tant que client, générer le PDF de sa propre facture → **200**. En tant qu’autre client (ownership), accès à la facture d’un autre → **403** « Accès refusé » (ou 404 selon convention).

### 8) Dashboards / listes

- [ ] **Admin** : ouvrir dashboard et listes (commandes, factures, paiements). Vérifier temps de chargement raisonnable (< 5 s en staging). Si pagination en place, vérifier page 2.
- [ ] Pas d’erreur 5xx en console / logs pendant la navigation.

---

## Critères GO / NO-GO (staging)

**GO** (on considère staging prêt pour le go-live) :

- Migrate deploy OK.
- AuditLog immuable vérifié (script exit 0).
- 401 sur export sans auth ; 403 sur export clients en COMPTABLE.
- Clôture comptable et invoice lock se comportent comme attendu (au moins 1 test rapide chacun).
- Export 413 vérifié si EXPORT_MAX_ROWS=1.
- PDF admin et portal OK ; ownership portal → 403 (ou 404).
- Dashboards/listes chargent sans 5xx.

**NO-GO** :

- Échec migrate deploy ou script AuditLog.
- 401/403 absents ou messages incohérents.
- Export sans limite alors que EXPORT_MAX_ROWS=1 (guard absent ou cassé).
- PDF en 500 ou ownership non respecté.
- Régression bloquante sur un flux critique.

En cas de NO-GO : corriger et relancer la checklist avant de valider le go-live.

---

## Automation optionnelle

- **Script non-UI :** `npx tsx scripts/smoke-runner.ts` (avec `BASE_URL` pointant vers staging). Voir `docs/GO_LIVE_PLAN_MAR_2026.md` section Automation.
- **E2E go/no-go :** `npm run test:e2e -- tests/e2e/smoke-go-live.spec.ts` (contre staging en surchargeant `baseURL` si besoin).
