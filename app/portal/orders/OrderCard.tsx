'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import OrderItemCard from './OrderItemCard'
import OrderEditMode from './OrderEditMode'
import OrderActions from './OrderActions'

type OrderItem = {
  id: string
  quantity: number
  priceAtTime: number
  product: {
    id: string
    name: string
    price: number
    stock: number
  }
}

type OrderCardProps = {
  orderId: string
  items: OrderItem[]
  orderStatus: string
  isOrderPaid: boolean
  orderNumber: string
  createdAt: Date
  total: number
  invoiceStatus?: string
  invoiceId?: string
  invoiceAmount?: number
  invoiceTotalPaid?: number
  invoiceRemaining?: number
  deliveryCity?: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNote?: string | null
  shippedAt?: Date | null
  deliveredAt?: Date | null
  deliveryAgentName?: string | null
  deliveredToName?: string | null
  deliveryProofNote?: string | null
  isExpanded?: boolean
  isModifiable?: boolean
  onToggle?: () => void
}

export default function OrderCard({ 
  orderId, 
  items, 
  orderStatus, 
  isOrderPaid,
  orderNumber,
  createdAt,
  total,
  invoiceStatus,
  invoiceId,
  invoiceAmount,
  invoiceTotalPaid,
  invoiceRemaining,
  deliveryCity,
  deliveryAddress,
  deliveryPhone,
  deliveryNote,
  shippedAt,
  deliveredAt,
  deliveryAgentName,
  deliveredToName,
  deliveryProofNote,
  isExpanded = false,
  isModifiable = false,
  onToggle
}: OrderCardProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({})

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setEditQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }))
  }

  const handleEditModeChange = (editing: boolean) => {
    setIsEditMode(editing)
    if (!editing) {
      // Reset quantities when exiting edit mode
      setEditQuantities({})
    } else {
      // Initialize quantities with current values
      const initial: Record<string, number> = {}
      items.forEach(item => {
        initial[item.id] = item.quantity
      })
      setEditQuantities(initial)
    }
  }

  const handleValidate = async (quantities: Record<string, number>) => {
    // Prepare items with changes
    const itemsToUpdate = items
      .filter(item => {
        const newQty = quantities[item.id] ?? item.quantity
        return newQty !== item.quantity
      })
      .map(item => ({
        orderItemId: item.id,
        newQuantity: quantities[item.id] ?? item.quantity
      }))

    if (itemsToUpdate.length === 0) {
      handleEditModeChange(false)
      return
    }

    const { updateOrderItemsAction } = await import('@/app/actions/order')
    const result = await updateOrderItemsAction(orderId, itemsToUpdate)
    
    if (result.error) {
      throw new Error(result.error)
    } else {
      // Success - refresh page
      router.refresh()
    }
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Clickable header - only for modifiable orders */}
      <div 
        className={`px-4 py-5 border-b border-gray-200 sm:px-6 ${isModifiable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
        onClick={isModifiable && onToggle ? onToggle : undefined}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg leading-6 font-medium text-gray-900 break-words">
                {orderNumber}
              </h3>
              {isModifiable && (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Du {new Date(createdAt).toLocaleDateString()}
            </p>
            
            {/* Delivery info block - always visible */}
            {(deliveryCity || deliveryAddress || deliveryPhone || deliveryNote || orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED') && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="space-y-1.5 text-sm text-gray-600">
                  {deliveryCity && (
                    <div>
                      <span className="font-medium text-gray-700">Livraison :</span> {deliveryCity}
                    </div>
                  )}
                  {deliveryAddress && (
                    <div>
                      <span className="font-medium text-gray-700">Adresse :</span> {deliveryAddress}
                    </div>
                  )}
                  {deliveryPhone && (
                    <div>
                      <span className="font-medium text-gray-700">Téléphone :</span> {deliveryPhone}
                    </div>
                  )}
                  {deliveryNote && (
                    <div>
                      <span className="font-medium text-gray-700">Note :</span> {deliveryNote}
                    </div>
                  )}
                  {orderStatus === 'SHIPPED' && (
                    <>
                      {shippedAt && (
                        <div>
                          <span className="font-medium text-gray-700">Expédiée le :</span> {new Date(shippedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(shippedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {deliveryAgentName && (
                        <div>
                          <span className="font-medium text-gray-700">Livreur :</span> {deliveryAgentName}
                        </div>
                      )}
                    </>
                  )}
                  {orderStatus === 'DELIVERED' && (
                    <>
                      {deliveredAt && (
                        <div>
                          <span className="font-medium text-gray-700">Livrée le :</span> {new Date(deliveredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {deliveredToName && (
                        <div>
                          <span className="font-medium text-gray-700">Reçu par :</span> {deliveredToName}
                        </div>
                      )}
                      {deliveryProofNote && (
                        <div>
                          <span className="font-medium text-gray-700">Note :</span> {deliveryProofNote}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            {/* Delivery note link - visible when order is shipped or delivered */}
            {(orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED') && (
              <Link
                href={`/portal/orders/${orderId}/delivery-note/print`}
                onClick={(e) => {
                  // Prevent accordion toggle when clicking delivery note link
                  e.stopPropagation()
                }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-900 transition-colors"
                title="Bon de livraison"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">BL</span>
                <span className="sm:hidden">BL</span>
              </Link>
            )}
            {/* Invoice download link - always visible when invoice exists */}
            {invoiceId && (
              <Link
                href={`/portal/invoices/${invoiceId}/print`}
                onClick={(e) => {
                  // Prevent accordion toggle when clicking invoice link
                  e.stopPropagation()
                }}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors"
                title="Télécharger la facture"
              >
                <FileText className="h-4 w-4" />
                <span>Télécharger facture</span>
              </Link>
            )}
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                    orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                  {orderStatus === 'CANCELLED' ? 'Annulée' : 
                   orderStatus === 'DELIVERED' ? 'Livrée' :
                   orderStatus === 'SHIPPED' ? 'Expédiée' :
                   orderStatus === 'PREPARED' ? 'Préparée' : 'Confirmée'}
                </span>
                {invoiceStatus && (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${invoiceStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                      invoiceStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      invoiceStatus === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'}`}>
                    {invoiceStatus === 'PAID' ? 'Payée' :
                     invoiceStatus === 'PARTIAL' ? 'Partiellement payée' :
                     invoiceStatus === 'CANCELLED' ? 'Annulée' :
                     'En attente'}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500 mt-1">
                Total: {total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable content - only for modifiable orders when expanded */}
      {isModifiable && isExpanded && (
        <div className="px-4 py-5 sm:px-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                      {isEditMode && editQuantities[item.id] !== undefined 
                        ? editQuantities[item.id] 
                        : item.quantity}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {item.priceAtTime.toFixed(2)} €
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {((isEditMode && editQuantities[item.id] !== undefined 
                        ? editQuantities[item.id] 
                        : item.quantity) * item.priceAtTime).toFixed(2)} €
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      <OrderItemCard 
                        item={item}
                        orderId={orderId}
                        orderStatus={orderStatus}
                        isOrderPaid={isOrderPaid}
                        isEditMode={isEditMode}
                        editQuantity={editQuantities[item.id]}
                        onQuantityChange={handleQuantityChange}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Action area */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <OrderEditMode
              orderId={orderId}
              items={items}
              isOrderModifiable={isModifiable}
              currentOrderTotal={total}
              onEditModeChange={handleEditModeChange}
              editQuantities={editQuantities}
              onValidate={handleValidate}
              onItemsAdded={() => router.refresh()}
            />
          </div>
          {/* Payment Block */}
          {invoiceStatus && invoiceAmount !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Paiement</h3>
              <div className="space-y-3">
                {/* Badge */}
                <div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    invoiceStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    invoiceStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    invoiceStatus === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {invoiceStatus === 'PAID' ? 'Payée' :
                     invoiceStatus === 'PARTIAL' ? 'Partiellement payée' :
                     invoiceStatus === 'CANCELLED' ? 'Annulée' :
                     'En attente'}
                  </span>
                </div>
                {/* Payment Details */}
                <div className="p-3 bg-gray-50 rounded text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total facture:</span>
                    <span className="font-medium text-gray-900">{invoiceAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total payé:</span>
                    <span className="font-medium text-green-600">{invoiceTotalPaid?.toFixed(2) || '0.00'} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`font-medium ${invoiceRemaining && invoiceRemaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {(invoiceRemaining || 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
                {/* Emphasized remaining amount if > 0 */}
                {invoiceRemaining && invoiceRemaining > 0.01 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-semibold text-red-700">
                      Reste à payer: {(invoiceRemaining || 0).toFixed(2)} €
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-gray-500">
              {!invoiceStatus && (
                <span className="text-gray-500">
                  {orderStatus === 'DELIVERED' ? 'Livrée - Paiement à la livraison' : 'Paiement à la livraison'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OrderActions
                orderId={orderId}
                orderNumber={orderNumber}
                orderStatus={orderStatus}
                invoiceStatus={invoiceStatus}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
