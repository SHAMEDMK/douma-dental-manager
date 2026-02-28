# Vérifications immédiates après mise en ligne (15 min)

À faire juste après le premier déploiement en production. Objectif : s’assurer que la prod est saine et sécurisée.

---

## Phase 1 — Vérifications immédiates (maintenant)

### 1. Confirmer que c’est bien la PROD

- **URL** = domaine final (pas une URL preview `.vercel.app` de staging).
- **Données** = prod (clients / commandes réels ou base propre), pas de mélange avec staging.
- Si doute : dans **Neon**, vérifier le nom du projet/base ; dans **Vercel**, vérifier que `DATABASE_URL` (Production) ≠ staging.

### 2. Base de données (Neon)

- [ ] La base prod est active.
- [ ] Les tables existent (users, orders, invoices, audit_logs, etc.).
- [ ] Les migrations ont été appliquées une seule fois.
- [ ] Connexions OK (pas de saturation côté serverless).

### 3. Sécurité (indispensable)

**A. Accès non autorisé**

- Navigateur **sans être connecté** → ouvrir `/admin` et une URL du type `/api/admin/...`.
- **Attendu :** 401 ou redirection vers la page de login.

**B. Rôles**

- Se connecter en **CLIENT** → tenter d’ouvrir une page admin.
- **Attendu :** 403 (accès interdit).

**C. Rate limit**

- Tenter 10–11 connexions login ratées, ou plusieurs requêtes PDF.
- **Attendu :** rate limit déclenché (message ou blocage).

### 4. Flux métier (1 commande test)

- [ ] Création d’une commande OK.
- [ ] Changement de statut (ex. CONFIRMED → PREPARING).
- [ ] Mouvement de stock créé.
- [ ] Facture générée : HT / TVA / TTC cohérents.
- [ ] Audit log visible (qui, quoi, quand).

### 5. PDF

- [ ] Générer une facture PDF → télécharger → ouvrir.
- [ ] Vérifier montants, TVA, mise en page ; pas d’erreur 500.

---

## Phase 2 — Sécurisation (aujourd’hui)

- [ ] **Mot de passe admin** : connecte-toi en admin, change le mot de passe (ou utilise le script `db:reset-admin-password` avec un mot de passe fort). Supprime tout compte admin inutile.
- [ ] **Backups Neon** : backups automatiques activés, rétention 7–30 jours. Savoir comment restaurer (au moins en théorie ; test restore réel à J+7).
- [ ] **Variables Vercel** (Production) : DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_PASSWORD, APP_URL / NEXT_PUBLIC_APP_URL, variables rate limit. Aucune variable de staging.

---

## Phase 3 — J+1

- Ne rien modifier pendant quelques heures, sauf bug critique.
- **Demain** : suivre `docs/CHECKLIST_POST_GO_LIVE.md` (section J+1) — logs Vercel, erreurs Prisma, connexions Neon, 2–3 commandes réelles.

---

**Références :** `docs/CHECKLIST_PRODUCTION_VERCEL.md`, `docs/CHECKLIST_POST_GO_LIVE.md`, `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`.
