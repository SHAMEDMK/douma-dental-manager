import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AdminDeliveryNotePdfDocument } from "@/app/components/delivery-note-pdf";

export const dynamic = "force-dynamic";

/** Page dédiée à l'export PDF (PDFShift) — bon de livraison admin. Pas de barre, pas d'en-tête app. */
export default async function PdfExportAdminDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      createdAt: true,
      deliveryConfirmationCode: true,
      deliveryAddress: true,
      deliveryCity: true,
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

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <AdminDeliveryNotePdfDocument
      order={order}
      companySettings={companySettings}
    />
  );
}
