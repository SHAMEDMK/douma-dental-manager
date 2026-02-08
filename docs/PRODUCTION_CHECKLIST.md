# Checklist « Go Production » – Tactac

Document unique pour **passer en production** sans improviser. À utiliser par un lead tech, un CTO ou un prestataire qui reprend le projet.

**Dernière mise à jour :** Enrichissement sections 1–6, encadré DB prod, fréquence/rétention backups, sécurité HTTP, logs, communication, post-déploiement, questions clés avant Go.

Complémentaire à :
- **`PRODUCTION.md`** (à la racine) : prérequis, build, démarrage, reverse proxy
- **`docs/CHECKLIST_PREPRODUCTION.md`** : checklist détaillée pré-déploiement
- **`docs/PLAN_PREPARATION_PRODUCTION.md`** : plan d’action par phase (sécurité, perf, CI)
- **`docs/CHECKLIST_PRODUCTION_VERCEL.md`** : checklist exacte cible Vercel (env, DB, migrations, backups, headers, rate limit, smoke)

---

## 1. Séparation des environnements (obligatoire)

### 1.1 Trois environnements recommandés

| Environnement | Rôle | Base de données | Usage |
|---------------|------|-----------------|--------|
| **DEV** | Développement local | SQLite (`file:./dev.db`) | Dev, tests manuels, E2E |
| **STAGING** (optionnel) | Pré-production | PostgreSQL dédié | Validation avant prod, démo |
| **PROD** | Production | PostgreSQL dédié | Utilisateurs réels |

### 1.2 Variables d’environnement par environnement

**DEV** (`.env` ou `.env.local`, jamais commité) :
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-min-32-bytes-change-in-prod"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_PASSWORD="…"  # optionnel pour seed
```

**PROD** (`.env.production` sur le serveur, jamais dans Git) :
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="…"   # openssl rand -base64 32, unique par environnement
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
ADMIN_PASSWORD="…"  # fort, pour le seed initial uniquement
# Emails (Resend) — obligatoire pour invitation / reset password en prod
RESEND_API_KEY="re_…"
```

**Règles :**
- **Secrets** : en prod, un secret manager (Vault, AWS Secrets Manager, Doppler) peut remplacer les fichiers `.env` pour les secrets sensibles (optionnel mais recommandé à grande échelle).
- **JWT_SECRET** : différent en DEV / STAGING / PROD ; ≥ 32 octets ; jamais commité.
- **DB** : SQLite en dev uniquement ; PostgreSQL obligatoire en prod (voir `PRODUCTION.md`).
- **Email** : en dev, les mails peuvent être loggés ou désactivés ; en prod, config SMTP réelle (voir `lib/email.ts`).

### 1.3 Checklist « Environnements »

- [x] Fichier `.env.production.example` à jour (sans valeurs réelles)
- [x] `.env*` dans `.gitignore` ; aucun secret dans le dépôt (`.env`, `.env.production`, `.env.*.local`)
- [ ] En prod : `DATABASE_URL` pointe vers PostgreSQL (pas SQLite)
- [ ] En prod : `NODE_ENV=production` au build et au runtime

---

## 2. Base de données

> **⚠️ En production**
> - **À ne jamais faire** : `npx prisma db push`, `npx prisma db push --force-reset`, `npm run db:reset` (efface les données).
> - **À utiliser uniquement** : `npm run db:migrate:deploy` (ou `npx prisma migrate deploy`) pour appliquer les migrations.

- [ ] **Migrations** : en prod, utiliser uniquement `npm run db:migrate:deploy`, jamais `db push`
- [ ] **Seed** : `npm run db:seed` une fois après première migration (crée l’admin si absent)
- [ ] **Backups** : voir section 5

Référence : `PRODUCTION.md` (Database Setup).

---

## 3. Sécurité

- [ ] **JWT_SECRET** : fort, aléatoire, unique par environnement (ex. `openssl rand -base64 32`)
- [ ] **ADMIN_PASSWORD** : défini et fort pour le seed (puis changement conseillé après première connexion)
- [ ] **Rate limiting** : actif en prod sur login, export, PDF, backup ; au moins un preset par défaut sur les API (voir `lib/rate-limit-middleware.ts`). *Revoir les seuils après 1–2 semaines d’usage réel.*
- [ ] **Guards** : toutes les routes sous `/api/admin/*` protégées ; routes client avec auth appropriée
- [ ] **Validation** : entrées validées (Zod ou équivalent) sur les routes qui acceptent body/query
- [ ] **Pas d’injection** : aucun `queryRawUnsafe` avec concaténation d’entrée utilisateur
- [ ] **HTTPS (TLS)** : activé partout (reverse proxy ou hébergeur). En option : en-têtes de sécurité (HSTS, CSP, CORS stricts) pour renforcer la protection XSS et le forçage HTTPS.

Référence : `docs/CHECKLIST_PREPRODUCTION.md` (Sécurité).

---

## 4. Logs et secrets

- [ ] **Logger structuré** : en prod, utiliser `lib/logger.ts` (sortie JSON pour agrégation type ELK/DataDog)
- [ ] **Pas de données sensibles** dans les logs (mots de passe, tokens, données personnelles)
- [ ] **Rotation des logs** : configurer une rotation (logrotate ou équivalent) pour éviter la saturation disque ; niveaux adaptés (ex. `error` en prod, `debug` en dev)
- [ ] **Rotation des secrets** : procédure documentée pour changer `JWT_SECRET` (invalide les sessions ; prévoir redéconnexion des utilisateurs)

---

## 5. Backups

- [ ] **Backups automatiques** : planifiés (cron / Task Scheduler) avec `npm run db:backup` ou script équivalent
- [ ] **Fréquence recommandée** : base de données au moins quotidienne ; en option, sauvegarde des fichiers uploads (ex. toutes les 12 h) et de la configuration après chaque changement
- [ ] **Emplacement** : dossier `backups/` (ou `BACKUP_DIR`) ; en prod, copie vers un support externe (autre disque, NAS, cloud) via `npm run backup:copy` ou script dédié
- [ ] **Rétention** : politique définie, ex. 7 jours de backups quotidiens, 4 semaines d’hebdomadaires, 12 mois de mensuels (adapter selon contraintes)
- [ ] **Test de restauration** : au moins une fois avant go-live, puis tester régulièrement (ex. trimestriel) ; utiliser `scripts/restore-backup.js` ou la procédure PostgreSQL

Référence : `docs/ACCES_DOSSIER_BACKUPS.md`, `docs/RESTAURATION_BACKUP.md`, `docs/BACKUP_TRANSFER.md`.

---

## 6. Monitoring et alerting (recommandé avant prod)

Aujourd’hui le projet a : audit logs, backups, tests E2E, endpoint `/api/health`. Pour une production « sérieuse », ajouter :

- [ ] **Monitoring applicatif** : erreurs 500, échecs critiques (génération PDF, export, login en masse)
- [ ] **Alertes** : email ou Slack en cas d’anomalie (ex. Sentry, Logtail, ou console cloud) ; alerte si `GET /api/health` ≠ 200
- [ ] **Santé** : `/api/health` utilisé par un load balancer ou un cron de surveillance (vérifie déjà la connexion BDD, version, stats)
- [ ] **Espace disque** : surveillance du dossier backups et des logs
- [ ] **Métriques (optionnel)** : CPU/mémoire &lt; 80 %, disque &lt; 85 %, temps de réponse p95 &lt; 2 s, taux d’erreur &lt; 0,1 % (APM type New Relic/DataDog si besoin)

Même une solution minimale (ex. Sentry + cron qui vérifie `/api/health`) réduit fortement le risque de découvrir une panne trop tard.

- [ ] **Emails en prod** : vérifier qu’un email réel est bien reçu (test manuel : invitation, reset password ou notification selon ce qui est activé)

---

## 7. Build et déploiement

- [ ] **Build** : `npm ci` puis `npm run build` sans erreur
- [ ] **Health check** : `GET /api/health` retourne 200
- [ ] **HTTPS** : activé (reverse proxy ou hébergeur)
- [ ] **Fichiers sensibles** : `.env.production` et dossiers `backups/` non exposés au web
- [x] **Procédure de rollback** définie (tag Git ou image précédente) et documentée (voir `PRODUCTION.md` § Rollback)
- [x] **Version applicative** visible (commit hash, semver ou date de build renvoyée par `/api/health` ; optionnel : `NEXT_PUBLIC_APP_VERSION`, `BUILD_TIME` au build)

Référence : `PRODUCTION.md` (Build and Start, Reverse Proxy).

---

## 8. Tests avant mise en production

- [x] **Lint** : `npm run lint` OK *(0 erreur ; warnings à traiter progressivement. Sous Windows : `eslint .` utilisé)*
- [x] **Build** : `npm run build` OK
- [x] **E2E** : `npm run test:e2e` OK (51 passed, 10 skipped)
- [x] **Smoke manuel** : login admin, login client, une commande, une facture, un backup
- [ ] **Optionnel (recommandé pour renforcer)** : tests de charge (ex. 100 utilisateurs simultanés), scan sécurité (OWASP ZAP ou équivalent), compatibilité navigateurs cibles (Chrome, Firefox, Safari)

---

## 9. Résumé « Go / No-Go »

Cocher avant chaque mise en production :

| Bloc | Tous les points cochés ? |
|------|---------------------------|
| 1. Environnements (DEV/PROD, variables, pas de SQLite en prod) | [ ] |
| 2. Base de données (migrations deploy, seed) | [ ] |
| 3. Sécurité (JWT, rate limit, guards, validation) | [ ] |
| 4. Logs et secrets (logger, pas de fuite, rotation doc) | [ ] |
| 5. Backups (planifiés, copie externe, test restauration) | [ ] |
| 6. Monitoring / alerting (au moins santé + alertes de base) | [ ] |
| 7. Build et déploiement (build, health, HTTPS) | [ ] |
| 8. Tests (lint, build, E2E, smoke) | [x] |

Quand tous les blocs sont cochés, le projet est prêt pour un passage en production contrôlé. Pour le détail des étapes (commandes, exemples), s’appuyer sur `PRODUCTION.md` et `docs/PLAN_PREPARATION_PRODUCTION.md`.

---

## 10. Détail : comment cocher chaque bloc

Pour chaque bloc du résumé (section 9), voici ce que « cocher » signifie concrètement.

### Bloc 1 – Environnements
- **À faire :** Vérifier que sur le **serveur de production** vous avez un fichier `.env.production` (ou variables d’environnement) avec :
  - `DATABASE_URL` = une URL **PostgreSQL** (pas `file:./dev.db`).
  - `NODE_ENV=production` au moment du build et au lancement de l’app (`npm run build` puis `npm start`).
- **Cocher quand :** Ces deux points sont vrais en prod. Les cases 1.3 (`.env.production.example`, `.gitignore`) sont déjà cochées.

### Bloc 2 – Base de données
- **À faire :**
  - En prod, n’utiliser **que** `npm run db:migrate:deploy` pour les migrations (jamais `db push`).
  - Après la première migration, lancer **une fois** `npm run db:seed` pour créer l’admin (et les comptes de démo si besoin).
  - Mettre en place les backups (détaillés en bloc 5).
- **Cocher quand :** Migrations appliquées avec `db:migrate:deploy`, seed exécuté, et procédure backups définie.

### Bloc 3 – Sécurité
- **À faire :**
  - Générer un **JWT_SECRET** fort (ex. `openssl rand -base64 32`) et le définir en prod.
  - Définir un **ADMIN_PASSWORD** fort pour le seed (puis changer le mot de passe admin après première connexion si souhaité).
  - Confirmer que le **rate limiting** est actif (login, export, PDF, backup) – voir `lib/rate-limit-middleware.ts`.
  - Vérifier que les routes **/api/admin/** sont protégées (auth) et que les routes client ont une auth adaptée.
  - S’assurer que les entrées sont validées (Zod ou équivalent) et qu’il n’y a pas d’utilisation dangereuse de `queryRawUnsafe` avec des entrées utilisateur.
- **Cocher quand :** Vous avez vérifié (ou documenté) ces points ; les docs `CHECKLIST_PREPRODUCTION.md` peuvent aider.

### Bloc 4 – Logs et secrets
- **À faire :**
  - En prod, utiliser un logger structuré si le projet en prévoit un (`lib/logger.ts` si présent).
  - Vérifier qu’aucun mot de passe, token ou donnée personnelle n’est écrit en clair dans les logs.
  - Avoir une **procédure écrite** pour changer le `JWT_SECRET` (et indiquer que cela invalide les sessions).
- **Cocher quand :** Procédure de rotation documentée et pas de fuite de secrets dans les logs.

### Bloc 5 – Backups
- **À faire :**
  - Planifier des **backups automatiques** (cron ou Task Scheduler) avec `npm run db:backup` (ou script équivalent) ; fréquence au moins quotidienne pour la BDD.
  - Définir un **emplacement** (ex. `backups/` ou `BACKUP_DIR`) et, en prod, une **copie externe** (autre disque, NAS, cloud) via `npm run backup:copy` ou script dédié.
  - Définir une **rétention** (ex. 7 j quotidiens, 4 sem hebdo, 12 mois mensuels).
  - Faire **au moins un test de restauration** avant go-live, puis régulièrement ; utiliser `scripts/restore-backup.js` ou procédure PostgreSQL.
- **Cocher quand :** Planification en place, copie externe configurée, rétention définie et test de restauration réussi. Voir `docs/RESTAURATION_BACKUP.md`.

### Bloc 6 – Monitoring / alerting
- **À faire :**
  - Mettre en place un **monitoring** minimal : erreurs 500, échecs critiques (PDF, export, login).
  - Configurer des **alertes** (email, Slack ou console cloud) en cas d’anomalie (ex. Sentry, Logtail).
  - Utiliser **GET /api/health** pour la surveillance (load balancer ou cron).
  - Surveiller l’**espace disque** (dossier backups, logs).
  - Tester l’envoi d’**emails en prod** (invitation, reset password, etc.) pour confirmer la réception.
- **Cocher quand :** Au moins santé + un canal d’alerte en place, et test email réussi.

### Bloc 7 – Build et déploiement
- **À faire :**
  - **Build** : `npm ci` puis `npm run build` sans erreur sur l’environnement de déploiement.
  - **Health check** : `GET /api/health` retourne 200 en prod.
  - **HTTPS** : activé (reverse proxy ou hébergeur).
  - **Fichiers sensibles** : `.env.production` et dossiers `backups/` non exposés au web (pas servis par l’app).
- **Cocher quand :** Build OK, health 200, HTTPS actif et secrets/backups non exposés. Les cases « procédure rollback » et « version dans /api/health » sont déjà cochées.

### Bloc 8 – Tests
- **Déjà coché** : Lint OK, build OK, E2E OK, smoke manuel effectué (login admin, login client, une commande, une facture, un backup).
- Pour les **prochains déploiements** : refaire au minimum lint, build et un smoke rapide avant chaque mise en production.

---

## 11. Communication (incident et maintenance)

- [ ] **En cas d’incident** : canal interne (Slack/Teams) ou procédure pour alerter l’équipe ; si interruption &gt; 15 min, prévoir notification clients (email ou page de statut).
- [ ] **Maintenance planifiée** : préavis (ex. 48 h) pour les maintenances impactantes ; fenêtre limitée (ex. 2 h max, horaire creux) ; page de maintenance ou message clair avec ETA si l’app est indisponible.

---

## 12. Post-déploiement

### Premières 24 h
- [ ] **Monitoring** : surveiller logs, métriques, erreurs 500.
- [ ] **Parcours critique** : refaire un smoke (login, commande, facture) en conditions réelles.
- [ ] **Backups** : vérifier qu’un premier backup post-go a bien été créé.

### Première semaine
- [ ] **Performance** : analyser temps de réponse et taux d’erreur.
- [ ] **Retours** : recueillir les premiers retours utilisateurs et corriger les bugs mineurs.

---

## 13. Questions clés avant Go (lead tech / CTO)

- [ ] Tous les secrets sont-ils hors du dépôt Git ? (vérifier avec `git check-ignore .env .env.production`)
- [ ] Le plan de rollback a-t-il été relu (ou testé en staging) ?
- [ ] L’équipe support / exploitation est-elle au courant du go-live et des contacts en cas d’incident ?
- [ ] Les sauvegardes sont-elles prévues (fréquence, rétention, test de restauration) ?
