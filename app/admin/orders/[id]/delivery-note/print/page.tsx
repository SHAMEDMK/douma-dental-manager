import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Redirige vers la page canonique du BL admin. */
export default async function AdminDeliveryNotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/orders/${id}/delivery-note`);
}
