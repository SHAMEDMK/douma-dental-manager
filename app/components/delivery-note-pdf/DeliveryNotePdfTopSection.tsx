import type { CompanySettings } from '@prisma/client'
import { formatDateLong } from '@/lib/config'

type Props = {
  companySettings: CompanySettings | null
  blNumber: string
  createdAt: Date
  deliveryConfirmationCode?: string | null
}

function buildSellerLines(companySettings: CompanySettings): string {
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
  return lines.join('\n')
}

/** En-tête BL : une seule table 2 colonnes (stable PDFShift). */
export default function DeliveryNotePdfTopSection({
  companySettings,
  blNumber,
  createdAt,
  deliveryConfirmationCode,
}: Props) {
  const name = companySettings?.name || 'SHAMED'
  const sellerText = companySettings ? buildSellerLines(companySettings) : ''

  return (
    <table className="invoice-pdf__bl-top" role="presentation">
      <tbody>
        <tr>
          <td className="invoice-pdf__bl-top-left">
            {companySettings?.logoUrl && (
              <img
                src={companySettings.logoUrl}
                alt={name}
                className="invoice-pdf__logo"
              />
            )}
            <p className="invoice-pdf__bl-top-seller">
              <strong className="invoice-pdf__bl-top-name">{name}</strong>
              {sellerText ? `\n${sellerText}` : ''}
            </p>
          </td>
          <td className="invoice-pdf__bl-top-right">
            <h1 className="invoice-pdf__title">BON DE LIVRAISON</h1>
            <p className="invoice-pdf__title-sub">N° {blNumber}</p>
            <p className="invoice-pdf__title-sub">Date : {formatDateLong(createdAt)}</p>
            {deliveryConfirmationCode && (
              <p className="invoice-pdf__title-sub invoice-pdf__bl-confirm-code">
                Code livraison : {deliveryConfirmationCode}
              </p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
