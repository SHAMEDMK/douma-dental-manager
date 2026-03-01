/**
 * Layout minimal pour l'export PDF (PDFShift).
 * Aucune sidebar ni en-tête : seul le contenu de la page est rendu.
 * Numérotation "Page X / Y" en bas de chaque page en impression/PDF.
 */
export default function PdfExportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/* Pied de page pour impression/PDF : Page 1 / 3 (masqué à l'écran) */}
      <div className="pdf-page-footer hidden print:block" aria-hidden />
    </>
  );
}
