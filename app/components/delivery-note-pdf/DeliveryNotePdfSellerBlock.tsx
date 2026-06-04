import type { CompanySettings } from '@prisma/client'

type Props = {
  companySettings: CompanySettings | null
}

/** Identité vendeur — table 1 cellule pour éviter coupure PDFShift entre nom et adresse. */
export default function DeliveryNotePdfSellerBlock({ companySettings }: Props) {
  const name = companySettings?.name || 'SHAMED'

  return (
    <section className="invoice-pdf__seller-block">
      <table className="invoice-pdf__seller-table" role="presentation">
        <tbody>
          <tr>
            <td className="invoice-pdf__seller-table-cell">
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
                  {companySettings.address && <p>{companySettings.address}</p>}
                  {(companySettings.city || companySettings.country) && (
                    <p>
                      {[companySettings.city, companySettings.country]
                        .filter(Boolean)
                        .join(' – ')}
                    </p>
                  )}
                  {companySettings.ice && <p>ICE: {companySettings.ice}</p>}
                  {(companySettings.if || companySettings.rc || companySettings.tp) && (
                    <p className="invoice-pdf__company-details--ids">
                      {[
                        companySettings.if && `IF: ${companySettings.if}`,
                        companySettings.rc && `RC: ${companySettings.rc}`,
                        companySettings.tp && `TP: ${companySettings.tp}`,
                      ]
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  )}
                  {(companySettings.phone || companySettings.email) && (
                    <p>
                      {[
                        companySettings.phone && `Tél: ${companySettings.phone}`,
                        companySettings.email,
                      ]
                        .filter(Boolean)
                        .join(' – ')}
                    </p>
                  )}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
