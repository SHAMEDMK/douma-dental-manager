# Template facture PDF — Règles et référence

**Version :** 1.0 (base officielle figée)  
**Ne pas modifier le design** sauf correction de bug.

---

## 1. Structure générale

```
.invoice-pdf
└── .invoice-pdf__zone
    └── [pour chaque page]
        .invoice-pdf__page-block
        ├── .invoice-pdf__page-block-content
        │   ├── Header (complet ou compact)
        │   ├── .invoice-pdf__cards (page 1 uniquement)
        │   ├── .invoice-pdf__table-wrap (tableau)
        │   └── .invoice-pdf__bottom (totaux, dernière page uniquement)
        ├── .invoice-pdf__page-block-spacer
        └── .invoice-pdf__footer
```

---

## 2. Pagination

**Fichier :** `app/lib/invoice-pdf-pagination.ts`

| Règle | Valeur |
|-------|--------|
| Lignes max page 1 | 8 |
| Lignes max pages 2+ | 25 |
| Rééquilibrage : min lignes dernière page | 6 |
| Min lignes par page (rééquilibrage) | 4 |

**Comportement :**
- 1 à 8 lignes produits → une seule page
- 9 lignes et + → page 1 limitée à 8, suite sur page(s) suivante(s)
- Si la dernière page a &lt; 6 lignes → déplacer des lignes depuis la page précédente
- Chaque page a son propre footer avec `Page X / Y` (calculé côté TS, pas CSS)

---

## 3. Header page 1

- **Logo** : 14mm max-height, ancré en haut à gauche
- **Nom société** : 13.5pt, bold, bleu primaire
- **Coordonnées** : 9.5pt, alignées en haut
- **Droite** : FACTURE 23pt, "Document officiel", QR code
- **Alignement** : `align-items: flex-start` sur tout le bloc gauche

---

## 4. Header compact (pages 2+)

- **Logo compact** : 8mm max-height, PNG/SVG à fond transparent requis
- **Nom société** : 12pt
- **Droite** : FACTURE 18pt + référence facture
- **Style** : bordure basse, fond dégradé léger
- Affiché uniquement sur les pages de continuation

---

## 5. Cartes (page 1 uniquement)

- **FACTURÉ À** : client, email, code
- **INFORMATIONS** : grille 26mm (libellés) + 1fr (valeurs)
  - N° Facture, Date, N° CMD, N° BL, Statut
  - Valeurs alignées à gauche, `white-space: nowrap`, ellipsis si débordement
  - Badge Statut discret (8.5pt, padding réduit)

---

## 6. Tableau

- **En-tête** : répété sur chaque page (`display: table-header-group`)
- **Désignation** : max 2 lignes (`-webkit-line-clamp: 2`)
- **Lignes** : `page-break-inside: avoid` (jamais coupées)
- **Mode compact** (`invoice-pdf--many-lines`) : &gt; 15 lignes → hauteur 6.5mm

---

## 7. Totaux (dernière page uniquement)

- **Bloc totaux** : HT, TVA, TTC, payé, reste à payer
- **Montant en lettres** : à gauche du bloc totaux
- **Conditions** : banque, RIB, mentions
- `break-inside: avoid` en impression

---

## 8. Footer

- **Chaque page** a son propre footer (dans le flux, pas `position: fixed`)
- **Contenu** : société • email • site | Merci pour votre confiance | Page X / Y
- Numéros passés explicitement : `currentPage`, `totalPages`

---

## 9. Hauteur de page

- **Variable** : `--inv-print-page-height: 269mm`
- **Ne pas utiliser 277mm** : provoque débordement et articles/footer repoussés sur page suivante
- Zone A4 : 297mm - marges @page

---

## 10. Design tokens (invoice-pdf.css)

```css
--inv-primary: #1F355E;
--inv-text: #222222;
--inv-separator: #D9DEE7;
--inv-bg-section: #F5F7FA;
--inv-zone-width: 186mm;
--inv-zone-height: 269mm;
--inv-print-page-height: 269mm;
--inv-header-height: 34mm;
--inv-footer-height: 14mm;
--inv-logo-max-height: 14mm;
--inv-logo-compact-height: 8mm;
--inv-info-label-width: 26mm;
--inv-table-col-* : largeurs colonnes
--inv-totals-width: 66mm;
--inv-amount-width: 112mm;
```

---

## 11. Base pour futurs documents

Ce template sert de **référence** pour :

| Document | Spécificités prévues |
|----------|----------------------|
| Devis | Titre "DEVIS", statut différent, pas de BL |
| Bon de livraison | Titre "BON DE LIVRAISON", colonnes adaptées |
| Avoir | Titre "AVOIR", montants négatifs |
| Reçu | Titre "REÇU", structure allégée |

**À réutiliser :**
- Structure `page-block` + spacer + footer
- Pagination (`paginateItems`)
- Design tokens (`:root`)
- Composants : Header, HeaderCompact, Cards, Table, Footer

**À adapter :**
- Titre et sous-titre
- Contenu des cartes (libellés)
- Colonnes du tableau
- Bloc totaux / montant
