/**
 * Layout minimal pour l'export PDF (PDFShift).
 * Aucune sidebar ni en-tête : seul le contenu de la page est rendu.
 * Les routes sous /pdf-export/* sont utilisées uniquement par l'API PDF.
 */
export default function PdfExportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
