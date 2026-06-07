type Supplier = {
  code: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
  contact: string | null
}

type Props = {
  supplier: Supplier
}

export default function PurchaseOrderPdfSupplierCard({ supplier }: Props) {
  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">FOURNISSEUR</div>
      <div className="invoice-pdf__card-body">
        <p className="invoice-pdf__client-name">{supplier.name}</p>
        {supplier.code && (
          <p className="invoice-pdf__client-detail">Code : {supplier.code}</p>
        )}
        {supplier.contact && (
          <p className="invoice-pdf__client-detail">{supplier.contact}</p>
        )}
        {supplier.email && <p className="invoice-pdf__client-detail">{supplier.email}</p>}
        {supplier.phone && <p className="invoice-pdf__client-detail">{supplier.phone}</p>}
        {(supplier.address || supplier.city) && (
          <p className="invoice-pdf__client-detail">
            {[supplier.address, supplier.city].filter(Boolean).join(', ')}
          </p>
        )}
        {supplier.ice && <p className="invoice-pdf__client-detail">ICE: {supplier.ice}</p>}
      </div>
    </div>
  )
}
