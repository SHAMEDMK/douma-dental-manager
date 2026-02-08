# Plan de préparation à la production – Tactac (Laboratoire dentaire)

**Stack :** Next.js 16.1.6 (Turbopack), Prisma, SQLite (dev) / PostgreSQL (prod), authentification JWT (jose).  
**Tests E2E :** 60 tests Playwright, ~4,1 min.

---

## 1. Analyse des points critiques et priorisation

### 1.1 Performance des requêtes Prisma

| Priorité | Élément | État actuel | Action |
|----------|---------|-------------|--------|
| **P1** | Requêtes N+1 | Déjà mitigé : `Promise.all`, `include`/`select` sur plusieurs pages (voir `OPTIMISATIONS_PRISMA.md`) | Vérifier listes avec relations (orders + user, invoices + order) |
| **P1** | Cache | Dashboard admin en cache 30 s (`lib/cache.ts`), settings 60 s (`settings-cache.ts`) | Étendre cache à d’autres pages lourdes (liste commandes/factures) si besoin |
| **P2** | Pagination | Listes (clients, commandes, factures, produits) sans cursor/offset | Ajouter pagination côté serveur (limit/offset ou cursor) |
| **P2** | Lazy loading | Pas de lazy loading explicite sur les listes | Utiliser `loading.tsx` + Suspense partout, skeletons |

**Risque N+1 restant :**  
- `app/admin/orders/page.tsx` : si chaque ligne affiche des infos user sans `include` sur `findMany`, un N+1 est possible. Vérifier que la liste orders est chargée avec `include: { user: { select: { name, email, clientCode } } }` (ou équivalent).

### 1.2 Sécurité API

| Priorité | Élément | État actuel | Action |
|----------|---------|-------------|--------|
| **P1** | Rate limiting | Présent sur plusieurs routes (`withRateLimit`), login et PDF | Appliquer rate limit sur **toutes** les routes API publiques et sensibles |
| **P1** | Validation des entrées | Pas de schéma Zod systématique sur les body/query | Introduire validation Zod sur chaque route (body + query) |
| **P1** | Auth guards | `requireAdminAuth` / `requireClientAuth` utilisés (ex. `/api/admin/stats/alerts`) | Vérifier que **chaque** route API admin/client utilise un guard |
| **P2** | CORS | Non configuré explicitement dans Next.js | Configurer CORS dans `next.config.ts` ou middleware si besoin (domaines explicites en prod) |
| **P2** | Injection SQL | Prisma utilise des requêtes paramétrées (pas de raw SQL non échappé) | Audit des `prisma.$queryRaw` / `queryRawUnsafe` si présents |
| **P2** | Headers de sécurité | Non centralisés | Middleware ou config Next : X-Content-Type-Options, X-Frame-Options, CSP (optionnel) |

### 1.3 UX/UI

| Priorité | Élément | Action |
|----------|--------|--------|
| **P1** | États de chargement | Ajouter `loading.tsx` dans chaque segment (admin, portal, comptable, etc.) et skeletons sur listes |
| **P2** | Messages d’erreur/succès | Centraliser toasts (déjà react-hot-toast), messages serveur cohérents (actions) |
| **P2** | Accessibilité | ARIA sur modales/boutons, contrastes, navigation clavier (focus visible) |
| **P2** | Responsive | Vérifier breakpoints (sidebar, tableaux en scroll horizontal sur mobile) |

### 1.4 Préparation production (config, déploiement)

| Priorité | Élément | Action |
|----------|--------|--------|
| **P1** | Variables d’environnement | Fichiers `.env.production.example` et documentation (déjà amorcé) |
| **P1** | Logging | Remplacer `console.log/error` par logger structuré (niveaux, JSON) |
| **P1** | Build Next | Vérifier `next build` sans erreur, optimiser si besoin (bundles, images) |
| **P2** | Migrations DB | Scripts `db:migrate:deploy` pour prod, pas de `db push` en prod |
| **P2** | Monitoring / santé | Endpoint `/api/health` existant ; ajouter métriques (optionnel) et alertes |

### 1.5 Tests supplémentaires

| Priorité | Élément | Action |
|----------|--------|--------|
| **P1** | CI/CD | Pipeline (GitHub Actions / GitLab CI) : lint, build, `db:migrate:deploy` (ou skip), `test:e2e` avec seed |
| **P2** | Tests unitaires | Couvrir helpers (ex. `lib/sequence.ts`, `lib/invoice-utils.ts`, `lib/delivery-code.ts`) |
| **P2** | Performance | Lighthouse ou Web Vitals en CI (optionnel) ; tests de charge sur export Excel / PDF si besoin |

### 1.6 Maintenance et évolutivité

| Priorité | Élément | Action |
|----------|--------|--------|
| **P2** | Patterns | Actions serveur : toujours retourner `{ success, error?, data? }` ; API : schémas Zod partagés |
| **P2** | Documentation | README mise à jour, doc des variables d’env, schéma Prisma commenté |
| **P2** | Scalabilité DB | Index Prisma déjà présents ; pour PostgreSQL, prévoir pool de connexions (Prisma par défaut) |

---

## 2. Plan d’action par phase (avec estimations)

### Phase 1 – Sécurité et validation (≈ 1–2 jours)

1. **Validation Zod sur les routes API critiques** (4–6 h)  
   - Créer `lib/validations/api.ts` avec schémas pour body/query des routes export, PDF, upload, delivery, favorites.  
   - Dans chaque route : `schema.parse(body)` ou `schema.safeParse` puis retour 400 si invalide.

2. **Rate limiting sur toutes les routes API** (2–3 h)  
   - Lister les routes dans `app/api/**/route.ts`.  
   - Appliquer `withRateLimit(request, preset)` en tête de chaque handler (GET/POST).  
   - Prévoir un preset plus strict pour login, export, PDF.

3. **Vérifier les guards d’auth** (1–2 h)  
   - S’assurer que chaque route sous `/api/admin/*` appelle `requireAdminAuth` (ou équivalent) et que les routes client utilisent `requireClientAuth` si nécessaire.

### Phase 2 – Performance et UX (≈ 1–2 jours)

4. **Pagination côté serveur** (4–6 h)  
   - Pages : listes clients, commandes, factures, produits.  
   - Ajouter `?page=1&limit=20` (ou `cursor`), utiliser `skip/take` dans Prisma et renvoyer `totalCount` pour l’UI.

5. **Loading et skeletons** (2–4 h)  
   - Fichiers `loading.tsx` par segment (admin, admin/orders, admin/invoices, portal, etc.).  
   - Composants skeleton pour tableaux (lignes grises animées) réutilisables.

6. **Vérification N+1 sur listes** (1–2 h)  
   - `admin/orders/page.tsx` : s’assurer que la liste des commandes est chargée avec `include: { user: { select: { name, email, clientCode } } }` (ou champs nécessaires).  
   - Idem pour factures (order ou user si affiché).

### Phase 3 – Production et déploiement (≈ 1 jour)

7. **Logging structuré** (2–3 h)  
   - Créer `lib/logger.ts` (wrapper qui formate en JSON avec niveau, timestamp, message, optional payload).  
   - Remplacer progressivement `console.log` / `console.error` par ce logger.

8. **Config production et santé** (2–3 h)  
   - Finaliser `.env.production.example` (DATABASE_URL PostgreSQL, JWT_SECRET, NEXT_PUBLIC_APP_URL, ADMIN_PASSWORD).  
   - Documenter dans README ou `docs/DEPLOYMENT.md` les étapes : build, migrate, seed (optionnel), start.  
   - S’assurer que `/api/health` renvoie 200 et éventuellement vérifie la connexion DB.

9. **Build et optimisations Next** (1–2 h)  
   - Lancer `npm run build` et corriger les erreurs.  
   - Vérifier que les images utilisent le composant Next `Image` si besoin ; pas d’optimisation Prisma spécifique côté client (déjà côté serveur).

### Phase 4 – CI/CD et tests (≈ 1 jour)

10. **Pipeline CI** (3–4 h)  
    - Exemple GitHub Actions : checkout → Node 20 → `npm ci` → `npx prisma generate` → `npm run lint` → `npm run build` (avec DATABASE_URL factice si besoin) → `npm run test:e2e` (avec serveur + seed).  
    - Variables secrètes : `DATABASE_URL` (SQLite en CI ou Postgres éphémère), `JWT_SECRET`, `ADMIN_PASSWORD` pour le seed.

11. **Tests unitaires ciblés** (2–3 h)  
    - Vitest : au moins `lib/sequence.ts`, `lib/invoice-utils.ts`, `lib/delivery-code.ts`, et un helper de validation si ajouté.

### Phase 5 – Optionnel (monitoring, CORS, CSP)

12. **CORS et headers de sécurité** (1–2 h)  
    - Si l’app est consommée par un autre domaine, configurer CORS dans `next.config.ts` (headers) ou dans un middleware.  
    - Headers : X-Content-Type-Options, X-Frame-Options, Referrer-Policy.

13. **Checklist pré-production**  
    - Utiliser la checklist ci-dessous avant chaque mise en production.

---

## 3. Exemples de code

### 3.1 Validation Zod sur une route API

```ts
// lib/validations/api.ts
import { z } from 'zod'

export const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']).optional().default('xlsx'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export const pdfInvoiceParamsSchema = z.object({
  id: z.string().cuid(),
})
```

```ts
// Dans app/api/admin/export/invoices/route.ts (exemple)
import { exportQuerySchema } from '@/lib/validations/api'

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (rateLimitResponse) return rateLimitResponse

  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE'])
  if (authResponse) return authResponse

  const { searchParams } = new URL(request.url)
  const parsed = exportQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { format, dateFrom, dateTo } = parsed.data
  // ... reste du handler
}
```

### 3.2 Rate limiting appliqué à toutes les routes

Créer un helper réutilisable et l’appeler en première ligne de chaque handler :

```ts
// lib/rate-limit-presets.ts (ou dans rate-limit-middleware.ts)
export const RATE_LIMIT_PRESETS = {
  DEFAULT: { maxRequests: 60, windowMs: 60 * 1000 },
  STRICT: { maxRequests: 10, windowMs: 60 * 1000 },  // export, PDF
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
}
```

Dans chaque `route.ts` :

```ts
const rateLimitResponse = await withRateLimit(request, RATE_LIMIT_PRESETS.DEFAULT)
if (rateLimitResponse) return rateLimitResponse
```

### 3.3 Pagination Prisma (liste clients)

```ts
// app/admin/clients/page.tsx
const page = Math.max(1, Number(params.page) || 1)
const limit = 20
const skip = (page - 1) * limit

const [clients, total] = await Promise.all([
  prisma.user.findMany({
    where: { role: 'CLIENT' },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: { id: true, name: true, clientCode: true, email: true, companyName: true, segment: true, discountRate: true, balance: true, creditLimit: true, createdAt: true, _count: { select: { orders: true } } },
  }),
  prisma.user.count({ where: { role: 'CLIENT' } }),
])

const totalPages = Math.ceil(total / limit)
// Passer page, totalPages, total au composant pour afficher pagination UI
```

### 3.4 Loading et skeleton

```tsx
// app/admin/orders/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  )
}
```

### 3.5 Logger structuré

```ts
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta && Object.keys(meta).length > 0 && { meta }),
  }
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(payload))
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta ?? '')
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
}
```

---

## 4. Templates de configuration

### 4.1 Variables d’environnement production

Créer ou compléter `.env.production.example` :

```env
# Database (PostgreSQL obligatoire en production)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# Auth (générer avec: openssl rand -base64 32)
JWT_SECRET="REPLACE-WITH-STRONG-SECRET-MIN-32-BYTES"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"

# Admin (mot de passe fort pour le premier seed)
ADMIN_PASSWORD="REPLACE-WITH-STRONG-ADMIN-PASSWORD"
```

### 4.2 Next.js – CORS et headers (optionnel)

```ts
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
```

### 4.3 GitHub Actions – CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run build
        env:
          DATABASE_URL: 'file:./dev.db'
          JWT_SECRET: 'ci-secret-min-32-bytes-long-for-tests'
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: 'true'
          DATABASE_URL: 'file:./dev.db'
          JWT_SECRET: 'ci-secret-min-32-bytes-long-for-tests'
```

---

## 5. Checklist pré-production

À valider avant chaque déploiement en production.

### Sécurité
- [ ] `JWT_SECRET` fort et unique (≥ 32 octets), jamais commité
- [ ] `ADMIN_PASSWORD` défini et fort pour le seed
- [ ] Rate limiting actif sur login, export, PDF, et au moins défaut sur les autres API
- [ ] Toutes les routes API admin/client protégées par un guard d’auth
- [ ] Validation des entrées (Zod ou équivalent) sur les routes qui acceptent body/query
- [ ] Aucun `prisma.$queryRawUnsafe` avec concaténation utilisateur

### Base de données
- [ ] PostgreSQL utilisé en prod (pas SQLite)
- [ ] Migrations appliquées avec `prisma migrate deploy` (pas `db push`)
- [ ] Backup automatique configuré si nécessaire (scripts existants `db:backup`)

### Configuration
- [ ] `NEXT_PUBLIC_APP_URL` pointe vers l’URL de production
- [ ] `NODE_ENV=production` au build et au runtime
- [ ] Fichiers `.env*` non commités (vérifier `.gitignore`)

### Build et runtime
- [ ] `npm run build` réussit sans erreur
- [ ] `/api/health` retourne 200
- [ ] Logging structuré (ou au moins pas de fuite de données sensibles dans les logs)

### Tests
- [ ] Lint et build passent en CI
- [ ] Tests E2E passent (avec seed et base dédiée)
- [ ] Smoke manuel : login admin, login client, une commande, une facture

### UX / Disponibilité
- [ ] Pages critiques ont un `loading.tsx` ou skeleton
- [ ] Gestion d’erreur (error boundary ou messages clairs) sur les actions importantes

---

## 6. Migration SQLite → PostgreSQL

- **Schéma :** Prisma est déjà agnostique ; vérifier que le schéma ne contient pas de spécificités SQLite (ex. types ou contraintes non supportés).
- **Connexion :** Changer uniquement `DATABASE_URL` vers PostgreSQL.
- **Migrations :** En prod, créer une migration initiale si la base Postgres est vide : `npx prisma migrate deploy`.
- **Données :** Pour migrer les données depuis SQLite, utiliser un outil d’export/import ou des scripts personnalisés (export JSON/CSV puis import via Prisma).

---

## 7. Résumé des livrables

| Livrable | Contenu |
|----------|--------|
| **Analyse** | Priorisation P1/P2 ci-dessus (performance, sécurité, UX, prod, tests, maintenance) |
| **Plan d’action** | 5 phases avec estimations (≈ 5–7 jours au total) |
| **Exemples de code** | Validation Zod, rate limit, pagination, loading, logger |
| **Config** | `.env.production.example`, headers Next.js, exemple CI GitHub Actions |
| **Checklist** | Pré-production reproductible avant chaque déploiement |

En suivant ce plan, vous gardez la compatibilité SQLite en dev, préparez PostgreSQL en prod, et conservez la rétrocompatibilité des APIs tout en renforçant sécurité, performance et maintenabilité.
