type CompanySettings = {
  name: string | null
  email: string | null
}

function getDisplayWebsite(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!url?.trim()) return null
  try {
    const clean = url.replace(/\/$/, '').replace(/^https?:\/\//i, '')
    return clean || null
  } catch {
    return null
  }
}

export default function InvoicePdfFooter({
  companySettings,
  currentPage = 1,
  totalPages = 1,
}: {
  companySettings: CompanySettings | null
  /** Numéro de la page courante (1-based). */
  currentPage?: number
  /** Nombre total de pages. */
  totalPages?: number
}) {
  const website = getDisplayWebsite()
  const line1 = [companySettings?.name, companySettings?.email, website]
    .filter(Boolean)
    .join(' • ')

  return (
    <footer className="invoice-pdf__footer">
      {line1 && <p className="invoice-pdf__footer-line1">{line1}</p>}
      <p className="invoice-pdf__footer-line2">
        <span className="invoice-pdf__footer-merci">Merci pour votre confiance</span>
        <span className="invoice-pdf__footer-page" aria-label="Numéro de page">
          Page {currentPage} / {totalPages}
        </span>
      </p>
    </footer>
  )
}
