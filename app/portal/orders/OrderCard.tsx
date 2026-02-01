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
  totalTTC?: number
  invoiceStatus?: string
  invoiceId?: string
  invoiceAmount?: number
  invoiceTotalPaid?: number
  invoiceRemaining?: number
  isInvoiceLocked?: boolean
  deliveryCity?: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNote?: string | null
  deliveryNoteNumber?: string | null
  shippedAt?: Date | null
  deliveredAt?: Date | null
  deliveryAgentName?: string | null
  deliveredToName?: string | null
  deliveryProofNote?: string | null
  deliveryConfirmationCode?: string | null
  discountRate?: number | null
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
  totalTTC,
  invoiceStatus,
  invoiceId,
  invoiceAmount,
  invoiceTotalPaid,
  invoiceRemaining,
  isInvoiceLocked = false,
  deliveryCity,
  deliveryAddress,
  deliveryPhone,
  deliveryNote,
  deliveryNoteNumber,
  shippedAt,
  deliveredAt,
  deliveryAgentName,
  deliveredToName,
  deliveryProofNote,
  deliveryConfirmationCode,
  discountRate,
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
                      {deliveryConfirmationCode && (
                        <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">Code de confirmation livraison</div>
                          <div className="text-xl font-bold text-blue-900 tracking-wider font-mono">
                            {deliveryConfirmationCode}
                          </div>
                          <div className="text-xs text-blue-700 mt-1">
                            Remettez ce code au livreur lors de la livraison
                          </div>
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
            {/* Delivery note links - visible when BL exists */}
            {deliveryNoteNumber && (orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED' || orderStatus === 'PREPARED') && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/portal/orders/${orderId}/delivery-note/print`}
                  onClick={(e) => {
                    // Prevent accordion toggle when clicking delivery note link
                    e.stopPropagation()
                  }}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors"
                  title="Voir/Imprimer le BL"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Voir BL</span>
                  <span className="sm:hidden">BL</span>
                </Link>
                <a
                  href={`/api/pdf/portal/orders/${orderId}/delivery-note`}
                  onClick={(e) => {
                    // Prevent accordion toggle when clicking PDF link
                    e.stopPropagation()
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-gray-800 hover:bg-gray-900 transition-colors"
                  title="Télécharger PDF BL"
                >
                  <span className="hidden sm:inline">Télécharger PDF</span>
                  <span className="sm:hidden">PDF</span>
                </a>
              </div>
            )}
            {/* Invoice download links - only visible when order is DELIVERED and invoice exists */}
            {invoiceId && orderStatus === 'DELIVERED' && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/portal/invoices/${invoiceId}/print`}
                  onClick={(e) => {
                    // Prevent accordion toggle when clicking invoice link
                    e.stopPropagation()
                  }}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors"
                  title="Voir/Imprimer la facture"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Voir/Imprimer</span>
                  <span className="sm:hidden">Voir</span>
                </Link>
                <a
                  href={`/api/pdf/portal/invoices/${invoiceId}`}
                  onClick={(e) => {
                    // Prevent accordion toggle when clicking PDF link
                    e.stopPropagation()
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-gray-800 hover:bg-gray-900 transition-colors"
                  title="Télécharger PDF"
                >
                  <span className="hidden sm:inline">Télécharger PDF</span>
                  <span className="sm:hidden">PDF</span>
                </a>
              </div>
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
                     'Paiement en attente'}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500 mt-1">
                Total TTC: {(totalTTC ?? total).toFixed(2)} Dh
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Badge "Commande non modifiable" ou "Facture verrouillée" */}
      {!isModifiable && (
        <div className="px-4 py-2 sm:px-6 bg-gray-50 border-b border-gray-200">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {isInvoiceLocked ? '🔒 Facture verrouillée' : 'Commande non modifiable'}
          </span>
        </div>
      )}

      {/* Expandable content - only for modifiable orders when expanded */}
      {isModifiable && isExpanded && !isInvoiceLocked && (
        <div className="px-4 py-5 sm:px-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire HT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remise attribuée</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total HT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                        const sku = (item.product as { sku?: string | null }).sku
                        return sku ? <span className="font-mono text-gray-500 mr-1">{sku}</span> : null
                      })()}
                        {item.product.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                      {isEditMode && editQuantities[item.id] !== undefined 
                        ? editQuantities[item.id] 
                        : item.quantity}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {item.priceAtTime.toFixed(2)} Dh
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {discountRate && discountRate > 0 ? `${discountRate.toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {((isEditMode && editQuantities[item.id] !== undefined 
                        ? editQuantities[item.id] 
                        : item.quantity) * item.priceAtTime).toFixed(2)} Dh
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
                     'Paiement en attente'}
                  </span>
                </div>
                {/* Payment Details */}
                <div className="p-3 bg-gray-50 rounded text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total facture TTC:</span>
                    <span className="font-medium text-gray-900">{invoiceAmount.toFixed(2)} Dh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total payé:</span>
                    <span className="font-medium text-green-600">{invoiceTotalPaid?.toFixed(2) || '0.00'} Dh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`font-medium ${invoiceRemaining && invoiceRemaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {(invoiceRemaining || 0).toFixed(2)} Dh
                    </span>
                  </div>
                </div>
                {/* Emphasized remaining amount if > 0 */}
                {invoiceRemaining && invoiceRemaining > 0.01 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-semibold text-red-700">
                      Reste à payer: {(invoiceRemaining || 0).toFixed(2)} Dh TTC
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
              {!isInvoiceLocked && (
                <OrderActions
                  orderId={orderId}
                  orderNumber={orderNumber}
                  orderStatus={orderStatus}
                  invoiceStatus={invoiceStatus}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
