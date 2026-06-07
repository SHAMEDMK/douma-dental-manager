type User = {
  clientCode: string | null
  companyName: string | null
  name: string
  email: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  ice?: string | null
}

type Props = {
  user: User
  /** Adresse de livraison commande (prioritaire sur user.address/city) */
  deliveryAddress?: string | null
  deliveryCity?: string | null
}

export default function DeliveryNotePdfClientCard({
  user,
  deliveryAddress,
  deliveryCity,
}: Props) {
  const clientName = user.companyName ?? user.name ?? user.email ?? '—'
  const addressLine = deliveryAddress ?? user.address ?? null
  const cityLine = deliveryCity ?? user.city ?? null

  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">LIVRÉ À</div>
      <div className="invoice-pdf__card-body">
        <p className="invoice-pdf__client-name">{clientName}</p>
        {user.email && <p className="invoice-pdf__client-detail">{user.email}</p>}
        {user.phone && <p className="invoice-pdf__client-detail">{user.phone}</p>}
        {(addressLine || cityLine) && (
          <p className="invoice-pdf__client-detail">
            {[addressLine, cityLine].filter(Boolean).join(', ')}
          </p>
        )}
        {user.ice && <p className="invoice-pdf__client-detail">ICE: {user.ice}</p>}
        {user.clientCode && (
          <p className="invoice-pdf__client-code">Code: {user.clientCode}</p>
        )}
      </div>
    </div>
  )
}
