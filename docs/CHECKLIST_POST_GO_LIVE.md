# Checklist post-go-live J+1 / J+7

À exécuter après la mise en production (Vercel + Next.js + Prisma + PostgreSQL). Orientée B2B : commandes, factures, stock, PDF, rôles (admin / comptable / magasinier / livreur / client).

---

## J+1 (le lendemain du go-live) — 30 à 60 min

### 1) Santé technique

- [ ] **Vercel → Deployments** : aucun “failed deployment”, pas de re-deploy surprise
- [ ] **Vercel → Logs (Production)** : pas de pics de 5xx, timeouts, erreurs Prisma (connexion, pool, transactions)
- [ ] **DB provider** : connexions actives / max OK (pas de saturation)

### 2) Auth & sécurité

- [ ] Route admin sans auth → **401**
- [ ] Accès admin par un **client** → **403**
- [ ] Rate limit : déclenche bien sur login et PDF en prod (au moins une vérif manuelle)
- [ ] JWT / secrets prod bien distincts du dev (pas de mélange)

### 3) Flux métier (échantillon réel)

Prendre 2–3 commandes réelles (ou 1 si faible trafic) :

- [ ] Statut initial OK
- [ ] Transition CONFIRMED → PREPARING → … OK (droits respectés)
- [ ] Stock : mouvement créé, stock final cohérent
- [ ] Facture : HT / TVA / TTC cohérents, balance logique
- [ ] **Audit logs** : chaque action sensible tracée (actor / role / entité)

### 4) PDF & impression

- [ ] Génération PDF facture (admin) OK
- [ ] Page print OK (mise en page, montants, TVA)
- [ ] Si possible : 1 facture avec cas réaliste (remise, quantité > 1)

### 5) Backups

- [ ] Confirmer qu’un **backup automatique** a bien été pris
- [ ] Programmer ou noter : **test de restore** sur staging (même si fait en J+7)

### 6) Support & opérations

- [ ] Note interne : où voir audit logs, stock moves, facture pour investiguer une commande
- [ ] Comptes internes (admin / comptable / magasinier / livreur) fonctionnent

---

## J+7 (une semaine après) — 1 à 2 h

### 1) Stabilité & performance

- [ ] Revue des **erreurs récurrentes** (top 3) dans les logs Vercel
- [ ] Latence des endpoints clés : login, parcours commande, PDF, pages admin lourdes
- [ ] Aucun endpoint en N+1 évident (pics de latence)

### 2) Base de données

- [ ] Index sur tables chaudes : `orders`, `invoices`, `audit_logs`, `stock_moves`
- [ ] Croissance des tables : audit logs, stock moves, métadonnées backups
- [ ] **Politique de rétention** : durée de conservation des audit logs (conformité / besoin métier)

### 3) Sécurité & conformité

- [ ] **RBAC** : vérifier 3–5 parcours “interdits” (ex. client → admin, comptable → action admin-only)
- [ ] CSP : ne bloque rien d’utile, protège au minimum
- [ ] Exports admin (clients / factures) : protégés et journalisés (si applicable)

### 4) Backups — test restore

- [ ] **Restore** vers staging ou DB temporaire
- [ ] Smoke dessus : login admin, liste commandes, génération PDF
- [ ] Documenter : temps de restore + procédure

### 5) Qualité métier

- [ ] Cas limites observés : remises, marges négatives / approbations, limites de crédit, annulations (si activées)
- [ ] Ajouter 3–5 tests (unit ou E2E) sur les anomalies rencontrées

### 6) Opérations & process

- [ ] Mettre à jour si besoin : procédure déploiement, checklist prod (env vars)
- [ ] Définir un rythme : release hebdo + fenêtre de maintenance courte

---

## Incidents (bonus)

Tableau minimal pour capitaliser les incidents : cause, correctif, anti-régression.

| Date       | Symptôme        | Cause        | Correctif | Test ajouté (anti-régression) |
|------------|-----------------|-------------|-----------|-------------------------------|
| _ex._ 12/02 | PDF 500 en prod | Timeout pool | Augmenté pool + timeout | E2E PDF avec facture 10 lignes |
|            |                 |              |           |                               |

À compléter au fil de l’eau. Très utile pour ne pas refaire les mêmes erreurs.

---

**Références :** `docs/CHECKLIST_PRODUCTION_VERCEL.md`, `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`
