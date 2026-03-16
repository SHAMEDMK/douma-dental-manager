import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { computeTaxTotals } from "@/app/lib/tax";
import { formatMoneyWithCurrency, calculateTotalPaid, calculateInvoiceRemaining, getPaymentTermsForDisplay } from "@/app/lib/invoice-utils";
import { formatDateLong } from "@/lib/config";
import { numberToWords } from "@/app/lib/number-to-words";
import { getLineItemDisplayName, getLineItemSku } from "@/app/lib/line-item-display";
import InvoicePrintFooter from "@/app/components/InvoicePrintFooter";
import InvoiceQRCode from "@/app/components/InvoiceQRCode";

export const dynamic = "force-dynamic";

/** Page dédiée à l'export PDF (PDFShift) — rôle COMPTABLE. Même design que admin (Douma Dental Manager). */
export default async function PdfExportComptableInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?role=comptable");
  if (session.role !== "COMPTABLE") notFound();

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

  if (!invoice || !invoice.order) notFound();

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  const vatRate = companySettings?.vatRate ?? 0.2;
  const taxTotals = computeTaxTotals(invoice.amount ?? 0, vatRate);
  const paid = calculateTotalPaid(invoice.payments);
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, paid, vatRate);
  const clientName = invoice.order.user.companyName ?? invoice.order.user.name ?? invoice.order.user.email;
  const paymentStatusText =
    invoice.status === 'PAID' ? 'Payée' :
    invoice.status === 'PARTIAL' ? 'Partiellement payée' :
    invoice.status === 'CANCELLED' ? 'Annulée' :
    'Impayée';

  return (
    <div className="min-h-screen bg-white print:leading-snug print:leading-relaxed">
      <div className="max-w-4xl mx-auto px-6 py-6 print:max-w-full print:mx-0 print:px-4 print:py-3">
        <div className="print-page bg-white print:min-h-0">
          {/* En-tête : émetteur + titre FACTURE */}
          <div className="flex items-start justify-between gap-6 mb-10 print:mb-6">
            <div>
              {companySettings?.logoUrl && (
                <div className="mb-3 print:mb-2">
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.name || 'Logo'}
                    className="h-14 w-auto object-contain print:h-12"
                  />
                </div>
              )}
              <h2 className="text-base font-semibold text-gray-900 leading-tight">{companySettings?.name || 'DOUMA Dental Manager'}</h2>
              {companySettings && (
                <div className="mt-1.5 text-xs text-gray-600 space-y-0.5 leading-tight">
                  {companySettings.address && <p>{companySettings.address}</p>}
                  {(companySettings.city || companySettings.country) && (
                    <p>{[companySettings.city, companySettings.country].filter(Boolean).join(' – ')}</p>
                  )}
                  {companySettings.ice && <p>ICE: {companySettings.ice}</p>}
                  {(companySettings.if || companySettings.rc || companySettings.tp) && (
                    <p className="text-[11px]">
                      {[companySettings.if && `IF: ${companySettings.if}`, companySettings.rc && `RC: ${companySettings.rc}`, companySettings.tp && `TP: ${companySettings.tp}`].filter(Boolean).join(' / ')}
                    </p>
                  )}
                  {(companySettings.phone || companySettings.email) && (
                    <p>{[companySettings.phone && `Tél: ${companySettings.phone}`, companySettings.email].filter(Boolean).join(' – ')}</p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FACTURE</h1>
              <p className="text-xs text-gray-500">Document officiel</p>
              <InvoiceQRCode
                invoiceId={id}
                invoiceNumber={invoice.invoiceNumber}
                amountTTC={taxTotals.ttc}
                createdAt={invoice.createdAt}
              />
            </div>
          </div>

          {/* Blocs Facturé à + Informations — compactés pour tenir 6–7 articles sur une page */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 print:grid-cols-2 print:gap-5 print:mb-6">
            <div className="border border-gray-200 rounded p-4 print:border print:rounded-none print:p-2 print:py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 print:mb-1">Facturé à</div>
              <div className="space-y-0.5 print:space-y-0">
                {invoice.order.user.clientCode && (
                  <p className="text-xs text-gray-500 font-mono">Code: {invoice.order.user.clientCode}</p>
                )}
                <p className="font-semibold text-gray-900 text-sm">{clientName}</p>
                {invoice.order.user.email && <p className="text-xs text-gray-600">{invoice.order.user.email}</p>}
                {invoice.order.user.phone && <p className="text-xs text-gray-600">{invoice.order.user.phone}</p>}
                {(invoice.order.user.address || invoice.order.user.city) && (
                  <p className="text-xs text-gray-600">{[invoice.order.user.address, invoice.order.user.city].filter(Boolean).join(', ')}</p>
                )}
                {invoice.order.user.ice && <p className="text-xs text-gray-600">ICE: {invoice.order.user.ice}</p>}
              </div>
            </div>
            <div className="border border-gray-200 rounded p-4 print:border print:rounded-none print:p-2 print:py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 print:mb-1">Informations</div>
              <div className="text-xs space-y-1.5 print:space-y-0.5">
                <div className="flex justify-between"><span className="text-gray-500">N° Facture</span><span className="font-medium text-gray-900">{invoice.invoiceNumber ?? invoice.id.slice(-8)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDateLong(invoice.createdAt)}</span></div>
                {invoice.order.orderNumber && (
                  <div className="flex justify-between"><span className="text-gray-500">N° CMD</span><span>{invoice.order.orderNumber}</span></div>
                )}
                {(invoice.order as { deliveryNoteNumber?: string }).deliveryNoteNumber && (
                  <div className="flex justify-between"><span className="text-gray-500">N° BL</span><span>{(invoice.order as { deliveryNoteNumber: string }).deliveryNoteNumber}</span></div>
                )}
                <div className="flex justify-between pt-1 border-t border-gray-100 print:pt-0.5"><span className="text-gray-500">Statut</span><span className="font-medium">{paymentStatusText}</span></div>
              </div>
            </div>
          </div>

          {/* Tableau des lignes (plusieurs articles = suite de pages, en-tête répété) */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="invoice-pdf-table min-w-full text-sm border border-gray-200 print:text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider print:py-1.5 print:px-2">Désignation</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-16 print:py-1.5 print:px-2">Qté</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider print:py-1.5 print:px-2">Prix unit. HT</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider print:py-1.5 print:px-2">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order.items.map((it, index) => (
                  <tr key={it.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="py-2 px-3 text-gray-900 print:py-1 print:px-2">
                      {getLineItemSku(it) !== '-' && <span className="font-mono text-gray-500 text-xs mr-1.5">{getLineItemSku(it)}</span>}
                      {it.product ? getLineItemDisplayName(it) : 'Produit'}
                    </td>
                    <td className="py-2 px-3 text-center text-gray-700 print:py-1 print:px-2">{it.quantity}</td>
                    <td className="py-2 px-3 text-right text-gray-700 print:py-1 print:px-2">{formatMoneyWithCurrency(it.priceAtTime)}</td>
                    <td className="py-2 px-3 text-right font-medium text-gray-900 print:py-1 print:px-2">{formatMoneyWithCurrency(it.priceAtTime * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux et mentions */}
          <div className="mt-10 flex flex-col items-end gap-6 print:mt-6 print:gap-4">
            <div className="w-72 text-sm border border-gray-200 rounded p-4 print:border print:rounded-none print:p-2 print:text-xs">
              <div className="flex justify-between py-1 print:py-0.5"><span className="text-gray-600">Total HT</span><span className="font-medium">{formatMoneyWithCurrency(taxTotals.ht)}</span></div>
              <div className="flex justify-between py-1 print:py-0.5"><span className="text-gray-600">TVA ({taxTotals.ratePercent}%)</span><span>{formatMoneyWithCurrency(taxTotals.vat)}</span></div>
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-800 font-semibold print:py-1 print:mt-0.5">
                <span>Total TTC</span>
                <span className="text-lg print:text-base">{formatMoneyWithCurrency(taxTotals.ttc)}</span>
              </div>
              <div className="flex justify-between py-1 mt-2 text-gray-600 border-t border-gray-200 print:py-0.5 print:mt-1"><span>Total payé</span><span>{formatMoneyWithCurrency(paid)}</span></div>
              <div className="flex justify-between py-1 font-medium print:py-0.5"><span>Reste à payer</span><span>{formatMoneyWithCurrency(remaining)}</span></div>
            </div>

            <div className="w-full max-w-xl text-left border-t-2 border-gray-400 pt-6 print:pt-4 print:text-xs">
              <p className="text-xs text-gray-500">Facture arrêtée à la somme de :</p>
              <p className="text-sm font-semibold text-gray-900 uppercase mt-1">{numberToWords(taxTotals.ttc)}</p>
            </div>

            {getPaymentTermsForDisplay(companySettings?.paymentTerms) && (
              <div className="w-full max-w-xl text-left text-xs print:text-[11px]">
                <p className="font-medium text-gray-700">Conditions de paiement</p>
                <p className="text-gray-600 mt-0.5 leading-relaxed">{getPaymentTermsForDisplay(companySettings?.paymentTerms)}</p>
              </div>
            )}

            {(companySettings?.bankName?.trim() || companySettings?.rib?.trim()) && (
              <div className="w-full max-w-xl text-left text-xs border-t border-gray-300 pt-4 print:pt-2 print:text-[11px]">
                <p className="font-medium text-gray-700">Banque</p>
                <p className="text-gray-600">{companySettings?.bankName?.trim() || '—'}</p>
                <p className="font-medium text-gray-700 mt-2">RIB</p>
                <p className="text-gray-600 whitespace-pre-wrap">{companySettings?.rib?.trim() || '—'}</p>
              </div>
            )}

            {(companySettings?.vatMention?.trim() || companySettings?.latePaymentMention?.trim()) && (
              <div className="w-full max-w-xl text-left text-xs text-gray-500 border-t border-gray-300 pt-4 space-y-1 print:pt-2 print:text-[11px]">
                {companySettings?.vatMention?.trim() && <p>{companySettings.vatMention}</p>}
                {companySettings?.latePaymentMention?.trim() && <p>{companySettings.latePaymentMention}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      <InvoicePrintFooter companySettings={companySettings} />
    </div>
  );
}
