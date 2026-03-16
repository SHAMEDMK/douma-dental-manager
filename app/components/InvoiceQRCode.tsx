import QRCode from 'qrcode'

/**
 * QR code pour la facture (PDF #7).
 * Contient : URL vers la facture en ligne ou infos essentielles (n° facture, montant TTC).
 */
export default async function InvoiceQRCode({
  invoiceId,
  invoiceNumber,
  amountTTC,
  createdAt,
}: {
  invoiceId: string
  invoiceNumber: string | null
  amountTTC: number
  createdAt: Date
}) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  const dateStr = createdAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const text = baseUrl
    ? `${baseUrl}/portal/invoices/${invoiceId}`
    : `FACTURE\nN°: ${invoiceNumber || invoiceId.slice(-8)}\nMontant TTC: ${amountTTC.toFixed(2)} Dh\nDate: ${dateStr}`

  const dataUrl = await QRCode.toDataURL(text, {
    width: 80,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 p-2 print:p-1">
      <img
        src={dataUrl}
        alt="QR Code facture"
        className="w-16 h-16 print:w-20 print:h-20"
      />
      <span className="text-[8pt] text-gray-500">Scan pour voir la facture</span>
    </div>
  )
}
