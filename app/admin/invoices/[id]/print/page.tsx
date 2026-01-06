import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";

function money(v: number) {
  return (Number.isFinite(v) ? v : 0).toFixed(2);
}

export default async function AdminInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?role=admin");
  if (session.role !== "ADMIN" && session.role !== "COMPTABLE") {
    notFound();
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: true,
          items: { include: { product: true } },
        },
      },
      payments: true,
    },
  });

  if (!invoice || !invoice.order) return notFound();

  // Get company info from admin settings
  const adminSettings = await prisma.adminSettings.findUnique({
    where: { id: 'default' }
  });

  const paid = invoice.payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const remaining = Math.max(0, (invoice.amount ?? 0) - paid);

  const clientName =
    invoice.order.user.companyName ?? invoice.order.user.name ?? invoice.order.user.email;

  // Payment status text
  const paymentStatusText = 
    invoice.status === 'PAID' ? 'Payée' :
    invoice.status === 'PARTIAL' ? 'Partiellement payée' :
    invoice.status === 'CANCELLED' ? 'Annulée' :
    'Paiement à la livraison';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar (not printed) */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Aperçu facture</div>
          <div className="flex gap-2">
            <Link
              href="/admin/invoices"
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
              <h1 className="text-xl font-bold">{adminSettings?.companyName || 'DOUMA Dental Manager'}</h1>
              <p className="text-sm text-gray-600">Facture</p>
              {adminSettings?.companyICE && (
                <p className="text-xs text-gray-500 mt-1">ICE: {adminSettings.companyICE}</p>
              )}
              {adminSettings?.companyAddress && (
                <p className="text-xs text-gray-500 mt-1">{adminSettings.companyAddress}</p>
              )}
              {adminSettings?.companyPhone && (
                <p className="text-xs text-gray-500 mt-1">Tél: {adminSettings.companyPhone}</p>
              )}
            </div>
            <div className="text-sm text-right">
              <div className="font-semibold">{invoice.invoiceNumber ?? invoice.id.slice(-8)}</div>
              <div className="text-gray-600">
                Date : {new Date(invoice.createdAt).toLocaleDateString("fr-FR")}
              </div>
              <div className="text-gray-600 mt-1">
                {paymentStatusText}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Facturé à</div>
              <div className="font-semibold">{clientName}</div>
              <div className="text-gray-600">{invoice.order.user.email}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-gray-600">Commande</div>
              <div className="font-semibold">{invoice.order.orderNumber ?? invoice.order.id.slice(-8)}</div>
              {(invoice.order.status === 'SHIPPED' || invoice.order.status === 'DELIVERED') && invoice.order.orderNumber && (
                <div className="text-xs text-gray-500 mt-1">
                  BL-{invoice.order.orderNumber}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-right px-3 py-2">Qté</th>
                  <th className="text-right px-3 py-2">PU</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">{it.product?.name ?? "Produit"}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right">{money(it.priceAtTime)} €</td>
                    <td className="px-3 py-2 text-right">{money(it.priceAtTime * it.quantity)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-80 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total HT</span>
                <span className="font-semibold">{money(invoice.amount ?? 0)} €</span>
              </div>
              {/* TVA placeholder - to be implemented later */}
              {/* <div className="flex justify-between">
                <span className="text-gray-600">TVA (20%)</span>
                <span>{money(0)} €</span>
              </div> */}
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total facture</span>
                <span className="font-semibold">{money(invoice.amount ?? 0)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total payé</span>
                <span>{money(paid)} €</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Reste à payer</span>
                <span className="font-semibold">{money(remaining)} €</span>
              </div>
            </div>
          </div>

          <div className="mt-10 text-xs text-gray-500">
            Merci pour votre confiance.
          </div>
        </div>
      </div>
    </div>
  );
}
