import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import { PortalDeliveryNotePdfDocument } from "@/app/components/delivery-note-pdf";
import { isDeliveryNoteAvailable } from "@/app/lib/delivery-note-access";

export const dynamic = "force-dynamic";

export default async function PortalDeliveryNotePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isPdfExport = resolvedSearchParams?.pdf === "1";

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      orderNumber: true,
      deliveryNoteNumber: true,
      createdAt: true,
      total: true,
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
          priceAtTime: true,
          product: { select: { name: true, sku: true } },
          productVariant: { select: { name: true, sku: true } },
        }
      },
    },
  });

  if (!order) return notFound();
  if (order.userId !== session.id) return notFound();
  if (!isDeliveryNoteAvailable(order)) return notFound();

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPdfExport && (
        <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">Aperçu bon de livraison</div>
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
      )}

      <PortalDeliveryNotePdfDocument
        order={order}
        companySettings={companySettings}
      />
    </div>
  );
}
