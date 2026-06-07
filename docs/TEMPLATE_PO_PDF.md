# Template bon de commande fournisseur PDF — Rèférence

**Version :** 1.0 (option B — sans prix fournisseur)  
**Base CSS :** `invoice-pdf.css` (classes `.invoice-pdf--portal-bl`, `.invoice-pdf--purchase-order`)

---

## 1. Règle métier (option B)

Le PDF envoyé au fournisseur affiche **uniquement** :
- Désignation + référence produit
- Quantités commandées

**Les coûts saisis en base** (écran admin) **ne sont pas** reproduits sur le PDF, même s’ils sont > 0.

---

## 2. Structure

| Zone | Contenu |
|------|---------|
| En-tête gauche | **COMMANDÉ PAR** + SHAMED SARL (logo, adresse, ICE…) |
| En-tête droite | BON DE COMMANDE, N° PO-YYYY-NNNN, date |
| Carte FOURNISSEUR | Nom, code, adresse, ville, tél., e-mail, ICE |
| Carte Informations | Statut, date d’envoi |
| Tableau | Désignation, Qté |
| Pied de page | `InvoicePdfFooter` |

---

## 3. Routes

| Usage | Chemin |
|-------|--------|
| Aperçu | `/admin/purchases/[id]/print` |
| PDFShift | `/pdf-export/admin/purchases/[id]` |
| API | `/api/pdf/admin/purchases/[id]` |

---

## 4. Fichiers

| Fichier | Rôle |
|---------|------|
| `PurchaseOrderPdfDocument.tsx` | Orchestrateur |
| `PurchaseOrderPdfSupplierCard.tsx` | Carte fournisseur |
| `PurchaseOrderPdfInfoCard.tsx` | Métadonnées PO |
| `PurchaseOrderPdfTable.tsx` | Lignes (qty only) |
| `app/lib/purchase-order-pdf-data.ts` | Chargement données |

`DeliveryNotePdfTopSection` : props `title="BON DE COMMANDE"`, `sellerLabel="COMMANDÉ PAR"`.
