import type { CompanySettings } from '@prisma/client'

type Props = {
  companySettings: CompanySettings | null
  quoteNumber: string
}

/** Header page 1 — identique au facture sauf titre DEVIS et pas de QR. */
export default function DevisPdfHeader({ companySettings, quoteNumber }: Props) {
  const name = companySettings?.name || 'DOUMA Dental Manager'

  return (
    <header className="invoice-pdf__header">
      <div className="invoice-pdf__header-left">
        {companySettings?.logoUrl && (
          <img
            src={companySettings.logoUrl}
            alt={name}
            className="invoice-pdf__logo"
          />
        )}
        <h2 className="invoice-pdf__company-name">{name}</h2>
        {companySettings && (
          <div className="invoice-pdf__company-details">
            {companySettings.address && <p style={{ margin: 0 }}>{companySettings.address}</p>}
            {(companySettings.city || companySettings.country) && (
              <p style={{ margin: '1px 0 0 0' }}>
                {[companySettings.city, companySettings.country].filter(Boolean).join(' – ')}
              </p>
            )}
            {companySettings.ice && <p style={{ margin: '1px 0 0 0' }}>ICE: {companySettings.ice}</p>}
            {(companySettings.if || companySettings.rc || companySettings.tp) && (
              <p style={{ margin: '1px 0 0 0', fontSize: '8.5pt' }}>
                {[companySettings.if && `IF: ${companySettings.if}`, companySettings.rc && `RC: ${companySettings.rc}`, companySettings.tp && `TP: ${companySettings.tp}`].filter(Boolean).join(' / ')}
              </p>
            )}
            {(companySettings.phone || companySettings.email) && (
              <p style={{ margin: '1px 0 0 0' }}>
                {[companySettings.phone && `Tél: ${companySettings.phone}`, companySettings.email].filter(Boolean).join(' – ')}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="invoice-pdf__header-right">
        <h1 className="invoice-pdf__title">DEVIS</h1>
        <p className="invoice-pdf__title-sub">Proposition commerciale</p>
        <div className="invoice-pdf__qr-wrap">
          <span className="invoice-pdf__qr-legend" style={{ marginTop: '2mm' }}>
            N° {quoteNumber}
          </span>
        </div>
      </div>
    </header>
  )
}
