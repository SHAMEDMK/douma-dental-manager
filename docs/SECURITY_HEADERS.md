# Headers de sécurité (production)

Headers configurés dans `next.config.ts` (fonction `headers()`), appliqués à toutes les réponses (pages, assets, API).

## Headers actuels

| Header | Valeur | Rôle |
|--------|--------|------|
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite les infos envoyées en Referer |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=(), interest-cohort=() | Désactive des APIs navigateur non utilisées |
| `X-Frame-Options` | `DENY` | Empêche le site d’être mis en iframe |
| `Content-Security-Policy` | Voir ci‑dessous | Politique de contenu minimale |
| `Strict-Transport-Security` | (prod uniquement) `max-age=31536000; includeSubDomains; preload` | Force HTTPS en production |

## CSP actuelle (minimaliste)

Compatible Next.js (scripts/styles inline pour l’hydratation) et avec les pages print / PDF.

- **En production** (`NODE_ENV === 'production'` ou `VERCEL_ENV === 'production'`) : `script-src 'self' 'unsafe-inline'` (sans `'unsafe-eval'`).
- **En dev / preview** : `script-src 'self' 'unsafe-inline' 'unsafe-eval'` pour rester compatible avec le hot reload et les outils de dev.

Reste de la CSP (identique partout) :

- `default-src 'self'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com` (Blob pour logos PDF)
- `font-src 'self' data:`
- `connect-src 'self'`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`

Les routes `/api/*` et les pages `/print` reçoivent les mêmes headers ; le navigateur n’applique la CSP qu’aux documents (HTML), pas aux réponses JSON.

## Comment durcir plus tard

1. **CSP**  
   - Remplacer `'unsafe-inline'` / `'unsafe-eval'` par des nonces (nécessite middleware ou proxy pour générer le nonce par requête).  
   - Réduire `script-src` / `style-src` une fois que Next.js est configuré pour injecter les nonces.

2. **Points à retester après tout durcissement**  
   - Login (formulaire + redirection).  
   - Génération PDF (routes `/api/pdf/*`).  
   - Pages print (ex. `/admin/invoices/[id]/print`, `/portal/invoices/[id]/print`, BL print).  
   - Assets (CSS/JS/images) : pas de blocage en console (CSP).  
   - E2E à relancer :  
     `npx playwright test tests/e2e/auth.spec.ts tests/e2e/pdf-generation.spec.ts tests/e2e/smoke.spec.ts`

3. **Vérifier les headers en prod**  
   - Ouvrir les DevTools → Network → une requête document → onglet Headers → vérifier la présence de `X-Content-Type-Options`, `Content-Security-Policy`, etc.

## Tests

- **E2E** : `smoke.spec.ts` contient un test qui vérifie la présence de `X-Content-Type-Options: nosniff` sur la page `/portal`.
- Après modification des headers ou de la CSP, relancer :  
  `npx playwright test tests/e2e/auth.spec.ts tests/e2e/pdf-generation.spec.ts tests/e2e/smoke.spec.ts`
