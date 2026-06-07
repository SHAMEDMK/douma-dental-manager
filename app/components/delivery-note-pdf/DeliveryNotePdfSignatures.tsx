/** Zone signatures livreur / client (BL admin). */
export default function DeliveryNotePdfSignatures() {
  return (
    <div className="invoice-pdf__signatures">
      <div className="invoice-pdf__signature-block">
        <div className="invoice-pdf__signature-line" />
        <p className="invoice-pdf__signature-label">Cachet &amp; signature livreur</p>
        <p className="invoice-pdf__signature-hint">Nom : _____________________</p>
      </div>
      <div className="invoice-pdf__signature-block">
        <div className="invoice-pdf__signature-line" />
        <p className="invoice-pdf__signature-label">Cachet &amp; signature client</p>
        <p className="invoice-pdf__signature-hint">Nom : _____________________</p>
        <p className="invoice-pdf__signature-hint invoice-pdf__signature-hint--spaced">
          Date / Heure de réception :
        </p>
        <p className="invoice-pdf__signature-hint">_____________________</p>
      </div>
    </div>
  )
}
