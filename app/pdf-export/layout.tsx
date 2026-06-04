/**
 * Layout minimal pour l'export PDF (PDFShift).
 * Aucune sidebar ni en-tête : seul le contenu de la page est rendu.
 * Le pied « Page X / Y » est ajouté uniquement sur les BL (voir PdfExportDeliveryNoteFooter).
 */
export default function PdfExportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
