import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { InvoicePdfDocument } from "@/app/components/invoice-pdf";

export const dynamic = "force-dynamic";

/** Page dédiée à l'export PDF (PDFShift) — portail client. Template premium A4 portrait. */
export default async function PdfExportPortalInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  if (invoice.order.userId !== session.id) return notFound();

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <InvoicePdfDocument
      invoice={invoice}
      companySettings={companySettings}
    />
  );
}
