import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import DeliveryConfirmationForm from './DeliveryConfirmationForm'
import DeliveryNotifications from './DeliveryNotifications'
import { calculateTotalPaid, calculateInvoiceRemaining, calculateInvoiceTotalTTC } from '@/app/lib/invoice-utils'
import { MapPin, Package, DollarSign, FileText, Phone, Truck } from 'lucide-react'

export default async function DeliveryPage() {
  const session = await getSession()
  
  // Only MAGASINIER and ADMIN can access delivery interface
  if (!session || (session.role !== 'MAGASINIER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  // Debug: Get all SHIPPED orders for debugging (development only)
  let allShippedOrders: Array<{ id: string; orderNumber: string | null; deliveryAgentName: string | null; deliveryAgentId: string | null }> = []
  if (process.env.NODE_ENV === 'development') {
    try {
      allShippedOrders = await prisma.order.findMany({
        where: { status: 'SHIPPED' },
        select: { id: true, orderNumber: true, deliveryAgentName: true, deliveryAgentId: true },
        take: 20,
        orderBy: { shippedAt: 'desc' }
      })
    } catch (error) {
      console.error('Error fetching all shipped orders for debug:', error)
    }
  }

  // Get all SHIPPED orders assigned to this delivery agent
  // Priority: Use deliveryAgentId (most reliable), fallback to deliveryAgentName matching (case-insensitive)
  const matchConditions: any[] = []
  
  // First, try to match by deliveryAgentId (most reliable)
  matchConditions.push({ deliveryAgentId: session.id })
  
  // Fallback: Also match by name or email for backward compatibility
  // Note: SQLite doesn't support case-insensitive LIKE easily, so we'll match exact and also try common variations
  const userName = (session.name || '').trim()
  const userEmail = (session.email || '').trim()
  
  if (userName) {
    // Try exact match
    matchConditions.push({ deliveryAgentName: userName })
    // Try uppercase version (for "ALI BOB" vs "Ali bob")
    matchConditions.push({ deliveryAgentName: userName.toUpperCase() })
    // Try lowercase version
    matchConditions.push({ deliveryAgentName: userName.toLowerCase() })
    // Try capitalized version (first letter uppercase)
    matchConditions.push({ deliveryAgentName: userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase() })
  }
  
  if (userEmail && userEmail !== userName) {
    matchConditions.push({ deliveryAgentName: userEmail })
  }
  
  // Also try to find the user in the database to get exact name/email
  // This helps if the session name/email doesn't match exactly what was stored
  let exactUserName: string | null = null
  let exactUserEmail: string | null = null
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true }
    })
    if (currentUser) {
      exactUserName = currentUser.name.trim()
      exactUserEmail = currentUser.email.trim()
      
      // Add exact matches from database (with case variations)
      if (exactUserName) {
        if (!matchConditions.some(c => c.deliveryAgentName === exactUserName)) {
          matchConditions.push({ deliveryAgentName: exactUserName })
        }
        // Add case variations
        matchConditions.push({ deliveryAgentName: exactUserName.toUpperCase() })
        matchConditions.push({ deliveryAgentName: exactUserName.toLowerCase() })
      }
      if (exactUserEmail && exactUserEmail !== exactUserName && !matchConditions.some(c => c.deliveryAgentName === exactUserEmail)) {
        matchConditions.push({ deliveryAgentName: exactUserEmail })
      }
    }
  } catch (error) {
    console.error('Error fetching user for delivery matching:', error)
  }
  
  // Remove duplicates (same deliveryAgentName)
  const uniqueConditions = matchConditions.filter((condition, index, self) => 
    index === self.findIndex(c => JSON.stringify(c) === JSON.stringify(condition))
  )
  
  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  const orders = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      OR: uniqueConditions,
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      deliveryConfirmationCode: true,
      deliveryAgentName: true,
      deliveryAgentId: true, // Include deliveryAgentId in select
      shippedAt: true,
      deliveryAddress: true,
      deliveryCity: true,
      deliveryPhone: true,
      deliveryNote: true, // Instructions spéciales
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true
            }
          }
        }
      },
      invoice: {
        select: {
          id: true,
          status: true,
          amount: true, // HT
          balance: true,
          payments: {
            select: {
              amount: true
            }
          }
        }
      },
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
          city: true
        }
      }
    },
    orderBy: { shippedAt: 'desc' } // Most recent first
  })

  return (
    <div className="min-h-screen bg-gray-100">
      <DeliveryNotifications 
        initialOrdersCount={orders.length} 
        currentUserName={session.name || session.email}
      />
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-8 sm:pb-12">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" aria-hidden />
              Espace Livreur
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Commandes assignées • Confirmez avec le code client
            </p>
          </div>
          {orders.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 shadow-sm shrink-0">
              <span className="text-sm font-semibold">
                {orders.length} commande{orders.length > 1 ? 's' : ''} à livrer
              </span>
            </div>
          )}
        </header>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium">Aucune commande assignée</p>
            <p className="text-sm text-gray-500 mt-1">
              Les commandes vous seront assignées par l'admin lors de l'expédition.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600 space-y-2">
                <p><strong>Debug - Correspondance livreur:</strong></p>
                <p>Session name: "{session.name}" | Session email: "{session.email}"</p>
                {exactUserName && (
                  <p>DB name: "{exactUserName}" | DB email: "{exactUserEmail}"</p>
                )}
                <p>Recherche pour: {matchConditions.map(c => `"${c.deliveryAgentName}"`).join(', ')}</p>
                <p className="mt-2 text-yellow-700">
                  <strong>⚠️ Diagnostic:</strong> Vérifiez que `deliveryAgentId` correspond à votre ID: "{session.id}"
                </p>
                {/* Debug: Show all SHIPPED orders with their deliveryAgentName and deliveryAgentId */}
                {allShippedOrders.length > 0 && (
                  <div className="mt-3 p-2 bg-gray-200 rounded">
                    <p className="font-semibold mb-1">Toutes les commandes SHIPPED (max 20):</p>
                    {allShippedOrders.map(o => {
                      const matchesById = o.deliveryAgentId === session.id
                      // Case-insensitive name matching
                      const matchesByName = o.deliveryAgentName && (
                        o.deliveryAgentName.toLowerCase() === (exactUserName || '').toLowerCase() ||
                        o.deliveryAgentName.toLowerCase() === (exactUserEmail || '').toLowerCase() ||
                        o.deliveryAgentName.toLowerCase() === (userName || '').toLowerCase() ||
                        o.deliveryAgentName.toLowerCase() === (userEmail || '').toLowerCase() ||
                        o.deliveryAgentName.toUpperCase() === (exactUserName || '').toUpperCase() ||
                        o.deliveryAgentName.toUpperCase() === (exactUserEmail || '').toUpperCase() ||
                        o.deliveryAgentName.toUpperCase() === (userName || '').toUpperCase() ||
                        o.deliveryAgentName.toUpperCase() === (userEmail || '').toUpperCase()
                      )
                      return (
                        <p key={o.id} className={`text-xs ${matchesById ? 'bg-green-100' : matchesByName ? 'bg-yellow-100' : ''}`}>
                          Cmd {o.orderNumber || o.id.slice(-6)}: 
                          deliveryAgentId = "{o.deliveryAgentId || '(null)'}" | 
                          deliveryAgentName = "{o.deliveryAgentName || '(null)'}"
                          {matchesById && <span className="text-green-600 font-bold"> ← MATCH PAR ID</span>}
                          {!matchesById && matchesByName && <span className="text-yellow-600 font-bold"> ← MATCH PAR NOM (insensible à la casse)</span>}
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {orders.map((order, index) => {
              // Highlight new orders (expedited in last 5 minutes)
              const isNew = order.shippedAt && 
                new Date().getTime() - new Date(order.shippedAt).getTime() < 5 * 60 * 1000
              
              // Calculate payment info
              const totalPaid = order.invoice ? calculateTotalPaid(order.invoice.payments) : 0
              const invoiceAmountHT = order.invoice?.amount || 0
              const totalTTC = calculateInvoiceTotalTTC(invoiceAmountHT, vatRate)
              const remaining = calculateInvoiceRemaining(invoiceAmountHT, totalPaid, vatRate)
              const isPaid = remaining < 0.01
              
              return (
              <article 
                key={order.id}
                data-testid="delivery-order-card"
                className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
                  isNew && !order.deliveryAgentName 
                    ? 'ring-2 ring-blue-500 border-blue-300' 
                    : ''
                }`}
              >
                <div className="p-4 sm:p-6">
                {isNew && !order.deliveryAgentName && (
                  <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                    <p className="text-sm font-medium text-blue-800">
                      🆕 Nouvelle commande expédiée
                    </p>
                  </div>
                )}
                <div className="mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Commande {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Expédiée le {order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('fr-FR') : '-'}
                    {order.shippedAt && ` à ${new Date(order.shippedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                  {order.deliveryConfirmationCode && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <strong>Code client :</strong> Demandez le code de confirmation au client (bon de livraison).
                      </p>
                    </div>
                  )}
                </div>

                {/* Products List */}
                {order.items && order.items.length > 0 && (
                  <div data-testid="delivery-products-list" className="mb-4 p-4 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-gray-600 shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900">Produits à livrer</h3>
                    </div>
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between items-center text-sm gap-2">
                          <span className="text-gray-700 truncate min-w-0">
                            {item.product.name} × {item.quantity}
                          </span>
                          <span className="text-gray-500 shrink-0">
                            {item.priceAtTime.toFixed(2)} Dh HT/unité
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Payment Info */}
                <div data-testid="delivery-amount-section" className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50/80">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900">Paiement</h3>
                    </div>
                    {order.invoice ? (
                      isPaid ? (
                        <span data-testid="delivery-payment-badge" className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Déjà payé
                        </span>
                      ) : (
                        <span data-testid="delivery-payment-badge" className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          À encaisser
                        </span>
                      )
                    ) : (
                      <span data-testid="delivery-payment-badge" className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        En attente
                      </span>
                    )}
                  </div>
                  {order.invoice ? (
                    <>
                      {!isPaid && (
                        <div className="mt-2">
                          <p className="text-base sm:text-lg font-bold text-blue-900">
                            À encaisser : {remaining.toFixed(2)} Dh TTC
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Total {totalTTC.toFixed(2)} Dh TTC · Payé {totalPaid.toFixed(2)} Dh
                          </p>
                        </div>
                      )}
                      {isPaid && (
                        <p className="text-sm text-green-700 mt-1">
                          Commande déjà payée ({totalPaid.toFixed(2)} Dh TTC)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      Facture en cours de création
                    </p>
                  )}
                </div>

                {/* Delivery Instructions */}
                {order.deliveryNote && (
                  <div className="mb-4 p-4 bg-amber-50/80 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900">Instructions de livraison</h3>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{order.deliveryNote}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Client</h3>
                    <p className="text-sm font-medium text-gray-900">{order.user.name}</p>
                    {order.user.clientCode && (
                      <p className="text-xs font-mono text-gray-500">Code: {order.user.clientCode}</p>
                    )}
                    {order.user.companyName && (
                      <p className="text-sm text-gray-600">{order.user.companyName}</p>
                    )}
                    <p className="text-sm text-gray-600 break-all">{order.user.email}</p>
                    {order.user.phone && (
                      <a href={`tel:${order.user.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        {order.user.phone}
                      </a>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Adresse de livraison</h3>
                      {(order.deliveryAddress || order.deliveryCity || order.user.address || order.user.city) && (
                        <a
                          data-testid="delivery-maps-link"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${order.deliveryAddress || order.user.address || ''} ${order.deliveryCity || order.user.city || ''}`.trim()
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px] sm:min-h-0"
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          Ouvrir dans Maps
                        </a>
                      )}
                    </div>
                    {order.deliveryAddress && (
                      <p className="text-sm text-gray-900">{order.deliveryAddress}</p>
                    )}
                    {order.deliveryCity && (
                      <p className="text-sm text-gray-900">{order.deliveryCity}</p>
                    )}
                    {order.deliveryPhone && (
                      <a href={`tel:${order.deliveryPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        Tél livraison : {order.deliveryPhone}
                      </a>
                    )}
                    {!order.deliveryAddress && !order.deliveryCity && (
                      <p className="text-sm text-gray-400 italic">Adresse non renseignée</p>
                    )}
                  </div>
                </div>

                {/* Show confirmation form - order is already assigned to this agent by admin */}
                <DeliveryConfirmationForm
                  orderId={order.id}
                  orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                />
                </div>
              </article>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}
