import Link from 'next/link'
import { ArrowLeft, Package, Layers, Sliders } from 'lucide-react'

export type ProductTabId = 'details' | 'variants' | 'options'

type ProductTabsProps = {
  productId: string
  productName: string
  productSku?: string | null
  current: ProductTabId
}

const tabs: { id: ProductTabId; label: string; href: (id: string) => string; icon: React.ElementType }[] = [
  { id: 'details', label: 'Détails', href: (id) => `/admin/products/${id}`, icon: Package },
  { id: 'variants', label: 'Variantes', href: (id) => `/admin/products/${id}/variants`, icon: Layers },
  { id: 'options', label: 'Options', href: (id) => `/admin/products/${id}/options`, icon: Sliders },
]

export default function ProductTabs({ productId, productName, productSku, current }: ProductTabsProps) {
  return (
    <div className="mb-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour aux produits
      </Link>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{productName}</h1>
        {productSku && (
          <p className="text-sm text-gray-500 font-mono mt-0.5">{productSku}</p>
        )}
      </div>
      <nav className="flex gap-1 border-b border-gray-200" aria-label="Onglets produit">
        {tabs.map(({ id, label, href, icon: Icon }) => {
          const isActive = current === id
          return (
            <Link
              key={id}
              href={href(productId)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md -mb-px
                ${isActive
                  ? 'bg-white border border-gray-200 border-b-white text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
