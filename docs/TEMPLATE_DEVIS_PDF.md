# Template devis PDF — Règles et référence

**Version :** 1.0 (dérivé du template facture v1.0)  
**Base :** `app/components/invoice-pdf/` (template figé, ne pas modifier)

---

## 1. Structure

Le devis réutilise **intégralement** la structure et les classes CSS du template facture :

- `.invoice-pdf`, `.invoice-pdf__zone`, `.invoice-pdf__page-block`
- Pagination identique (`paginateItems`, 8 lignes page 1, 25 suivantes)
- Même logique de `page-block-spacer` + footer

---

## 2. Spécificités devis

| Élément | Facture | Devis |
|--------|---------|-------|
| Titre | FACTURE | **DEVIS** |
| Sous-titre | Document officiel | Proposal commerciale |
| QR code | Oui (scan facture) | Non — affichage N° devis |
| Carte client | FACTURÉ À | **DEVIS POUR** |
| Infos document | N° Facture, Date, N° CMD, N° BL, Statut | N° Devis, Date, **Valable jusqu'au**, N° CMD (si existe), Statut |
| Totaux | HT, TVA, TTC, payé, reste à payer | HT, TVA, TTC uniquement |
| Montant en lettres | Facture arrêtée à la somme de... | **Devis établi à la somme de...** |
| Mentions | CGV, banque, TVA, retard | **Validité 30 j**, conditions d'acceptation, paiement, banque |

---

## 3. Données et sources

- **Source** : `Order` (commande) — pas de modèle Quote dédié
- **N° Devis** : `getQuoteNumberFromOrderNumber(orderNumber, createdAt)` → `DEV-YYYYMMDD-XXXX`
- **Statut** : dérivé de l’ordre — En attente / Accepté (si facture) / Refusé (si annulé)
- **Validité** : `createdAt + 30 jours` par défaut

---

## 4. Fichiers

| Fichier | Rôle |
|---------|------|
| `app/components/devis-pdf/DevisPdfDocument.tsx` | Orchestrateur principal |
| `app/components/devis-pdf/DevisPdfHeader.tsx` | En-tête page 1 (DEVIS) |
| `app/components/devis-pdf/DevisPdfHeaderCompact.tsx` | En-tête pages 2+ |
| `app/components/devis-pdf/DevisPdfClientCard.tsx` | Carte « DEVIS POUR » |
| `app/components/devis-pdf/DevisPdfInfoCard.tsx` | Infos devis |
| `app/components/devis-pdf/DevisPdfTotals.tsx` | Totaux HT/TVA/TTC |
| `app/components/devis-pdf/DevisPdfAmountBlock.tsx` | Montant + mentions devis |
| `app/components/devis-pdf/devis-pdf.css` | Import de `invoice-pdf.css` |

**Réutilisés** : `InvoicePdfTable`, `InvoicePdfFooter`, `paginateItems`, design tokens.

---

## 5. API et export

- **Page** : `app/pdf-export/admin/orders/[id]/devis/page.tsx`
- **API** : `GET /api/pdf/admin/orders/[id]/devis`
- **Rôles** : ADMIN, COMPTABLE, MAGASINIER, COMMERCIAL
- **Téléchargement** : `/api/pdf/admin/orders/{orderId}/devis` → `DEV-YYYYMMDD-XXXX.pdf`

---

## 6. Intégration UI

Pour ajouter un bouton « Télécharger le devis » sur une commande :

```tsx
<a
  href={`/api/pdf/admin/orders/${order.id}/devis`}
  download
  target="_blank"
  rel="noopener noreferrer"
>
  Télécharger le devis PDF
</a>
```
