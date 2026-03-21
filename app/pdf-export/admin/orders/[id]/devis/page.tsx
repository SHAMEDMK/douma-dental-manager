import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { DevisPdfDocument } from "@/app/components/devis-pdf"

export const dynamic = "force-dynamic"

/** Page dédiée à l'export PDF devis — template premium dérivé de la facture. */
export default async function PdfExportAdminDevisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login?role=admin")
  if (
    session.role !== "ADMIN" &&
    session.role !== "COMPTABLE" &&
    session.role !== "MAGASINIER" &&
    session.role !== "COMMERCIAL"
  ) {
    notFound()
  }

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      invoice: { select: { id: true } },
      items: { include: { product: true, productVariant: true } },
    },
  })

  if (!order) return notFound()

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  })

  const statusText =
    order.status === "CANCELLED"
      ? "Refusé"
      : order.invoice
        ? "Accepté"
        : "En attente"
  const statusKey =
    order.status === "CANCELLED"
      ? ("rejected" as const)
      : order.invoice
        ? ("accepted" as const)
        : ("pending" as const)

  return (
    <DevisPdfDocument
      order={order}
      companySettings={companySettings}
      statusText={statusText}
      statusKey={statusKey}
    />
  )
}
