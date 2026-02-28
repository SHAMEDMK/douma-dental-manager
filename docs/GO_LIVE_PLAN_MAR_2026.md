# Plan Go-Live production — Mars 2026 (cible Vercel)

Plan complet et actionnable pour la mise en production sur **Vercel (serverless)** avec **base de données managée PostgreSQL**. Aucun secret dans ce document ; tout est configuré via variables d’environnement Vercel.

**Références croisées :**  
`docs/CHECKLIST_PRODUCTION_VERCEL.md` · `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md` · `docs/VERIFICATIONS_IMMEDIATES_POST_GO.md` · `docs/CHECKLIST_POST_GO_LIVE.md` · `docs/RESTAURATION_BACKUP.md`

---

## Smoke staging et prod (checklists + automation)

- **Smoke staging (avant J)** : checklist exécutable 20–30 min → **docs/SMOKE_STAGING_BEFORE_GO.md** (prérequis, migrate, AuditLog, 401/403, clôture comptable, invoice lock, export 413, PDF, dashboards, critères GO/NO-GO).
- **Smoke prod (Jour J)** : checklist jour du go-live → **docs/SMOKE_PROD_GO_LIVE.md** (variables prod sans valeurs, ordre exact migrate → deploy → smoke 5 min → vérifs 15 min, rollback, observabilité).
- **Automation** : script non-UI **`scripts/smoke-runner.ts`** (checks sans credentials). Lancer avec `BASE_URL=<url>` (ex. staging ou prod) :
  ```bash
  BASE_URL=https://staging.example.com npx tsx scripts/smoke-runner.ts
  BASE_URL=http://127.0.0.1:3000 npx tsx scripts/smoke-runner.ts
  ```
  Vérifie : `GET /api/health` → 200 (ou 503/401 selon config), `GET /api/admin/export/orders` sans auth → 401 + « Non authentifié », `GET /api/e2e/fixtures/clientA-invoice-id` → 404. Les checks nécessitant session (export 413 avec admin) restent en manuel ou E2E.
- **E2E go/no-go** : **`tests/e2e/smoke-go-live.spec.ts`**. Lancer avec `npm run test:e2e -- --project=smoke-go-live` (ou cibler le fichier). Utilise `baseURL` Playwright ; utilise storageState admin, client, clientB selon les scénarios (admin /admin 200, no-auth export 401, clientB PDF clientA 403, paiement « Paiement enregistré », invoice lock « Cette commande n'est plus modifiable », export 413 si applicable).

---

## 1) Pré-go-live (J-7 à J-1)

### 1.1 Freeze staging et validation

| J | Action | Responsable |
|---|--------|-------------|
| **J-7** | Branche release créée à partir de `main`. Staging déployé sur cette branche et **freeze fonctionnel** : plus de feature merge directe sur la branche de release. | Tech lead |
| **J-5** | Checklist sécurité production exécutée sur staging (voir 1.2). Corrections si besoin. | Tech / Ops |
| **J-3** | Test de restauration backup DB (voir 1.3) sur une copie staging ou DB de test. Documenter le temps et la procédure. | Ops |
| **J-2** | Vérification finale des variables d’environnement prod, domaines, SSL (voir 1.4). | Tech lead |
| **J-1** | Vérification migrations prêtes + compatibilité rollback (voir 1.5). Dernier run E2E sur staging ; exécuter **docs/SMOKE_STAGING_BEFORE_GO.md** (ou au moins `npx tsx scripts/smoke-runner.ts` avec BASE_URL=staging + E2E smoke-go-live). | Tech lead |

### 1.2 Checklist sécurité (staging puis prod)

- [ ] Aucun secret en dur dans le repo ; tout en variables Vercel (Production).
- [ ] Routes admin sans auth → **401** ou redirection login.
- [ ] Accès admin par un compte **CLIENT** → **403**.
- [ ] Rate limit actif sur login et PDF (vérifier en conditions réelles ou staging).
- [ ] Headers de sécurité (CSP, etc.) conformes à la checklist production.
- [ ] Comptes de test / mots de passe par défaut désactivés ou changés en prod.

### 1.3 Test restore backup DB

- [ ] Créer un backup (manuel ou automatique) de la DB staging ou prod de test.
- [ ] Restaurer ce backup sur une DB temporaire ou une copie staging (procédure : `docs/RESTAURATION_BACKUP.md` ; pour PostgreSQL, utiliser les outils du fournisseur — Neon, Supabase, etc.).
- [ ] Lancer un smoke minimal après restore : login admin, liste commandes, génération d’un PDF.
- [ ] Noter : durée du restore, éventuels écarts par rapport à la doc.

### 1.4 Vérification env vars prod, domaines, SSL

- [ ] **Vercel → Project → Settings → Environment Variables** : toutes les variables **Production** sont définies (DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL / APP_URL, rate limit, Resend si utilisé, etc.). Aucune variable de staging en Production.
- [ ] **Domaine** : domaine de prod configuré (ex. `app.entreprise.com`), DNS pointant vers Vercel.
- [ ] **SSL** : certificat Vercel actif (HTTPS) pour le domaine prod.
- [ ] **DB** : DATABASE_URL = URL **pooled** ; DIRECT_URL = URL **sans pooling** (migrations). SSL activé si requis (`sslmode=require`).

### 1.5 Migrations prêtes + compatibilité rollback

- [ ] Toutes les migrations à déployer sont **commitées** dans `prisma/migrations/` (jamais `db push` en prod).
- [ ] `npx prisma migrate status` (avec DIRECT_URL prod ou copie) : état “synchrone” ou migrations en attente identifiées.
- [ ] **Compatibilité rollback** :  
  - Si les migrations sont **additives** (nouvelles colonnes nullable, nouveaux index, nouvelles tables) : rollback app = revenir au déploiement précédent ; la DB reste compatible avec l’ancienne version.  
  - Si une migration est **cassante** (suppression colonne, changement type, contrainte NOT NULL sans défaut) : préparer une **migration forward corrective** (voir section 3) avant le go-live, ou reporter la migration cassante.

---

## 2) Jour J — Fenêtre de déploiement

### 2.1 Ordre exact des opérations

| Étape | Action | Durée indicative |
|-------|--------|-------------------|
| **1** | **Migrate deploy** : depuis une machine de confiance (ou pipeline CI), exécuter `npx prisma migrate deploy` avec les variables **Production** (DIRECT_URL). Vérifier succès (sortie 0, pas d’erreur Prisma). | 1–3 min |
| **2** | **Deploy Vercel** : push sur la branche connectée (ex. `main`) ou déclencher le déploiement depuis le dashboard. Attendre **Build Completed** et **Ready**. | 3–8 min |
| **3** | **Smoke 5 min** : exécuter la checklist smoke (voir 2.3). Option : `BASE_URL=<url-prod> npx tsx scripts/smoke-runner.ts` puis vérifications manuelles (login, RBAC, commande, PDF). | 5 min |
| **4** | **Vérifications 15 min** : exécuter les vérifications immédiates (voir 2.4) ; détail **docs/SMOKE_PROD_GO_LIVE.md**. | 15 min |

**Règle :** ne pas lancer un second `migrate deploy` en parallèle (une seule exécution par déploiement). Ne pas faire de déploiement Vercel **avant** que la migration ait réussi.

### 2.2 Rôles (qui fait quoi)

| Rôle | Responsabilités |
|------|------------------|
| **Tech lead / Release manager** | Ordre des opérations, décision GO/NO-GO, coordination. |
| **Ops / DevOps** | Exécution `migrate deploy`, vérification DB (connexions, backups). |
| **Développeur** | Déploiement Vercel (push ou redeploy), smoke manuel ou scripté. |
| **Product / Métier** | Validation fonctionnelle post-smoke (1 commande test, 1 PDF, rôles). |

Une même personne peut cumuler plusieurs rôles ; l’important est que chaque action soit assignée.

### 2.3 Smoke (5 min)

- [ ] **Santé** : `GET /api/health` → 200.
- [ ] **Login** : connexion admin (compte prod) → redirection dashboard ou page d’accueil admin.
- [ ] **RBAC** : en tant que client, tentative d’accès à une URL admin → 403 ou équivalent.
- [ ] **Une commande** : ouvrir une commande existante (ou en créer une), vérifier affichage et statut.
- [ ] **Un PDF** : générer une facture PDF (admin) → téléchargement et ouverture OK.

### 2.4 Vérifications 15 min (détail)

Suivre **docs/VERIFICATIONS_IMMEDIATES_POST_GO.md** :

- [ ] Confirmer que l’URL et la DB sont bien **Production** (pas de mélange staging).
- [ ] Auth : non connecté → `/admin` et `/api/admin/...` → 401 ou login.
- [ ] Rôles : client → page admin → 403.
- [ ] Rate limit : déclencher (ex. plusieurs login ratés) et vérifier comportement.
- [ ] Flux métier : 1 commande test (création ou transition de statut, mouvement de stock, facture, audit log).
- [ ] PDF : facture PDF générée, montants et mise en page cohérents.

### 2.5 Critères GO / NO-GO

**GO** (on considère le go-live réussi pour la fenêtre) :

- Migrate deploy terminé sans erreur.
- Build Vercel en succès, déploiement actif.
- Smoke 5 min : tous les points cochés.
- Aucune régression bloquante identifiée pendant les 15 min de vérifications.

**NO-GO** (rollback ou correction immédiate) :

- Échec de `migrate deploy` (erreur Prisma, conflit de schéma).
- Build Vercel en échec répété.
- Smoke : health check en échec, login impossible, ou PDF en 500.
- Incident critique identifié (données incohérentes, impossibilité d’accès admin sécurisé).

En cas de NO-GO : appliquer la procédure de rollback (section 3) et reporter le go-live après correction.

---

## 3) Rollback

### 3.1 Rollback Vercel (Promote previous)

- [ ] **Vercel Dashboard** → **Deployments**.
- [ ] Repérer le **déploiement précédent** (avant le go-live) en état “Ready”.
- [ ] **Promote to Production** (ou “…” → Promote) sur ce déploiement.
- [ ] Vérifier que le trafic pointe à nouveau sur l’ancienne version (URL prod, smoke rapide).

**Effet :** le code et la config de build reviennent à la version précédente. Les **données** et la **base** ne sont pas modifiées par cette action.

### 3.2 Stratégie DB si migration cassante

- **Migrations additives uniquement au go-live** : pas d’action DB pour le rollback ; l’ancienne app reste compatible avec la DB déjà migrée.
- **Si une migration “cassante” a déjà été exécutée** (ex. colonne supprimée, contrainte ajoutée) et que l’on rollback l’app :
  - L’ancienne version de l’app peut **casser** (ex. elle lit une colonne supprimée).
  - **Stratégie recommandée :** ne pas faire de migration cassante le jour J. Si c’est déjà fait : **migration forward corrective** — créer une nouvelle migration qui remet la DB dans un état lisible par l’ancienne app (ex. rajouter la colonne nullable, ou supprimer la contrainte). Puis redéployer l’ancienne app. À documenter au cas par cas.
- **En résumé :** privilégier des migrations non cassantes pour le go-live ; en cas d’erreur, rollback Vercel + si besoin une migration corrective forward (pas de “migrate resolve” rollback automatique en prod sans procédure validée).

### 3.3 Incidents paiement / exports

- **Paiements** : en cas d’erreur 500 ou timeout sur une action de paiement (enregistrement, marquer facture payée), vérifier les logs Vercel et les erreurs éventuelles liées à la clôture comptable (`ACCOUNTING_CLOSE*`). Si la période est clôturée : informer l’utilisateur (modification interdite) ; pas de rollback DB pour “déverrouiller” sans validation métier/comptable.
- **Exports** : si timeout ou 500 sur un export (commandes, factures, clients), limiter la taille de l’export (pagination côté métier) ou reporter l’export. Option long terme : streaming / job asynchrone (voir `docs/PERF_AUDIT.md`). Rollback app possible si le bug vient du déploiement ; pas de rollback DB pour un simple timeout d’export.

---

## 4) Monitoring / alerting

### 4.1 Logs Vercel

- **Vercel → Project → Logs** : filtrer sur **Production**.
- Consulter régulièrement (J+1, J+7) : erreurs 5xx, timeouts, messages Prisma (connexion, pool, timeout).
- **Recommandation** : définir une fréquence de revue (quotidienne la première semaine, puis hebdo) et documenter où regarder (Runtime Logs, Build Logs).

### 4.2 Erreurs 401 / 403 (RBAC)

- **401** : accès non authentifié (normal sur `/admin` ou API admin sans cookie/token). Un **spike** de 401 peut indiquer des liens mal configurés, des bots, ou des utilisateurs déconnectés ; pas forcément un bug.
- **403** : accès refusé (rôle insuffisant). Un **spike** de 403 après le go-live peut indiquer : confusion de rôles, liens partagés vers des pages admin, ou un problème de permission. À investiguer si le volume est anormal (alerte manuelle ou dashboard).
- **Action** : dans les logs, rechercher les chemins et les rôles associés aux 403 ; vérifier que les parcours “interdits” (ex. client → admin) renvoient bien 403 et sont documentés (ex. `tests/e2e/rbac-forbidden.spec.ts`).

### 4.3 Erreurs ACCOUNTING_CLOSE / ACCOUNTING_CLOSED / date invalide

- Les actions qui modifient factures/paiements en période clôturée renvoient une erreur métier (ex. `ACCOUNTING_CLOSED_ERROR_MESSAGE` ou équivalent). En logs, rechercher aussi les erreurs de type **ACCOUNTING_CLOSE_INVALID_DATE** ou **AccountingDateInvalidError** (date invalide côté clôture comptable).
- **Action** : si ces erreurs apparaissent en prod, vérifier que la date de clôture (`accountingLockedUntil`) et les dates des entités sont cohérentes (UTC, pas de timezone incorrecte). Document : `docs/AUDIT_ACCOUNTING_CLOSE.md`.

### 4.4 Volume exports + timeouts

- Les exports (commandes, factures, clients, paiements) chargent aujourd’hui le jeu de données en mémoire (`docs/PERF_AUDIT.md`). Gros volumes = risque de **timeout** (limites Vercel) ou pic mémoire.
- **Monitoring** : surveiller les requêtes vers `/api/admin/export/*` (durée, statut 200 vs 500/timeout).
- **Alerte** : si timeouts répétés ou plaintes utilisateurs, envisager pagination/streaming (PR3 du plan perf) et/ou limitation du périmètre d’export.

---

## 5) Post-go-live (J+1 / J+7)

### 5.1 Checklist opérations (J+1)

Suivre **docs/CHECKLIST_POST_GO_LIVE.md** (section J+1) :

- [ ] Santé technique : pas de failed deployment, pas de pics 5xx/timeouts dans les logs Vercel.
- [ ] Auth & sécurité : 401/403 et rate limit conformes.
- [ ] Flux métier : 2–3 commandes réelles (statut, stock, facture, audit logs).
- [ ] PDF : génération et impression OK.
- [ ] Backups : confirmer qu’un backup automatique a bien été pris ; planifier le test restore (J+7).

### 5.2 Revue audit logs + paiements (J+1 à J+7)

- [ ] Parcourir les **audit logs** (page admin) : vérifier que les actions sensibles (création/modification commande, facture, paiement, connexion) sont tracées avec acteur/rôle/entité.
- [ ] Vérifier quelques **paiements** réels : enregistrement, lien facture, balance à jour. Pas d’anomalie (doublon, montant incohérent).

### 5.3 Backup / restore drill (J+7)

- [ ] **Restore** d’un backup prod (ou copie) vers un environnement de test (staging ou DB temporaire), selon la procédure du fournisseur DB et `docs/RESTAURATION_BACKUP.md` (PostgreSQL).
- [ ] Smoke sur la base restaurée : login admin, liste commandes, génération PDF.
- [ ] Documenter : durée du restore, éventuels écarts, propriétaire de la procédure.

### 5.4 Synthèse J+7

- [ ] Stabilité : revue des erreurs récurrentes (top 3) dans les logs.
- [ ] Performance : latence login, parcours commande, PDF, listes admin (voir `docs/PERF_AUDIT.md` si besoin).
- [ ] RBAC : 3–5 parcours “interdits” vérifiés (client → admin, etc.).
- [ ] Mise à jour des procédures : déploiement, checklist prod, env vars, et ce plan go-live si des ajustements sont identifiés.

---

## Résumé des livrables et références

| Livrable | Emplacement |
|----------|-------------|
| Plan go-live (ce document) | `docs/GO_LIVE_PLAN_MAR_2026.md` |
| Smoke staging (avant J) | `docs/SMOKE_STAGING_BEFORE_GO.md` |
| Smoke prod (Jour J) | `docs/SMOKE_PROD_GO_LIVE.md` |
| Script smoke non-UI | `scripts/smoke-runner.ts` |
| E2E smoke go/no-go | `tests/e2e/smoke-go-live.spec.ts` |
| Checklist production Vercel | `docs/CHECKLIST_PRODUCTION_VERCEL.md` |
| Procédure déploiement (ordre des actions) | `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md` |
| Vérifications immédiates post-go | `docs/VERIFICATIONS_IMMEDIATES_POST_GO.md` |
| Post-go-live J+1 / J+7 | `docs/CHECKLIST_POST_GO_LIVE.md` |
| Restauration backup | `docs/RESTAURATION_BACKUP.md` |
| Audit clôture comptable | `docs/AUDIT_ACCOUNTING_CLOSE.md` |
| Audit performance (exports, index) | `docs/PERF_AUDIT.md` |
