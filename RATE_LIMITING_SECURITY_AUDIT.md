# Audit de Sécurité - Rate Limiting & Routes

## ✅ Implémentation Rate Limiting Centralisé

### 1. Helper `lib/rate-limit.ts`
- ✅ Store in-memory `Map<string, Map<string, RequestRecord>>`
- ✅ Fonction `rateLimit(scope, identifier, pathnameGroup, config)`
- ✅ Key format: `${scope}:${identifier}:${pathnameGroup}`
- ✅ Presets mis à jour avec valeurs "safe":
  - LOGIN: 10 req / 5min par IP
  - PDF: 10 req / 1min par USER (si session) ou IP
  - INVITE: 20 req / 10min par IP
  - ADMIN: 60 req / 1min par USER (si session) ou IP

### 2. Middleware `proxy.ts`
- ✅ Rate limiting appliqué AVANT les vérifications auth
- ✅ Détection IP: `x-forwarded-for` → `x-real-ip` → fallback
- ✅ Groupement pathname: PDF, LOGIN, INVITE, ADMIN, GENERAL
- ✅ Audit logging `RATE_LIMIT_EXCEEDED` avec try/catch
- ✅ Headers de réponse: `Retry-After`, `X-RateLimit-*`

### 3. Tests E2E
- ✅ `tests/e2e/rate-limit-login.spec.ts`: Test spam login (11 requêtes → 429)
- ✅ `tests/e2e/rate-limit-pdf.spec.ts`: Test spam PDF (11 requêtes → 429)

---

## 🔒 Audit Sécurité Routes

### Routes `/api/pdf/*`

#### ✅ `/api/pdf/admin/invoices/[id]`
- **401 si pas connecté**: ✅ Vérifie `getSession()` → retourne 401 avec message "Authentication required"
- **403 si rôle incorrect**: ✅ Vérifie `session.role !== 'ADMIN' && !== 'COMPTABLE' && !== 'MAGASINIER'` → retourne 403 avec message "Access denied"
- **404 si ressource inexistante**: ✅ Vérifie `invoice` → retourne 404 avec message "Invoice not found" (pas de leak)
- **Audit logging**: ✅ `logUnauthorizedAccess` appelé pour 401 et 403
- **Rate limiting**: ✅ Appliqué via middleware + `withRateLimit` dans la route (double protection)

#### ✅ `/api/pdf/portal/invoices/[id]`
- **401 si pas connecté**: ✅ Vérifie `getSession()` → retourne 401
- **403 si rôle incorrect**: ✅ Vérifie `session.role !== 'CLIENT'` → retourne 403
- **403 si ressource n'appartient pas au client**: ✅ Vérifie `invoice.order.userId !== session.id` → retourne 403
- **404 si ressource inexistante**: ✅ Vérifie `invoice` → retourne 404 (pas de leak)
- **Audit logging**: ✅ `logUnauthorizedAccess` appelé pour tous les cas d'erreur
- **Rate limiting**: ✅ Appliqué via middleware + `withRateLimit` dans la route

#### ✅ `/api/pdf/admin/orders/[id]/delivery-note`
- **401 si pas connecté**: ✅ Vérifie `getSession()` → retourne 401
- **403 si rôle incorrect**: ✅ Vérifie rôles admin → retourne 403
- **404 si ressource inexistante**: ✅ Vérifie `order` → retourne 404
- **Audit logging**: ✅ `logUnauthorizedAccess` appelé
- **Rate limiting**: ✅ Appliqué via middleware + `withRateLimit` dans la route

#### ✅ `/api/pdf/portal/orders/[id]/delivery-note`
- **401 si pas connecté**: ✅ Vérifie `getSession()` → retourne 401
- **403 si rôle incorrect**: ✅ Vérifie `session.role !== 'CLIENT'` → retourne 403
- **403 si ressource n'appartient pas au client**: ✅ Vérifie `order.userId !== session.id` → retourne 403
- **404 si ressource inexistante**: ✅ Vérifie `order` → retourne 404
- **Audit logging**: ✅ `logUnauthorizedAccess` appelé
- **Rate limiting**: ✅ Appliqué via middleware + `withRateLimit` dans la route

### Routes `/admin/*` (Pages)

#### ✅ Protection via `proxy.ts`
- **Redirection si pas connecté**: ✅ `proxy.ts` vérifie token → redirige vers `/login`
- **Redirection si rôle incorrect**: ✅ `proxy.ts` vérifie rôles → redirige vers `/portal` ou `/admin`
- **Rate limiting**: ✅ Appliqué via middleware (60 req/min par USER)

### Routes `/api/admin/*`

**Note importante**: Les routes `/api/admin/*` sont exclues du middleware `proxy.ts` (via `return NextResponse.next()`), donc elles doivent se protéger elles-mêmes. Toutes les routes utilisent maintenant le guard standardisé `requireAdminAuth()` de `lib/api-guards.ts`.

#### ✅ `/api/admin/stats/alerts`
- **401 si pas connecté**: ✅ `requireAdminAuth()` → retourne 401 avec message "Non authentifié"
- **403 si rôle incorrect**: ✅ `requireAdminAuth(['ADMIN', 'COMPTABLE', 'MAGASINIER'])` → retourne 403 avec message "Accès refusé"
- **Audit logging**: ✅ `logSecurityEvent('UNAUTHORIZED_ACCESS')` appelé automatiquement
- **Rate limiting**: ✅ `withRateLimit()` (30 req/min)

#### ✅ `/api/admin/export/invoices`
- **401 si pas connecté**: ✅ `requireAdminAuth()` → retourne 401
- **403 si rôle incorrect**: ✅ `requireAdminAuth(['ADMIN', 'COMPTABLE'])` → retourne 403
- **Audit logging**: ✅ `logSecurityEvent('UNAUTHORIZED_ACCESS')` appelé automatiquement
- **Rate limiting**: ✅ `withRateLimit()` (10 req/min - opération lourde)

#### ✅ `/api/admin/export/orders`
- **401 si pas connecté**: ✅ `requireAdminAuth()` → retourne 401
- **403 si rôle incorrect**: ✅ `requireAdminAuth(['ADMIN', 'COMPTABLE', 'MAGASINIER'])` → retourne 403
- **Audit logging**: ✅ `logSecurityEvent('UNAUTHORIZED_ACCESS')` appelé automatiquement
- **Rate limiting**: ✅ `withRateLimit()` (10 req/min - opération lourde)

#### ✅ `/api/admin/export/clients`
- **401 si pas connecté**: ✅ `requireAdminAuth()` → retourne 401
- **403 si rôle incorrect**: ✅ `requireAdminAuth(['ADMIN'])` → retourne 403 (ADMIN uniquement - données sensibles)
- **Audit logging**: ✅ `logSecurityEvent('UNAUTHORIZED_ACCESS')` appelé automatiquement
- **Rate limiting**: ✅ `withRateLimit()` (10 req/min - opération lourde)

#### ✅ `/api/admin/backup`
- **401 si pas connecté**: ✅ `requireAdminAuth()` → retourne 401
- **403 si rôle incorrect**: ✅ `requireAdminAuth(['ADMIN'])` → retourne 403 (ADMIN uniquement - très sensible)
- **Audit logging**: ✅ `logSecurityEvent('UNAUTHORIZED_ACCESS')` appelé automatiquement
- **Rate limiting**: ✅ `withRateLimit()` (20 req/min pour GET, 5 req/heure pour POST)

### Guard Standardisé

Toutes les routes `/api/admin/*` utilisent maintenant le guard `requireAdminAuth()` de `lib/api-guards.ts`:

```typescript
// Guard standardisé au début de chaque route
const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE', 'MAGASINIER'])
if (authResponse) return authResponse
```

**Avantages**:
- ✅ Code standardisé et réutilisable
- ✅ Conventions HTTP respectées (401 = non authentifié, 403 = accès refusé)
- ✅ Audit logging automatique pour tous les accès non autorisés
- ✅ Messages d'erreur cohérents

---

## ✅ Résumé

### Rate Limiting
- ✅ Implémentation centralisée dans `proxy.ts`
- ✅ Règles spécifiques par type de route
- ✅ Audit logging automatique
- ✅ Tests E2E créés

### Sécurité Routes PDF
- ✅ Toutes les routes PDF ont les vérifications correctes (401, 403, 404)
- ✅ Audit logging présent
- ✅ Pas de leak d'information

### Sécurité Routes Admin
- ✅ Pages `/admin/*` protégées via `proxy.ts`
- ✅ Routes `/api/admin/*` protégées par guard standardisé `requireAdminAuth()`
- ✅ Toutes les routes vérifient session (401) et rôle (403)
- ✅ Audit logging automatique pour tous les accès non autorisés
- ✅ Rate limiting appliqué partout
- ✅ Tests E2E créés (`tests/e2e/api-admin-security.spec.ts`)

**Status**: Rate limiting ✅ | Routes PDF ✅ | Routes Admin ✅ (toutes sécurisées)
