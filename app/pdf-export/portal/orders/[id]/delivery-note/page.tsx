import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PortalDeliveryNotePdfDocument } from "@/app/components/delivery-note-pdf";

export const dynamic = "force-dynamic";

/** Page dédiée à l'export PDF (PDFShift) — BL portail, charte facture. */
export default async function PdfExportPortalDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      deliveryConfirmationCode: true,
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          ice: true,
        }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          product: { select: { name: true, sku: true } },
          productVariant: { select: { name: true, sku: true } },
        }
      },
    },
  });

  if (!order) return notFound();
  if (order.userId !== session.id) return notFound();

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <PortalDeliveryNotePdfDocument
      order={order}
      companySettings={companySettings}
    />
  );
}
