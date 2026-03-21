import QRCode from 'qrcode'

/**
 * QR code facture — 24x24mm pour le template PDF premium.
 */
export default async function InvoicePdfQRCode({
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
    width: 280, // 24mm @ ~300dpi pour rendu PDF net
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  return (
    <div className="invoice-pdf__qr-wrap">
      <img
        src={dataUrl}
        alt="QR Code facture"
        className="invoice-pdf__qr-img"
        width={280}
        height={280}
        style={{ width: '24mm', height: '24mm', objectFit: 'contain' }}
      />
      <span className="invoice-pdf__qr-legend">Scan pour voir la facture</span>
    </div>
  )
}
