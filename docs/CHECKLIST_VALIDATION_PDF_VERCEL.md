# Checklist de validation PDF — Vercel (Preview et Production)

**Template facture PDF v1.0** — À exécuter après chaque déploiement Preview puis Production.

---

## Prérequis variables d'environnement

| Variable | Obligatoire pour PDF | Notes |
|----------|----------------------|-------|
| `APP_URL` | **Oui** (production) | URL publique (ex. `https://votre-app.vercel.app`). Requise pour génération PDF sur Vercel. |
| `PDFSHIFT_API_KEY` | Recommandé | Évite Chromium/Puppeteer. Créez une clé sur https://pdfshift.io |
| `BLOB_READ_WRITE_TOKEN` | Recommandé si logo | Upload logo → Blob. Sinon logo = chemin relatif (risque 404 en prod). |
| `NEXT_PUBLIC_APP_URL` | Optionnel | Fallback pour QR code facture (URL dans le QR). |

---

## 1. Facture 1 page

- [ ] Créer ou ouvrir une facture avec **≤ 8 lignes** de produits
- [ ] Télécharger le PDF (admin ou comptable)
- [ ] Vérifier :
  - [ ] Header complet (logo, société, FACTURE, QR code)
  - [ ] Cartes « Facturé à » et « Informations » visibles
  - [ ] Tableau produits (Désignation, Qté, PU, Total)
  - [ ] Totaux (HT, TVA, TTC, payé, reste)
  - [ ] Montant en lettres
  - [ ] Footer « Merci pour votre confiance » + « Page 1 / 1 »

---

## 2. Facture 2 pages et plus

- [ ] Créer ou ouvrir une facture avec **≥ 9 lignes** (idéalement 15+ pour voir pagination)
- [ ] Télécharger le PDF
- [ ] Vérifier :
  - [ ] **Page 1** : header complet, cartes, début tableau
  - [ ] **Page 2+** : header compact (logo réduit, FACTURE + n° réf.)
  - [ ] Totaux **uniquement sur la dernière page**
  - [ ] Footer correct sur chaque page : « Page X / Y »

---

## 3. Logo

- [ ] **Page 1** : logo 14mm hauteur max, aligné en haut à gauche
- [ ] **Page 2+** (si facture multi-pages) : logo compact 8mm dans le header compact
- [ ] Logo **transparent** (PNG/SVG) si fond clair → pas de carré blanc
- [ ] Si pas de logo configuré : pas d’erreur, la zone reste vide

---

## 4. Bloc informations

- [ ] N° Facture, Date, N° CMD (si existant), N° BL (si existant)
- [ ] Statut avec badge (Payée / Partiellement payée / Impayée)
- [ ] Valeurs alignées, lisibles, pas de débordement

---

## 5. Pagination stable

- [ ] Lignes produits **jamais coupées** entre 2 pages
- [ ] Dernière page : pas de page quasi vide (< 6 lignes) grâce au rééquilibrage
- [ ] En-tête du tableau répété sur chaque page (display: table-header-group)

---

## 6. Styles print / build production

- [ ] Pas de saut de mise en page bizarre
- [ ] Marges A4 respectées (14mm haut/bas, 12mm gauche/droite)
- [ ] Police Inter chargée (pas de fallback visible)
- [ ] Couleurs : bleu primaire `#1F355E`, texte `#222222`

---

## 7. Dévis (si déployé)

- [ ] Télécharger un devis PDF depuis détail commande
- [ ] Titre « DEVIS », pas « FACTURE »
- [ ] Infos : N° Devis, Date, Validité, Statut
- [ ] Pas de N° BL ni statut paiement
- [ ] Totaux : HT, TVA, TTC uniquement

---

## 8. Erreurs à éviter

| Problème | Cause probable | Action |
|----------|----------------|--------|
| « APP_URL non défini » | Variable manquante en prod | Vercel → Env → `APP_URL` |
| Logo 404 ou absent | URL relative + pas de Blob | Configurer `BLOB_READ_WRITE_TOKEN`, re-uploader le logo |
| QR code mauvaise URL | `APP_URL` ou `NEXT_PUBLIC_APP_URL` incorrect | Corriger l’URL publique |
| « Chromium indisponible » | Puppeteer sur Vercel (sans PDFShift) | Ajouter `PDFSHIFT_API_KEY` |

---

## Ordre de validation

1. **Preview** : déployer sur une branche, tester selon cette checklist
2. **Production** : merge vers `main`, re-tester les mêmes points
3. Documenter tout écart constaté
