import { FileSpreadsheet, Download } from 'lucide-react'

type ExportExcelLinkProps = {
  href: string
  title?: string
}

/** Bouton compact : icône Excel + flèche de téléchargement. Tooltip "Exporter Excel" par défaut. */
export function ExportExcelLink({ href, title = 'Exporter Excel' }: ExportExcelLinkProps) {
  return (
    <a
      href={href}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center gap-1 p-2 rounded-md text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors"
    >
      <FileSpreadsheet className="w-4 h-4 shrink-0" />
      <Download className="w-[14px] h-[14px] shrink-0" aria-hidden />
    </a>
  )
}
