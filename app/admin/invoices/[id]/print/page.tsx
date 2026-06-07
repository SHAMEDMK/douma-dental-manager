import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import DownloadPdfButton from "@/app/components/DownloadPdfButton";
import Link from "next/link";
import { isInvoiceLocked } from "@/app/lib/invoice-lock";
import { InvoicePdfDocument } from "@/app/components/invoice-pdf";

export const dynamic = "force-dynamic";

export default async function AdminInvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?role=admin");
  if (
    session.role !== "ADMIN" &&
    session.role !== "COMPTABLE" &&
    session.role !== "COMMERCIAL"
  ) {
    redirect("/admin");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isPdfExport = resolvedSearchParams?.pdf === "1";

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

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });

  const invoiceLocked = isInvoiceLocked(invoice);

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPdfExport && (
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
              <DownloadPdfButton url={`/api/pdf/admin/invoices/${id}`} />
            </div>
          </div>
        </div>
      )}

      {!isPdfExport && invoiceLocked && (
        <div className="print:hidden max-w-4xl mx-auto px-4 py-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold text-sm">FACTURE VERROUILLÉE</span>
              <span className="text-red-600 text-xs">
                Cette facture ne peut plus être modifiée.
              </span>
            </div>
          </div>
        </div>
      )}

      <InvoicePdfDocument invoice={invoice} companySettings={companySettings} />
    </div>
  );
}
