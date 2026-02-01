import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import { formatOrderNumber } from "@/app/lib/orderNumber";

export default async function AdminDeliveryNotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?role=admin");
  if (session.role !== "ADMIN" && session.role !== "COMPTABLE" && session.role !== "MAGASINIER") {
    notFound();
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      deliveryNoteNumber: true,
      status: true,
      createdAt: true,
      updatedBy: true,
      deliveryConfirmationCode: true,
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true,
          email: true,
        }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          product: {
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

  // Get company settings for seller info (raison sociale)
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  });

  // Always use company name (raison sociale), not the user name
  const sellerName = companySettings?.name || 'DOUMA Dental Manager'

  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt);
  // Use stored deliveryNoteNumber if available, otherwise fallback to BL-{orderNumber}
  const blNumber = order.deliveryNoteNumber || `BL-${orderNumber}`;
  const clientName = order.user.companyName ?? order.user.name ?? order.user.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar (not printed) */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Aperçu bon de livraison</div>
          <div className="flex gap-2">
            <Link
              href={`/admin/orders/${id}`}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Retour
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:max-w-full print:mx-0 print:p-0">
        <div className="print-page bg-white border border-gray-200 rounded-xl p-6 print-container print:border-none print:rounded-none print:p-0">
          <div className="flex items-start justify-between gap-4 mb-6 print-header">
            <div>
              {/* Logo de l'entreprise */}
              {companySettings?.logoUrl && (
                <div className="mb-4">
                  <img 
                    src={companySettings.logoUrl} 
                    alt={companySettings.name || 'Logo'} 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold mb-2">BON DE LIVRAISON</h1>
              <div className="text-sm text-gray-600 mb-4">
                <div>N° {blNumber}</div>
                <div>Date: {new Date(order.createdAt).toLocaleDateString("fr-FR")}</div>
                {order.deliveryConfirmationCode && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-blue-600 font-medium">Code de confirmation livraison</div>
                    <div className="text-lg font-bold text-blue-900 tracking-wider font-mono">
                      {order.deliveryConfirmationCode}
                    </div>
                  </div>
                )}
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
              <div className="text-gray-600 mb-1 font-medium">Livré à</div>
              <div className="font-semibold">{clientName}</div>
              <div className="text-gray-600">{order.user.email}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-gray-600 mb-1 font-medium">N° commande</div>
              <div className="font-semibold">{orderNumber}</div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto print-no-break">
            <table className="min-w-full text-sm print:w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Réf. / Produit</th>
                  <th className="text-right px-3 py-2">Qté</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">{it.product?.sku && <span className="font-mono text-gray-600 mr-1">{it.product.sku}</span>}{it.product?.name ?? "Produit"}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Zone signatures */}
          <div className="keep-together">
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 print-signatures print-no-break">
            <div>
              <div className="border-t-2 border-gray-400 pt-4 mt-16 space-y-2">
                <div className="text-sm font-medium text-gray-700">Cachet & signature livreur</div>
                <div className="text-xs text-gray-500">Nom: _____________________</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-400 pt-4 mt-16 space-y-2">
                <div className="text-sm font-medium text-gray-700">Cachet & signature client</div>
                <div className="text-xs text-gray-500">Nom: _____________________</div>
                <div className="text-xs text-gray-500 mt-4">Date / Heure de réception:</div>
                <div className="text-xs text-gray-500">_____________________</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
