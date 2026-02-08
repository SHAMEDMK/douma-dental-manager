# Procédure de déploiement Vercel — pas à pas

Ordre exact des actions pour déployer en production sans erreur. À suivre à chaque déploiement (premier go-live ou mises à jour).

**Prérequis :** avoir validé `docs/CHECKLIST_PRODUCTION_VERCEL.md` (env, DB, backups, headers, rate limit).

**Premier déploiement ?** Faire d’abord le parcours Local → Staging → Prod : `docs/PARCOURS_STAGING_PUIS_PROD.md`.

---

## 1. Avant de déployer (pre-deploy)

- [ ] **Code** : `main` (ou ta branche de release) à jour, lint OK, build local OK.
  ```bash
  npm run lint
  npm run build
  ```
- [ ] **Migrations** : toute nouvelle migration est commitée dans `prisma/migrations/` (jamais de `db push` en prod).
- [ ] **Secrets** : aucune valeur réelle dans le repo ; tout est dans Vercel → Environment Variables (Production).

---

## 2. Ordre des actions (à respecter)

### Étape A — Variables d’environnement

1. Ouvrir **Vercel → Project → Settings → Environment Variables**.
2. Vérifier que **Production** contient au minimum :
   - `NODE_ENV=production`
   - `DATABASE_URL` (PostgreSQL, avec pooling si besoin)
   - `DIRECT_URL` (sans pooling, pour migrations)
   - `JWT_SECRET` (32+ caractères)
   - `ADMIN_PASSWORD` (fort)
   - `NEXT_PUBLIC_APP_URL` ou `APP_URL` = URL prod
   - Variables rate limit, auth, PDF si utilisées.
3. Sauvegarder. Les prochains déploiements utiliseront ces variables.

### Étape B — Base de données (premier déploiement uniquement)

- [ ] PostgreSQL créé (Neon / Supabase / Railway, etc.), SSL activé si requis.
- [ ] **Une seule fois** après création de la DB : exécuter le seed (admin initial) **depuis ta machine** avec `DATABASE_URL` pointant vers la DB prod :
  ```bash
  # Attention : DATABASE_URL doit être celle de prod
  npx prisma db seed
  ```
  (Ou via un script sécurisé ; ne pas exposer `ADMIN_PASSWORD` en clair.)

### Étape C — Migrations (à chaque déploiement avec nouveau schéma)

⚠️ **Une seule fois par déploiement** — jamais en parallèle (plusieurs instances = risque de conflit).

**Option 1 — Depuis ta machine (recommandé au début)**  
Avant de pousser le déploiement Vercel :

```bash
# .env ou .env.production avec DATABASE_URL / DIRECT_URL de prod
npx prisma migrate deploy
```

Puis seulement après succès : push / deploy sur Vercel.

**Option 2 — Dans un pipeline CI**  
Dans ton workflow (GitHub Actions, etc.) :  
1. `prisma migrate deploy` (avec secrets DB)  
2. Puis déclencher le deploy Vercel (ou laisser le push déclencher le deploy après migration).

**Sur Vercel :** le build exécute déjà `prisma generate` (via `build` dans `package.json`). Ne pas lancer `migrate deploy` dans le build Vercel (risque d’exécution multiple).

### Étape D — Déploiement

1. Push sur la branche connectée à Vercel (souvent `main`) :
   ```bash
   git push origin main
   ```
2. Ou déploiement manuel : Vercel Dashboard → Deployments → Redeploy (avec les mêmes env vars).
3. Attendre la fin du build (Build Completed).

---

## 3. Après le déploiement (post-deploy)

Exécuter le **smoke** (5 min) défini dans `CHECKLIST_PRODUCTION_VERCEL.md` :

| # | Vérification | OK |
|---|--------------|-----|
| 1 | Home + login admin | ☐ |
| 2 | Dashboard admin + listes commandes / factures | ☐ |
| 3 | Workflow (commande → changement de statut → audit log) | ☐ |
| 4 | Génération PDF facture | ☐ |
| 5 | Sécurité : 401 sans auth, 403 client→admin, rate limit après 11 logins | ☐ |

- [ ] Tester l’URL réelle (domaine prod).
- [ ] Vérifier les logs Vercel (pas d’erreur 500 au chargement des pages critiques).

Si tout est vert → déploiement **OK**.

---

## 4. Rollback (si souci)

- **Dernier déploiement cassé :** Vercel → Deployments → clic sur le déploiement **précédent** (vert) → **Promote to Production**. Pas de panique : tu reviens à l’état d’avant en un clic.
- **Migration déjà appliquée mais code en retard :** le rollback de code ci-dessus suffit. La DB reste en avance ; le nouveau code (après correction) devra être compatible avec le schéma actuel. En cas de migration “cassante”, il faudrait une migration de rollback (à prévoir en amont pour les changements critiques).

---

## 5. Récap ordre exact

```
1. Pre-deploy : lint, build local, migrations commitées
2. Env vars Vercel à jour (Production)
3. Si nouveau schéma : prisma migrate deploy (une fois, depuis ta machine ou CI)
4. Push / Deploy Vercel
5. Post-deploy : smoke 5 min
6. En cas de problème : Promote to Production sur le déploiement précédent
```

Complément : `docs/CHECKLIST_PRODUCTION_VERCEL.md` (détail env, DB, backups, headers, rate limit).
