import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Redirige vers l'aperçu print canonique du BL portail. */
export default async function PortalDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/orders/${id}/delivery-note/print`);
}
