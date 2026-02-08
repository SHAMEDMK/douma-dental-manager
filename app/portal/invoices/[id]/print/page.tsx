import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import DownloadPdfButton from "@/app/components/DownloadPdfButton";
import Link from "next/link";
import { computeTaxTotals } from "@/app/lib/tax";
import { isInvoiceLocked } from "@/app/lib/invoice-lock";
import { formatMoney, calculateTotalPaid, calculateInvoiceRemaining, getPaymentTermsForDisplay } from "@/app/lib/invoice-utils";
import { numberToWords } from "@/app/lib/number-to-words";
import { getLineItemDisplayName, getLineItemSku } from "@/app/lib/line-item-display";

export default async function PortalInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: true,
          items: { include: { product: true, productVariant: true } },
        },
      },
      payments: true,
    },
  });

  if (!invoice || !invoice.order) return notFound();

  // Security: invoice must belong to the logged-in user
  if (invoice.order.userId !== session.id) return notFound();

  // Get company info from CompanySettings
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  // Compute tax totals: invoice.amount is HT, use VAT rate from CompanySettings
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(invoice.amount ?? 0, vatRate);

  // F1: Calculate remaining TTC (remaining = invoice.totalTTC - totalPaid, min 0)
  const paid = calculateTotalPaid(invoice.payments);
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, paid, vatRate);

  // Client info: ONLY from order.user and order.delivery*
  const clientName = invoice.order.user.companyName ?? invoice.order.user.name ?? invoice.order.user.email;

  // Payment status text
  const paymentStatusText = 
    invoice.status === 'PAID' ? 'Payée' :
    invoice.status === 'PARTIAL' ? 'Partiellement payée' :
    invoice.status === 'CANCELLED' ? 'Annulée' :
    'Impayée';

  // Check if invoice is locked
  const invoiceLocked = isInvoiceLocked(invoice)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar (not printed) */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Aperçu facture</div>
          <div className="flex gap-2">
            <Link
              href="/portal/orders"
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Retour
            </Link>
            <PrintButton />
            <DownloadPdfButton url={`/api/pdf/portal/invoices/${id}`} />
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:max-w-full print:mx-0 print:p-0 print:py-0">
        <div className="print-page bg-white border border-gray-200 rounded-xl p-6 print-container print:border-none print:rounded-none print:p-4 print:min-h-0">
          <div className="flex items-start justify-between gap-4 print-header print:mb-3">
            <div>
              {/* Logo de l'entreprise */}
              {companySettings?.logoUrl && (
                <div className="mb-4 print:mb-2">
                  <img 
                    src={companySettings.logoUrl} 
                    alt={companySettings.name || 'Logo'} 
                    className="h-16 w-auto object-contain print:h-10"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 mb-4 print:mb-2">
                <h1 className="text-xl font-bold print:text-lg">FACTURE</h1>
                {/* G3: Badge "Facture verrouillée" (visible écran, caché print) */}
                {invoiceLocked && (
                  <span className="print:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🔒 Verrouillée
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold print:text-base print:leading-tight">{companySettings?.name || 'DOUMA Dental Manager'}</h2>
              {companySettings && (
                <>
                  {companySettings.address && (
                    <p className="text-xs text-gray-500 mt-1 print:mt-0.5 print:leading-tight">{companySettings.address}</p>
                  )}
                  {(companySettings.city || companySettings.country) && (
                    <p className="text-xs text-gray-500 mt-1 print:mt-0.5 print:leading-tight">
                      {[companySettings.city, companySettings.country].filter(Boolean).join(' – ')}
                    </p>
                  )}
                  {companySettings.ice && (
                    <p className="text-xs text-gray-500 mt-1 print:mt-0.5 print:leading-tight">ICE: {companySettings.ice}</p>
                  )}
                  {(companySettings.if || companySettings.rc || companySettings.tp) && (
                    <p className="text-xs text-gray-500 mt-1 print:mt-0.5 print:leading-tight">
                      {[companySettings.if && `IF: ${companySettings.if}`, companySettings.rc && `RC: ${companySettings.rc}`, companySettings.tp && `TP: ${companySettings.tp}`].filter(Boolean).join(' / ')}
                    </p>
                  )}
                  {(companySettings.phone || companySettings.email) && (
                    <p className="text-xs text-gray-500 mt-1 print:mt-0.5 print:leading-tight">
                      {[companySettings.phone && `Tél: ${companySettings.phone}`, companySettings.email].filter(Boolean).join(' – ')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Client section - improved layout */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm print:grid-cols-2 print:mt-4 print:gap-4">
            {/* Client */}
            <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-2 print:py-1.5">
              <div className="text-gray-900 mb-3 font-semibold uppercase text-xs tracking-wide print:mb-1.5 print:text-[10px]">Facturé à</div>
              {invoice.order.user.clientCode && (
                <div className="text-gray-600 text-xs font-mono print:leading-tight mb-1">Code: {invoice.order.user.clientCode}</div>
              )}
              {/* 1) Nom/Société */}
              <div className="font-semibold text-gray-900 print:text-sm print:leading-tight">{clientName}</div>
              {/* 2) Email */}
              {invoice.order.user.email && (
                <div className="text-gray-600 text-xs mt-1 print:mt-0.5 print:leading-tight">{invoice.order.user.email}</div>
              )}
              {/* 3) Téléphone */}
              {invoice.order.user.phone && (
                <div className="text-gray-600 text-xs mt-1 print:mt-0.5 print:leading-tight">{invoice.order.user.phone}</div>
              )}
              {/* 4) Adresse */}
              {(invoice.order.user.address || invoice.order.user.city) && (
                <div className="text-gray-600 text-xs mt-1 print:mt-0.5 print:leading-tight">
                  {[invoice.order.user.address, invoice.order.user.city].filter(Boolean).join(', ')}
                </div>
              )}
              {/* 5) ICE */}
              {invoice.order.user.ice && (
                <div className="text-gray-600 text-xs mt-1 print:mt-0.5 print:leading-tight">ICE: {invoice.order.user.ice}</div>
              )}
            </div>
            
            {/* Informations facture */}
            <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-2 print:py-1.5">
              <div className="text-gray-900 mb-3 font-semibold uppercase text-xs tracking-wide print:mb-1.5 print:text-[10px]">Informations</div>
              <div className="space-y-2 print:space-y-1">
                <div className="print:leading-tight">
                  <span className="text-gray-600 text-xs print:text-[10px]">N° Facture:</span>
                  <span className="font-semibold text-gray-900 print:text-sm print:leading-tight ml-2">{invoice.invoiceNumber ?? invoice.id.slice(-8)}</span>
                </div>
                <div className="print:leading-tight">
                  <span className="text-gray-600 text-xs print:text-[10px]">Date:</span>
                  <span className="print:text-sm print:leading-tight ml-2">{new Date(invoice.createdAt).toLocaleDateString("fr-FR", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {(invoice.order.orderNumber || (invoice.order as any).deliveryNoteNumber) && (
                  <>
                    {invoice.order.orderNumber && (
                      <div className="print:leading-tight">
                        <span className="text-gray-600 text-xs print:text-[10px]">N° CMD:</span>
                        <span className="print:text-sm print:leading-tight ml-2">{invoice.order.orderNumber}</span>
                      </div>
                    )}
                    {(invoice.order as any).deliveryNoteNumber && (
                      <div className="print:leading-tight">
                        <span className="text-gray-600 text-xs print:text-[10px]">N° BL:</span>
                        <span className="print:text-sm print:leading-tight ml-2">{(invoice.order as any).deliveryNoteNumber}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="print:leading-tight">
                  <span className="text-gray-600 text-xs print:text-[10px]">Statut:</span>
                  <div className="font-medium print:text-sm print:leading-tight">{paymentStatusText}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 overflow-x-auto print-no-break print:mt-4">
            <table className="min-w-full text-sm print:w-full border border-gray-300 print:text-xs">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 print:px-2 print:py-1.5 print:text-[11px]">Désignation</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-900 print:px-2 print:py-1.5 print:text-[11px]">Qté</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-900 print:px-2 print:py-1.5 print:text-[11px]">Prix unitaire HT</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-900 print:px-2 print:py-1.5 print:text-[11px]">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order.items.map((it, index) => (
                  <tr key={it.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>

                    <td className="px-4 py-3 text-gray-900 print:px-2 print:py-1.5 print:leading-tight">
                      {getLineItemSku(it) !== '-' && (
                        <span className="font-mono text-gray-600 mr-1">{getLineItemSku(it)}</span>
                      )}
                      {it.product ? getLineItemDisplayName(it) : 'Produit'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 print:px-2 print:py-1.5 print:leading-tight">{it.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-700 print:px-2 print:py-1.5 print:leading-tight">{formatMoney(it.priceAtTime)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 print:px-2 print:py-1.5 print:leading-tight">{formatMoney(it.priceAtTime * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="keep-together">
            <div className="mt-8 flex justify-end print-totals print-no-break print:mt-4">
              <div className="w-full sm:w-96 text-sm space-y-2 print:w-64 print:text-xs print:space-y-1 bg-gray-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-2">
                <div className="flex justify-between print:leading-tight">
                  <span className="text-gray-600">Total HT</span>
                  <span className="font-semibold">{taxTotals.htFormatted}</span>
                </div>
                <div className="flex justify-between print:leading-tight">
                  <span className="text-gray-600">TVA ({taxTotals.ratePercent}%)</span>
                  <span>{taxTotals.vatFormatted}</span>
                </div>
                <div className="flex justify-between border-t-2 pt-2 border-gray-900 print:pt-1 print:border-t print:border-gray-900">
                  <span className="text-gray-900 font-semibold print:text-sm">Total TTC</span>
                  <span className="font-bold text-lg print:text-base">{taxTotals.ttcFormatted}</span>
                </div>
                <div className="flex justify-between mt-3 print:mt-1.5 print:leading-tight">
                  <span className="text-gray-600">Total payé</span>
                  <span>{formatMoney(paid)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 print:pt-1 print:leading-tight">
                  <span className="text-gray-600">Reste à payer</span>
                  <span className="font-semibold">{formatMoney(remaining)}</span>
                </div>
              </div>
            </div>

            {/* Montant en lettres */}
            <div className="mt-6 text-sm print-no-break border-t pt-4 print:mt-3 print:pt-2 print:border-t print:border-gray-300">
              <div className="text-gray-700 font-medium print:text-xs print:leading-tight">
                Facture arrêtée à la somme de :
              </div>
              <div className="text-gray-900 font-semibold mt-2 uppercase print:mt-1 print:text-xs print:leading-tight">
                {numberToWords(taxTotals.ttc)}
              </div>
            </div>

            {/* Conditions de paiement - affichées seulement si remplies */}
            {getPaymentTermsForDisplay(companySettings?.paymentTerms) && (
              <div className="mt-6 text-sm print-no-break print:mt-3 print:text-xs print:leading-tight">
                <div className="text-gray-700 font-medium">Conditions de paiement:</div>
                <div className="text-gray-600">{getPaymentTermsForDisplay(companySettings?.paymentTerms)}</div>
              </div>
            )}

            {/* Coordonnées bancaires */}
            <div className="mt-6 text-sm print-no-break print:mt-3 print:text-xs print:leading-tight">
              <div className="text-gray-700 font-medium">Banque:</div>
              <div className="text-gray-600">{(companySettings && 'bankName' in companySettings ? String(companySettings.bankName ?? '').trim() : '') || '—'}</div>
              <div className="mt-2 text-gray-700 font-medium">RIB:</div>
              <div className="text-gray-600 whitespace-pre-wrap">{(companySettings && 'rib' in companySettings ? String(companySettings.rib ?? '').trim() : '') || '—'}</div>
            </div>

            {/* Mentions bas de page - affichées seulement si remplies */}
            {(companySettings?.vatMention?.trim() || companySettings?.latePaymentMention?.trim()) && (
              <div className="mt-8 text-xs text-gray-500 space-y-1 border-t pt-4 print-no-break print:mt-3 print:pt-2 print:text-[10px] print:leading-tight print:border-t print:border-gray-300">
                {companySettings?.vatMention?.trim() && (
                  <div>{companySettings.vatMention}</div>
                )}
                {companySettings?.latePaymentMention?.trim() && (
                  <div>{companySettings.latePaymentMention}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
