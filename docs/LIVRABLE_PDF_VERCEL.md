# Livrable — Template facture PDF v1.0 prêt pour Vercel

**Date :** 2025-03-06  
**Objectif :** Sécuriser le déploiement du template facture PDF sur Vercel sans modifier le design validé.

---

## 1. Résumé des vérifications effectuées

| Catégorie | Vérification | Résultat |
|-----------|--------------|----------|
| **Fichiers template facture** | Tous identifiés dans `app/components/invoice-pdf/` | ✓ 12 fichiers (Document, Header, HeaderCompact, ClientCard, InfoCard, Table, Totals, AmountBlock, Footer, QRCode, index, CSS) |
| **Imports** | Chemins @/ corrects, pas de chemins relatifs cassés | ✓ |
| **Assets (logo)** | Logo via `companySettings.logoUrl` (Blob ou `/uploads/`) | ✓ |
| **URLs absolues** | Pas de localhost/127.0.0.1 en dur | ✓ |
| **Styles print** | `@media print`, `@page`, `page-break-*` | ✓ |
| **Variables d'environnement** | APP_URL, PDFSHIFT_API_KEY, BLOB_READ_WRITE_TOKEN documentées | ✓ |
| **CSP** | img-src autorise data:, blob:, Vercel Blob | ✓ (correction appliquée) |
| **Pagination** | `paginateItems`, logique 8/25 lignes | ✓ |
| **Devis** | Décline correctement le template, n'interfère pas avec facture | ✓ |

---

## 2. Fichiers modifiés liés au template facture PDF

**Composants (aucune modification du design) :**

- `app/components/invoice-pdf/` — tous les fichiers listés ci‑dessus.

**Corrections techniques uniquement :**

- `app/components/invoice-pdf/invoice-pdf.css` — ajout de `--inv-info-label-width: 26mm` (token manquant, fix layout).
- `next.config.ts` — CSP `img-src` : ajout de `https://*.public.blob.vercel-storage.com` pour les logos hébergés sur Vercel Blob.
- `docs/SECURITY_HEADERS.md` — mise à jour de la doc CSP.

**Fichiers associés (export, API) :**

- `app/pdf-export/admin/invoices/[id]/page.tsx`
- `app/pdf-export/comptable/invoices/[id]/page.tsx`
- `app/pdf-export/portal/invoices/[id]/page.tsx`
- `app/api/pdf/admin/invoices/[id]/route.ts`
- `app/api/pdf/portal/invoices/[id]/route.ts`
- `app/lib/pdf-route-handler.ts`
- `app/lib/pdf-external.ts` (PDFShift)
- `app/lib/invoice-pdf-pagination.ts`

**Fichiers exclus (brouillons / temporaires) :** Aucun identifié. Les archives dans `docs/archives/` et `AMELIORATIONS_FACTURE_PDF.md` sont de la doc, pas du code exécutable.

---

## 3. Risques production identifiés

| Risque | Gravité | Mitigation |
|--------|---------|------------|
| APP_URL non défini en prod | **Bloquant** | `validateVercelAppUrl()` renvoie une 500 explicite. Définir `APP_URL` dans Vercel → Environment Variables. |
| Logo 404 (chemin relatif) | **Moyen** | En prod avec Vercel Blob : logo uploadé → URL absolue. Sans Blob : re-uploader le logo après config de `BLOB_READ_WRITE_TOKEN`. |
| PDFShift absent → Puppeteer | **Élevé** | Puppeteer/Chromium ne tourne pas nativement sur Vercel. **Recommandé** : configurer `PDFSHIFT_API_KEY`. |
| Police Inter non chargée | **Faible** | Import Google Fonts via HTTPS. Connexion réseau requise au premier chargement. |

---

## 4. Corrections techniques appliquées

| Correction | Fichier | Justification |
|------------|---------|---------------|
| Ajout `--inv-info-label-width: 26mm` | `invoice-pdf.css` | Token référencé dans `grid-template-columns` mais absent de `:root`. Fix layout du bloc Informations. |
| CSP `img-src` + Blob storage | `next.config.ts` | Les logos uploadés sur Vercel Blob ont une URL `https://*.public.blob.vercel-storage.com`. Sans cet ajout, la CSP bloquait le chargement du logo dans le PDF. |
| Doc CSP | `docs/SECURITY_HEADERS.md` | Alignement de la doc avec la config. |
| Checklist validation | `docs/CHECKLIST_VALIDATION_PDF_VERCEL.md` | Nouveau doc pour tests Preview/Production. |

**Aucune modification du design validé.**

---

## 5. Checklist de validation Vercel

Voir **`docs/CHECKLIST_VALIDATION_PDF_VERCEL.md`**.

Résumé :

- Facture 1 page
- Facture 2+ pages (header compact, totaux dernière page)
- Logo page 1 et compact page 2
- Bloc informations, pagination stable
- Styles print, dévis si déployé

---

## 6. Commandes Git — suite à exécuter

**Option A — Branche preview (recommandée)**

```bash
# 1. Vérifier l'état
git status

# 2. Créer une branche preview pour tester avant main
git checkout -b preview/pdf-vercel-production-ready

# 3. Stager les fichiers modifiés
git add app/components/invoice-pdf/invoice-pdf.css
git add next.config.ts
git add docs/SECURITY_HEADERS.md
git add docs/CHECKLIST_VALIDATION_PDF_VERCEL.md
git add docs/LIVRABLE_PDF_VERCEL.md

# 4. Commit
git commit -m "chore(pdf): sécuriser template facture v1.0 pour Vercel

- Ajout --inv-info-label-width (fix layout bloc infos)
- CSP img-src: autoriser Vercel Blob pour logos
- Doc: CHECKLIST_VALIDATION_PDF_VERCEL, LIVRABLE_PDF_VERCEL
- Aucune modification du design validé"

# 5. Push
git push origin preview/pdf-vercel-production-ready
```

**Option B — Directement sur main**

```bash
git status
git add app/components/invoice-pdf/invoice-pdf.css next.config.ts docs/SECURITY_HEADERS.md docs/CHECKLIST_VALIDATION_PDF_VERCEL.md docs/LIVRABLE_PDF_VERCEL.md
git commit -m "chore(pdf): sécuriser template facture v1.0 pour Vercel"
git push origin main
```

**Après push :**

1. Déployer sur Vercel (Preview si branche preview, Production si main).
2. Exécuter `docs/CHECKLIST_VALIDATION_PDF_VERCEL.md`.
3. Si preview OK → merge vers `main` puis re‑tester en production.

---

## 7. Variables d'environnement à configurer sur Vercel

| Variable | Production | Preview |
|----------|------------|---------|
| `APP_URL` | **Obligatoire** (ex. `https://votre-app.vercel.app`) | Idem ou URL preview |
| `PDFSHIFT_API_KEY` | **Recommandé** | Recommandé |
| `BLOB_READ_WRITE_TOKEN` | Recommandé (logos) | Recommandé |
| `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` | Obligatoire | Idem |

---

## 8. Confirmation

**Le template facture PDF v1.0 est prêt pour déploiement sur Vercel.**

- Design validé : non modifié
- Corrections limitées à la compatibilité production
- Checklist de validation fournie
- Documentation mise à jour
