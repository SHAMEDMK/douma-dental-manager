/**
 * Pied de page « Page 1 / 1 » pour les BL exportés (pas pour facture/devis premium).
 */
export default function PdfExportDeliveryNoteFooter() {
  return <div className="pdf-page-footer hidden print:block" aria-hidden />
}
