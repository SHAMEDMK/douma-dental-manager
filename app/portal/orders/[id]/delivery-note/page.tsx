import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import { formatOrderNumber } from "@/app/lib/orderNumber";
import { computeTaxTotals } from "@/app/lib/tax";
import { getLineItemDisplayName, getLineItemSku } from "@/app/lib/line-item-display";

export default async function PortalDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      deliveryNoteNumber: true,
      createdAt: true,
      total: true,
      user: {
        select: {
          name: true,
          companyName: true,
          email: true,
        }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          priceAtTime: true,
          product: {
            select: {
              name: true,
              sku: true,
            }
          },
          productVariant: {
            select: {
              name: true,
              sku: true,
            }
          }
        }
      },
    },
  });

  if (!order) return notFound();

  // Security: order must belong to the logged-in user
  if (order.userId !== session.id) return notFound();

  // Get company settings for seller info (raison sociale)
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  });

  // Always use company name (raison sociale), not the user name
  const sellerName = companySettings?.name || 'DOUMA Dental Manager'

  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt);
  const blNumber = order.deliveryNoteNumber || `BL-${orderNumber}`;
  const clientName = order.user.companyName ?? order.user.name ?? order.user.email;
  // Adresse non disponible dans le modèle User - laisser vide
  
  // Compute tax totals: order.total is HT
  const taxTotals = computeTaxTotals(order.total, 0.2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar (not printed) */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Bon de livraison</div>
          <div className="flex gap-2">
            <Link
              href="/portal/orders"
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Retour
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:max-w-full print:mx-0 print:p-0">
        <div className="bg-white border border-gray-200 rounded-xl p-6 print-container print:border-none print:rounded-none print:p-0">
          <div className="flex items-start justify-between gap-4 mb-6 print-header">
            <div>
              <h1 className="text-xl font-bold mb-2">BON DE LIVRAISON</h1>
              <div className="text-sm text-gray-600 mb-4">
                <div>N° {blNumber}</div>
                <div>Date: {new Date(order.createdAt).toLocaleDateString("fr-FR")}</div>
              </div>
              <h2 className="text-lg font-semibold">{sellerName}</h2>
              {companySettings && (
                <>
                  {(companySettings.address || companySettings.city || companySettings.country) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {[companySettings.address, companySettings.city, companySettings.country].filter(Boolean).join(' – ')}
                    </p>
                  )}
                  {companySettings.ice && (
                    <p className="text-xs text-gray-500 mt-1">ICE: {companySettings.ice}</p>
                  )}
                  {(companySettings.phone || companySettings.email) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {[companySettings.phone && `Tél: ${companySettings.phone}`, companySettings.email].filter(Boolean).join(' – ')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 mb-1">Livré à</div>
              <div className="font-semibold">{clientName}</div>
              <div className="text-gray-600">{order.user.email}</div>
              {/* Adresse - non disponible dans le modèle User */}
            </div>
            <div className="sm:text-right">
              <div className="text-gray-600 mb-1">Commande</div>
              <div className="font-semibold">{orderNumber}</div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto print-no-break">
            <table className="min-w-full text-sm border-collapse print:w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 border border-gray-200">Réf. / Produit</th>
                  <th className="text-right px-4 py-3 border border-gray-200">Quantité</th>
                  <th className="text-right px-4 py-3 border border-gray-200">PU HT</th>
                  <th className="text-right px-4 py-3 border border-gray-200">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => {
                  const lineTotal = it.priceAtTime * it.quantity;
                  return (
                    <tr key={it.id}>
                      <td className="px-4 py-3 border border-gray-200">
                        {getLineItemSku(it) !== '-' && (
                          <span className="font-mono text-gray-600 mr-1">{getLineItemSku(it)}</span>
                        )}
                        {it.product ? getLineItemDisplayName(it) : 'Produit'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-right">{it.quantity}</td>
                      <td className="px-4 py-3 border border-gray-200 text-right">{it.priceAtTime.toFixed(2)}</td>
                      <td className="px-4 py-3 border border-gray-200 text-right font-medium">{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 border border-gray-200 text-right font-semibold">Total HT</td>
                  <td className="px-4 py-3 border border-gray-200 text-right font-semibold">{taxTotals.ht.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-3 border border-gray-200 text-right font-semibold">TVA (20%)</td>
                  <td className="px-4 py-3 border border-gray-200 text-right font-semibold">{taxTotals.vat.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-3 border border-gray-200 text-right font-bold">Total TTC</td>
                  <td className="px-4 py-3 border border-gray-200 text-right font-bold text-lg">{taxTotals.ttc.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mention légale */}
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 print-no-break">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Ce document n'est pas une facture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
