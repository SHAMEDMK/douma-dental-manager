import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import { AdminDeliveryNotePdfDocument } from "@/app/components/delivery-note-pdf";

export default async function AdminDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Bon de livraison</div>
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

      <AdminDeliveryNotePdfDocument
        order={order}
        companySettings={companySettings}
      />
    </div>
  );
}
