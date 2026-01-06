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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">DOUMA Dental Manager</h1>
              <p className="text-sm text-gray-600">Bon de livraison</p>
            </div>
            <div className="text-sm text-right">
              <div className="font-semibold text-lg">{blNumber}</div>
              <div className="text-gray-600 mt-1">
                Commande: {orderNumber}
              </div>
              <div className="text-gray-600">
                Date : {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Livré à</div>
              <div className="font-semibold">{clientName}</div>
              <div className="text-gray-600">{order.user.email}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-gray-600">Statut</div>
              <div className="font-semibold">
                {order.status === "DELIVERED" ? "Livrée" :
                 order.status === "SHIPPED" ? "Expédiée" :
                 order.status === "PREPARED" ? "Préparée" :
                 "Confirmée"}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-right px-3 py-2">Qté</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">{it.product?.name ?? "Produit"}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 text-xs text-gray-500">
            Bon de livraison généré le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR")}
          </div>
        </div>
      </div>
    </div>
  );
}
