import { createProductAction } from '@/app/actions/product'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import CreateProductForm from './CreateProductForm'

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/products" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux produits
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau Produit</h1>
        <p className="text-gray-500 mt-1">
          Créez un nouveau produit dans le catalogue
        </p>
      </div>

      <CreateProductForm />
    </div>
  )
}

