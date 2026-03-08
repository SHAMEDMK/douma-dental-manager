# PHASE 1 — Verrouillage PRODUCTION
## Audit & Plan d'Action

**Objectif** : Zéro surprise, système fiable au quotidien

---

## 📊 État Actuel (Audit)

### ✅ 1. Tests Essentiels

#### État : **⚠️ PARTIEL**

**Existant** :
- ✅ Structure Playwright configurée (`playwright.config.ts`)
- ✅ Fichiers tests E2E créés : `tests/e2e/auth.spec.ts`, `tests/e2e/order-workflow.spec.ts`
- ⚠️ Tests actuellement **templates/vides** — à compléter

**À faire** :
- [ ] Test E2E complet : Création commande → livraison → facture → paiement
- [ ] Test E2E : Cas marge négative → approbation admin
- [ ] Test E2E : Blocage modification après facture
- [ ] Test PDF : Facture admin/client
- [ ] Test PDF : BL admin/client
- [ ] Test plafond crédit bloquant

---

### ✅ 2. Logs d'Audit

#### État : **✅ IMPLÉMENTÉ (à compléter)**

**Existant** :
- ✅ Table `AuditLog` dans Prisma
- ✅ Module `lib/audit.ts` avec fonctions utilitaires
- ✅ Page admin `/admin/audit` pour visualiser les logs
- ✅ Intégrations partielles dans les actions

**Vérifications à faire** :
- [ ] Changement statut commande : Vérifier intégration complète
- [ ] Approbation admin : Vérifier logs
- [ ] Paiements (création/suppression) : Vérifier logs
- [ ] Annulation commande : Vérifier logs
- [ ] Génération facture/BL : Vérifier logs

---

### ✅ 3. Backup & Sécurité

#### État : **⚠️ PARTIEL**

**Existant** :
- ✅ Script backup : `scripts/backup-db.js` (SQLite + PostgreSQL)
- ✅ Page admin `/admin/backups` pour gérer les backups
- ✅ Rotation automatique (30 backups max)
- ❌ **Rate limiting** : **NON IMPLÉMENTÉ**
- ⚠️ Sécurité routes : **À VÉRIFIER** (besoin audit complet)

**À faire** :
- [ ] Implémenter rate limiting sur :
  - `/api/auth/login`
  - `/api/invitations/*`
  - `/api/pdf/*`
- [ ] Audit complet sécurité routes :
  - Vérifier middleware auth sur toutes les routes admin
  - Vérifier qu'aucune mutation via GET
  - Vérifier CSRF protection (si applicable)

---

## 🎯 Plan d'Action Détaillé

### **ÉTAPE 1 : Tests E2E Playwright (Priorité 1)**

#### 1.1 Test workflow complet
**Fichier** : `tests/e2e/order-workflow.spec.ts`

```typescript
Test: "Création commande → livraison → facture → paiement"
- Se connecter comme client
- Ajouter produits au panier
- Valider commande
- Se connecter comme admin
- Préparer commande
- Expédier commande
- Livrer commande (→ facture créée)
- Enregistrer paiement
- Vérifier statut facture = PAID
```

#### 1.2 Test approbation marge négative
**Nouveau fichier** : `tests/e2e/admin-approval.spec.ts`

```typescript
Test: "Cas marge négative → approbation admin"
- Créer commande avec produit coût > prix
- Vérifier que commande passe en attente admin
- Admin approuve/rejette
- Vérifier workflow
```

#### 1.3 Test blocage modification
**Nouveau fichier** : `tests/e2e/invoice-lock.spec.ts`

```typescript
Test: "Blocage modification après facture"
- Créer commande → facture
- Essayer modifier commande
- Vérifier erreur "Facture verrouillée"
```

#### 1.4 Tests PDF
**Nouveau fichier** : `tests/e2e/pdf-generation.spec.ts`

```typescript
Tests:
- PDF facture admin : Vérifier contenu, format
- PDF facture client : Vérifier contenu, format
- PDF BL admin : Vérifier contenu, format
- PDF BL client : Vérifier contenu, format
```

#### 1.5 Test plafond crédit
**Nouveau fichier** : `tests/e2e/credit-limit.spec.ts`

```typescript
Test: "Plafond crédit bloquant"
- Client avec creditLimit = 100
- Créer commande 150 (dépasse limite)
- Vérifier erreur bloquante
```

---

### **ÉTAPE 2 : Compléter Logs d'Audit (Priorité 1)**

**Audit à faire** : Vérifier que TOUS les points critiques sont loggés.

**Checklist** :
- [ ] `app/actions/admin-orders.ts` : 
  - ✅ `logStatusChange` sur changements statut
  - ✅ `logEntityCreation` sur création facture
  - ⚠️ Vérifier logs annulation
- [ ] `app/actions/admin-payments.ts` :
  - ✅ `logEntityCreation` sur paiements
  - ✅ `logEntityDeletion` sur suppression paiements
- [ ] `app/actions/order.ts` :
  - ✅ `logEntityCreation` sur création commande
  - ⚠️ Vérifier logs approbation admin
- [ ] Autres actions critiques : Vérifier logs

**Action** : Audit code + compléter logs manquants si nécessaire.

---

### **ÉTAPE 3 : Rate Limiting & Sécurité (Priorité 2)**

#### 3.1 Implémenter rate limiting

**Package** : `@upstash/ratelimit` ou solution Next.js native

**Routes à protéger** :
```
/api/auth/login          → 5 tentatives / 15 min
/api/invitations/*       → 10 requêtes / heure
/api/pdf/*               → 20 requêtes / heure
```

**Implémentation** :
- Créer middleware `lib/rate-limit.ts`
- Appliquer sur routes API concernées
- Retourner `429 Too Many Requests` si dépassement

#### 3.2 Audit sécurité routes

**Vérifications** :
- [ ] Toutes routes `/admin/*` protégées par `getSession()` + `role === 'ADMIN'`
- [ ] Aucune mutation via GET (vérifier toutes routes GET)
- [ ] CSRF protection (si applicable Next.js)
- [ ] Validation inputs serveur (sanitization)

**Action** : Script audit automatique ou review manuel.

---

## 📝 Checklist Complète PHASE 1

### Tests
- [ ] Test E2E : Workflow complet commande → paiement
- [ ] Test E2E : Marge négative → approbation
- [ ] Test E2E : Blocage modification facture
- [ ] Test PDF : Facture admin/client
- [ ] Test PDF : BL admin/client
- [ ] Test E2E : Plafond crédit bloquant

### Logs Audit
- [ ] Vérifier logs changements statut commande
- [ ] Vérifier logs approbation admin
- [ ] Vérifier logs paiements (création/suppression)
- [ ] Vérifier logs annulation commande
- [ ] Vérifier logs génération facture/BL

### Backup & Sécurité
- [ ] ✅ Backup automatique (existant)
- [ ] Implémenter rate limiting login
- [ ] Implémenter rate limiting invitations
- [ ] Implémenter rate limiting PDF
- [ ] Audit routes admin (protection auth)
- [ ] Vérifier aucune mutation GET
- [ ] Vérifier CSRF protection

---

## 🚀 Ordre d'Exécution Recommandé

1. **JOUR 1** : Compléter tests E2E critiques (workflow + PDF)
2. **JOUR 2** : Audit & compléter logs d'audit
3. **JOUR 3** : Rate limiting + audit sécurité routes

**Estimation** : 2-3 jours de développement + tests

---

## 📌 Notes

- Les tests E2E peuvent être exécutés progressivement (ne pas bloquer sur 100% couverture)
- Rate limiting : Commencer simple, améliorer si besoin
- Logs audit : Priorité sur actions critiques (commandes, paiements, factures)

---

## ✅ Validation PHASE 1

**Critères de succès** :
- ✅ Tests E2E passent pour workflow critique
- ✅ Tous les points critiques loggés
- ✅ Rate limiting actif sur routes sensibles
- ✅ Routes admin sécurisées
- ✅ Backup fonctionnel et vérifié

**Une fois validé** → Passage à PHASE 2
