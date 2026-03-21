quel est la premiere chose a fire de mon cote# Améliorations proposées pour la facture PDF

Basé sur l'aperçu de la facture actuelle (logo SHAMED, SHAMED SARL, LABO NADIA).

---

## 1. Symbole de devise (priorité haute)

**Problème** : Les montants (25.00, 75.00, 103.20, etc.) sont affichés sans devise.

**Solution** : Ajouter "Dh" (ou la devise configurée) à tous les montants.

- Utiliser `formatMoneyWithCurrency` au lieu de `formatMoney` sur les factures
- Ou ajouter une colonne "Devise" dans l'en-tête du tableau : "Prix unitaire HT (Dh)"
- Fichiers concernés : `app/admin/invoices/[id]/print/page.tsx`, `app/portal/invoices/[id]/print/page.tsx`, `app/comptable/invoices/[id]/print/page.tsx`

---

## 2. Espacement et lisibilité ✅ (fait)

**Problème** : Espacement parfois serré entre les blocs (SHAMED SARL, Facturé à, Informations).

**Solution** (appliquée) :
- Augmenter `space-y` ou `gap` entre les sections
- Ajouter `print:leading-relaxed` pour un interligne plus confortable
- Ex. : `mt-8` → `mt-10` pour la section client

---

## 3. Séparation visuelle ✅ (fait)

**Problème** : La ligne entre "Reste à payer" et "Facture arrêtée à la somme de" est peu marquée.

**Solution** (appliquée) :
- Remplacer `border-t` par `border-t-2 border-gray-400`
- Ou ajouter une marge plus visible (`pt-6` au lieu de `pt-4`)

---

## 4. Numérotation des pages ✅ (fait)

**Problème** : Pas de "Page 1 / 1" pour les factures longues ; `counter(page)` retourne 0/0 avec certains moteurs PDF (PDFShift, etc.).

**Solution** (appliquée) :
- Footer fixe en impression : `@media print { footer { position: fixed; bottom: 0; } }`
- Texte fixe "Page 1 / 1" (les compteurs CSS ne sont pas fiables selon le moteur)
- Composant partagé : `app/components/InvoicePrintFooter.tsx`

---

## 5. Taille du logo en impression ✅ (fait)

**Problème** : Le logo en print est à `h-10` (40px), peut-être un peu petit.

**Solution** (appliquée) :
- Tester `print:h-12` ou `print:h-14` pour un logo plus visible
- Garder le ratio avec `object-contain` — appliqué `print:h-12`

---

## 6. Pied de page ✅ (fait)

**Problème** : Pas de footer avec site web ou coordonnées.

**Solution** (appliquée) :
- Bloc en bas : nom entreprise, email (companySettings), site web (NEXT_PUBLIC_APP_URL / APP_URL), "Merci pour votre confiance"
- Composant `InvoicePrintFooter` — site web dérivé des variables d'environnement (sans protocole)

---

## 7bis. Banque/RIB — masqués si vides ✅ (fait)

**Problème** : Les labels Banque et RIB occupent de l'espace même quand vides.

**Solution** (appliquée) : Afficher le bloc uniquement si `bankName` ou `rib` est renseigné dans CompanySettings.

---

## 7. QR code ✅ (fait)

**Idée** : QR code pointant vers la facture en ligne ou contenant les infos essentielles (n° facture, montant TTC).

**Implémentation** (appliquée) : Lib `qrcode`, génération côté serveur. Si `APP_URL`/`NEXT_PUBLIC_APP_URL` défini → URL vers `/portal/invoices/[id]`. Sinon → texte structuré (n° facture, montant TTC, date). Composant `InvoiceQRCode` déplacé en haut à droite (zone dégagée, plus visible). Numérotation pages : "Page 1 / 1" (fixe ; counter(page) retourne 0/0 avec certains moteurs PDF).

---

## 8. Mise en page compacte pour tenir sur une page ✅ (fait)

**Problème** : Factures avec 10+ lignes dépassaient une page A4.

**Solution** (appliquée) :
- Marges d'impression réduites (8mm, bottom 12mm)
- En-tête et blocs Facturé à/Informations plus compacts (logo h-10, padding réduit)
- Tableau : cellules `py-0.5`, texte 10–11px
- Totaux et mentions : marges réduites, interlignes serrés
- Pied de page réduit
- Appliqué aux pages pdf-export admin, portal, comptable

---

## 9. Template PDF premium A4 portrait ✅ (fait)

**Objectif** : Design sobre, professionnel, médical/dentaire B2B.

**Charte** :
- Bleu principal #1F355E, texte #222222, séparateurs #D9DEE7, fond section #F5F7FA
- Police Inter, tailles : FACTURE 22pt, société 13pt, titres 9.5pt, texte 9pt, Total TTC 14pt, footer 8.5pt

**Mise en page** :
- Format A4 portrait, marges 14/12mm, zone utile 186×269mm
- Header 34mm, logo max 14mm, QR 24×24mm
- Blocs client/infos : 2 cartes 93mm, min-height 40mm, bande titre 10mm
- Tableau : Désignation 108mm, Qté 18mm, PU HT 30mm, Total HT 30mm
- Bloc totaux 66mm à droite, montant en lettres 112mm à gauche
- Footer 14mm

**Composants** (réutilisables) :
- `app/components/invoice-pdf/` : InvoicePdfDocument, Header, ClientCard, InfoCard, Table, Totals, AmountBlock, Footer
- Styles centralisés : `invoice-pdf.css`

---

## Priorisation

| # | Amélioration        | Effort | Impact | Statut |
|---|---------------------|--------|--------|--------|
| 1 | Symbole devise (Dh) | Faible | Élevé  | ✅ |
| 2 | Espacement          | Faible | Moyen  | ✅ |
| 3 | Séparation visuelle | Faible | Faible | ✅ |
| 4 | Numérotation pages  | Moyen  | Moyen  | ✅ |
| 5 | Taille logo         | Faible | Faible | ✅ |
| 6 | Pied de page        | Moyen  | Moyen  | ✅ |
| 7 | QR code             | Élevé  | Optionnel | ✅ |
| 8 | Mise en page compacte | Faible | Élevé | ✅ |

---

## Fichiers à modifier

- `app/admin/invoices/[id]/print/page.tsx`
- `app/portal/invoices/[id]/print/page.tsx`
- `app/comptable/invoices/[id]/print/page.tsx`
- `app/pdf-export/admin/invoices/[id]/page.tsx`
- `app/pdf-export/portal/invoices/[id]/page.tsx`
- `app/pdf-export/comptable/invoices/[id]/page.tsx`
- `app/lib/invoice-utils.ts` (ou `lib/config/app-config.ts` pour la devise)
