/**
 * Pied de page pour les factures en impression/PDF.
 * - #4: Numérotation "Page X / Y" (via CSS counter, support variable selon le moteur PDF)
 * - #6: Site web, email, coordonnées et "Merci pour votre confiance"
 */
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

export default function InvoicePrintFooter({
  companySettings,
}: {
  companySettings: { email?: string | null; name?: string | null } | null
}) {
  const website = getDisplayWebsite()
  const hasContact = companySettings?.email || companySettings?.name || website

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .invoice-print-footer {
              margin-top: 2rem;
              padding: 6px 16px;
              font-size: 10pt;
              color: #666;
              text-align: center;
              border-top: 1px solid #999;
              background: white;
            }
            @media print {
              @page {
                margin-bottom: 2.5cm;
              }
            }
          `,
        }}
      />
      <footer className="invoice-print-footer block">
        <div className="invoice-page-num text-[10pt] font-medium">Page 1 / 1</div>
        {hasContact && (
          <div className="mt-1 text-[9pt]">
            {[companySettings?.name, companySettings?.email, website].filter(Boolean).join(' • ')}
          </div>
        )}
        <div className="mt-0.5 text-[9pt] italic">Merci pour votre confiance</div>
      </footer>
    </>
  )
}
