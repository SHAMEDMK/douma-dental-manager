import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

type RangeKey = "today" | "7d" | "30d" | "month";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function getRange(range: RangeKey | undefined) {
  const now = new Date();
  const key: RangeKey = range ?? "7d";
  let from: Date;

  if (key === "today") from = startOfDay(now);
  else if (key === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (key === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else from = startOfMonth(now);

  return { key, from, to: now };
}

function formatMoney(v: number) {
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(2);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: RangeKey }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?role=admin");
  if (session.role !== "ADMIN" && session.role !== "COMPTA" && session.role !== "STOCK") {
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const { key, from, to } = getRange(sp.range);

  // On prend les commandes créées dans la période, avec user + items + invoice + payments
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      user: true,
      items: { include: { product: true } },
      invoice: { include: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ===== KPIs =====
  const totalOrders = orders.length;

  // CA = somme des montants de facture (si invoice existe)
  const revenue = orders.reduce((sum, o) => sum + (o.invoice?.amount ?? 0), 0);

  // Total payé = somme des paiements
  const totalPaid = orders.reduce((sum, o) => {
    const paid = o.invoice?.payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
    return sum + paid;
  }, 0);

  // Impayés = (invoice.amount - totalPaid) clamp >= 0
  const outstanding = Math.max(0, revenue - totalPaid);

  // Marge = somme (priceAtTime - costAtTime) * qty
  const margin = orders.reduce((sum, o) => {
    const m = o.items.reduce((s, it) => s + (it.priceAtTime - (it.costAtTime ?? 0)) * it.quantity, 0);
    return sum + m;
  }, 0);

  // ===== Top Clients =====
  const byClient = new Map<
    string,
    {
      userId: string;
      email: string;
      name: string | null;
      companyName: string | null;
      balance: number;
      creditLimit: number;
      ordersCount: number;
      revenue: number;
      margin: number;
      paid: number;
      outstanding: number;
    }
  >();

  for (const o of orders) {
    const u = o.user;
    if (!u) continue;

    const id = u.id;
    const invAmount = o.invoice?.amount ?? 0;
    const paid = o.invoice?.payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
    const out = Math.max(0, invAmount - paid);
    const m = o.items.reduce((s, it) => s + (it.priceAtTime - (it.costAtTime ?? 0)) * it.quantity, 0);

    if (!byClient.has(id)) {
      byClient.set(id, {
        userId: id,
        email: u.email,
        name: u.name ?? null,
        companyName: u.companyName ?? null,
        balance: u.balance ?? 0,
        creditLimit: (u as any).creditLimit ?? 0,
        ordersCount: 0,
        revenue: 0,
        margin: 0,
        paid: 0,
        outstanding: 0,
      });
    }

    const row = byClient.get(id)!;
    row.ordersCount += 1;
    row.revenue += invAmount;
    row.margin += m;
    row.paid += paid;
    row.outstanding += out;
  }

  const topClients = Array.from(byClient.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ===== Top Produits =====
  const byProduct = new Map<
    string,
    {
      productId: string;
      name: string;
      qty: number;
      revenue: number;
      margin: number;
      stock: number;
    }
  >();

  for (const o of orders) {
    for (const it of o.items) {
      const p = it.product;
      if (!p) continue;
      const pid = p.id;

      if (!byProduct.has(pid)) {
        byProduct.set(pid, {
          productId: pid,
          name: p.name,
          qty: 0,
          revenue: 0,
          margin: 0,
          stock: p.stock ?? 0,
        });
      }

      const row = byProduct.get(pid)!;
      row.qty += it.quantity;
      row.revenue += it.priceAtTime * it.quantity;
      row.margin += (it.priceAtTime - (it.costAtTime ?? 0)) * it.quantity;
    }
  }

  const topProducts = Array.from(byProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Aujourd'hui" },
    { key: "7d", label: "7 jours" },
    { key: "30d", label: "30 jours" },
    { key: "month", label: "Ce mois" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Période : <span className="font-semibold">{key}</span> — du{" "}
            {from.toLocaleDateString("fr-FR")} au {to.toLocaleDateString("fr-FR")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => (
            <Link
              key={r.key}
              href={`/admin/dashboard?range=${r.key}`}
              className={`px-3 py-2 rounded-md text-sm border transition ${
                r.key === key ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-200"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Chiffre d'affaires (facturé)</div>
          <div className="text-2xl font-bold">{formatMoney(revenue)} €</div>
          <div className="text-xs text-gray-500 mt-1">Somme des factures sur la période</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Marge brute</div>
          <div className="text-2xl font-bold">{formatMoney(margin)} €</div>
          <div className="text-xs text-gray-500 mt-1">(priceAtTime − costAtTime) × quantité</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Impayés</div>
          <div className="text-2xl font-bold">{formatMoney(outstanding)} €</div>
          <div className="text-xs text-gray-500 mt-1">Facturé − payé</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Commandes</div>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <div className="text-xs text-gray-500 mt-1">Nombre de commandes créées</div>
        </div>
      </div>

      {/* Top clients */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Top clients</h2>
          <Link href="/admin/clients" className="text-sm text-blue-700 hover:underline">
            Voir tous les clients
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-right px-4 py-2">Commandes</th>
                <th className="text-right px-4 py-2">CA</th>
                <th className="text-right px-4 py-2">Marge</th>
                <th className="text-right px-4 py-2">Impayés</th>
                <th className="text-right px-4 py-2">Solde</th>
                <th className="text-right px-4 py-2">Plafond</th>
              </tr>
            </thead>
            <tbody>
              {topClients.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={7}>
                    Aucune donnée sur cette période.
                  </td>
                </tr>
              ) : (
                topClients.map((c) => (
                  <tr key={c.userId} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.companyName ?? c.name ?? c.email}</div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{c.ordersCount}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.revenue)} €</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.margin)} €</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.outstanding)} €</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.balance)} €</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.creditLimit)} €</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top produits */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Top produits</h2>
          <Link href="/admin/products" className="text-sm text-blue-700 hover:underline">
            Voir le catalogue
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Produit</th>
                <th className="text-right px-4 py-2">Qté</th>
                <th className="text-right px-4 py-2">CA</th>
                <th className="text-right px-4 py-2">Marge</th>
                <th className="text-right px-4 py-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={5}>
                    Aucune donnée sur cette période.
                  </td>
                </tr>
              ) : (
                topProducts.map((p) => (
                  <tr key={p.productId} className="border-t">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-right">{p.qty}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(p.revenue)} €</td>
                    <td className="px-4 py-3 text-right">{formatMoney(p.margin)} €</td>
                    <td className="px-4 py-3 text-right">{p.stock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Note : Les calculs sont faits côté serveur sur les commandes de la période (OK pour notre volume actuel). On optimisera avec
        des agrégations Prisma si nécessaire.
      </div>
    </div>
  );
}
