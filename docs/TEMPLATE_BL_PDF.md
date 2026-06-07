# Template bon de livraison PDF — Règles et référence

**Version :** 1.0 (dérivé du template facture / BL portail)  
**Base CSS :** `app/components/invoice-pdf/invoice-pdf.css` (classes `.invoice-pdf--portal-bl`, `.invoice-pdf--admin-bl`)

---

## 1. Variantes

| Variante | Composant | Public | Tableau | Signatures |
|----------|-----------|--------|---------|------------|
| **Portail client** | `PortalDeliveryNotePdfDocument` | Client | Désignation + Qté + **prix HT/TTC** | Non |
| **Admin** | `AdminDeliveryNotePdfDocument` | Admin, compta, magasinier | Désignation + **Qté uniquement** | Oui (livreur / client) |

Numérotation BL : dérivée du n° commande (`CMD-2026-0049` → `BL-2026-0049`) via `getDeliveryNoteNumberFromOrderNumber`.

---

## 2. Structure commune

```
.invoice-pdf.invoice-pdf--portal-bl[.invoice-pdf--admin-bl]
└── .invoice-pdf__zone
    └── .invoice-pdf__page-block--single
        ├── DeliveryNotePdfTopSection (table 2 colonnes : vendeur | titre BL)
        ├── .invoice-pdf__cards (LIVRÉ À | Informations)
        ├── DeliveryNotePdfTable
        ├── [admin] DeliveryNotePdfSignatures
        ├── [portail] DeliveryNotePdfTotals + disclaimer
        └── InvoicePdfFooter
```

---

## 3. En-tête (`DeliveryNotePdfTopSection`)

- **Gauche :** logo + raison sociale + adresse (texte préformaté, `white-space: pre-line`)
- **Droite :** titre « BON DE LIVRAISON », N° BL, date, code livraison (si présent)
- Prop `title` optionnelle (réutilisée par le bon de commande fournisseur)

---

## 4. Routes

| Usage | Portail | Admin |
|-------|---------|-------|
| Aperçu navigateur | `/portal/orders/[id]/delivery-note/print` | `/admin/orders/[id]/delivery-note` |
| Export PDFShift | `/pdf-export/portal/orders/[id]/delivery-note` | `/pdf-export/admin/orders/[id]/delivery-note` |
| API téléchargement | `/api/pdf/portal/orders/[id]/delivery-note` | `/api/pdf/admin/orders/[id]/delivery-note` |

---

## 5. Garde-fous portail

`isDeliveryNoteAvailable` (`app/lib/delivery-note-access.ts`) : BL visible seulement si `deliveryNoteNumber` est défini et statut ∈ `PREPARED`, `SHIPPED`, `DELIVERED`.

---

## 6. Fichiers

| Fichier | Rôle |
|---------|------|
| `PortalDeliveryNotePdfDocument.tsx` | BL client (prix) |
| `AdminDeliveryNotePdfDocument.tsx` | BL admin (qty + signatures) |
| `DeliveryNotePdfTopSection.tsx` | En-tête table 2 colonnes |
| `DeliveryNotePdfClientCard.tsx` | Carte « LIVRÉ À » |
| `DeliveryNotePdfInfoCard.tsx` | N° BL, date, N° CMD |
| `DeliveryNotePdfTable.tsx` | Prop `showPrices` (défaut `true`) |
| `DeliveryNotePdfSignatures.tsx` | Signatures admin uniquement |
| `DeliveryNotePdfTotals.tsx` | Totaux HT/TVA/TTC (portail) |

**Ne pas modifier le design** sauf correction de bug. Voir aussi `docs/TEMPLATE_FACTURE_PDF.md`.
