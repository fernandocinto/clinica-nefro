import { createClient } from "@/lib/supabase/server";
import { getClinicNow } from "@/lib/clinic-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AGGREGATED_STATUSES = ["recebido", "em_preparo"] as const;

export default async function KitchenDisplaySystemPage() {
  const supabase = await createClient();
  const todayStart = `${getClinicNow().date}T00:00:00`;

  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .in("status", AGGREGATED_STATUSES)
    .gte("created_at", todayStart);

  const orderIds = (orders ?? []).map((o) => o.id);

  const { data: items } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("product_id, quantity").in("order_id", orderIds)
      : { data: [] as { product_id: string; quantity: number }[] };

  const productIds = Array.from(new Set((items ?? []).map((i) => i.product_id)));
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };

  const productById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const totals = new Map<string, number>();
  for (const item of items ?? []) {
    totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
  }

  const rows = Array.from(totals.entries())
    .map(([productId, quantity]) => ({ name: productById.get(productId) ?? "—", quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">KDS — produção em lote</h1>
      <p className="text-sm text-gray-600">
        Itens agregados de pedidos recebidos ou em preparo hoje.
      </p>
      <Table className="max-w-md">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right text-lg font-semibold">{row.quantity}x</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-gray-500">
                Nenhum item para produzir agora.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
