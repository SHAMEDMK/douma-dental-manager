/**
 * Layout minimal pour l'export PDF (PDFShift).
 * Aucune sidebar ni en-tête : seul le contenu de la page est rendu.
 * Les documents utilisent InvoicePdfFooter / template invoice-pdf intégré.
 */
export default function PdfExportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
