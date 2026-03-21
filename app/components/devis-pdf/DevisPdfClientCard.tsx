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

/** Carte client pour devis — libellé "DEVIS POUR". */
export default function DevisPdfClientCard({ user }: Props) {
  const clientName = user.companyName ?? user.name ?? user.email ?? '—'

  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">DEVIS POUR</div>
      <div className="invoice-pdf__card-body">
        <p className="invoice-pdf__client-name">{clientName}</p>
        {user.email && <p style={{ margin: '1mm 0' }}>{user.email}</p>}
        {user.phone && <p style={{ margin: '1mm 0' }}>{user.phone}</p>}
        {(user.address || user.city) && (
          <p style={{ margin: '1mm 0' }}>
            {[user.address, user.city].filter(Boolean).join(', ')}
          </p>
        )}
        {user.ice && <p style={{ margin: '1mm 0' }}>ICE: {user.ice}</p>}
        {user.clientCode && (
          <p className="invoice-pdf__client-code">Code: {user.clientCode}</p>
        )}
      </div>
    </div>
  )
}
