import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import { formatOrderNumber } from "@/app/lib/orderNumber";

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
            }
          }
        }
      },
    },
  });

  if (!order) return notFound();

  // Security: order must belong to the logged-in user
  if (order.userId !== session.id) return notFound();

  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt);
  const blNumber = order.deliveryNoteNumber || `BL-${orderNumber}`;
  const clientName = order.user.companyName ?? order.user.name ?? order.user.email;
  // Adresse non disponible dans le modèle User - laisser vide

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold">DOUMA Dental Manager</h1>
              <p className="text-sm text-gray-600">Bon de livraison</p>
            </div>
            <div className="text-sm text-right">
              <div className="font-semibold text-lg">{blNumber}</div>
              <div className="text-gray-600">
                Date : {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </div>
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

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 border border-gray-200">Produit</th>
                  <th className="text-right px-4 py-3 border border-gray-200">Quantité</th>
                  <th className="text-right px-4 py-3 border border-gray-200">Prix unitaire</th>
                  <th className="text-right px-4 py-3 border border-gray-200">Montant</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => {
                  const lineTotal = it.priceAtTime * it.quantity;
                  return (
                    <tr key={it.id}>
                      <td className="px-4 py-3 border border-gray-200">{it.product?.name ?? "Produit"}</td>
                      <td className="px-4 py-3 border border-gray-200 text-right">{it.quantity}</td>
                      <td className="px-4 py-3 border border-gray-200 text-right">{it.priceAtTime.toFixed(2)} €</td>
                      <td className="px-4 py-3 border border-gray-200 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 border border-gray-200 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 border border-gray-200 text-right font-bold text-lg">{order.total.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature zone */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="border-t-2 border-gray-400 pt-2 mt-16">
                <div className="text-sm text-gray-600">Signature du livreur</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-400 pt-2 mt-16">
                <div className="text-sm text-gray-600">Signature pour réception</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
