import type { CompanySettings } from '@prisma/client'

type Props = {
  companySettings: CompanySettings | null
}

function buildSellerLines(companySettings: CompanySettings): string[] {
  const lines: string[] = []
  if (companySettings.address) lines.push(companySettings.address)
  const locality = [companySettings.city, companySettings.country].filter(Boolean).join(' – ')
  if (locality) lines.push(locality)
  if (companySettings.ice) lines.push(`ICE: ${companySettings.ice}`)
  const ids = [
    companySettings.if && `IF: ${companySettings.if}`,
    companySettings.rc && `RC: ${companySettings.rc}`,
    companySettings.tp && `TP: ${companySettings.tp}`,
  ].filter(Boolean)
  if (ids.length) lines.push(ids.join(' / '))
  const contact = [
    companySettings.phone && `Tél: ${companySettings.phone}`,
    companySettings.email,
  ].filter(Boolean)
  if (contact.length) lines.push(contact.join(' – '))
  return lines
}

/** Identité vendeur — texte en un seul bloc (évite fragmentation PDFShift). */
export default function DeliveryNotePdfSellerBlock({ companySettings }: Props) {
  const name = companySettings?.name || 'SHAMED'
  const detailLines = companySettings ? buildSellerLines(companySettings) : []

  return (
    <section className="invoice-pdf__seller-block">
      {companySettings?.logoUrl && (
        <img
          src={companySettings.logoUrl}
          alt={name}
          className="invoice-pdf__logo"
        />
      )}
      <h2 className="invoice-pdf__company-name">{name}</h2>
      {detailLines.length > 0 && (
        <p className="invoice-pdf__seller-lines">{detailLines.join('\n')}</p>
      )}
    </section>
  )
}
