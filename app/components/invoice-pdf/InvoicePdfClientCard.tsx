type User = {
  clientCode: string | null
  companyName: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
}

type Props = {
  user: User
}

export default function InvoicePdfClientCard({ user }: Props) {
  const clientName = user.companyName ?? user.name ?? user.email ?? '—'

  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">FACTURÉ À</div>
      <div className="invoice-pdf__card-body">
        <p className="invoice-pdf__client-name">{clientName}</p>
        {user.email && <p className="invoice-pdf__client-detail">{user.email}</p>}
        {user.phone && <p className="invoice-pdf__client-detail">{user.phone}</p>}
        {(user.address || user.city) && (
          <p className="invoice-pdf__client-detail">
            {[user.address, user.city].filter(Boolean).join(', ')}
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
