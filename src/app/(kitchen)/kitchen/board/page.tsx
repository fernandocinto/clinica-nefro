import { createClient } from "@/lib/supabase/server";
import { getClinicNow } from "@/lib/clinic-time";
import { KanbanBoard, type BoardOrder } from "./kanban-board";

export default async function KitchenBoardPage() {
  const supabase = await createClient();
  const todayStart = `${getClinicNow().date}T00:00:00`;

  const { data: orders } = await supabase
    .from("orders")
    .select("id, patient_id, bed_id, status, created_at")
    .neq("status", "cancelado")
    .gte("created_at", todayStart)
    .order("created_at");

  const orderIds = (orders ?? []).map((o) => o.id);
  const patientIds = Array.from(new Set((orders ?? []).map((o) => o.patient_id)));
  const bedIds = Array.from(new Set((orders ?? []).map((o) => o.bed_id)));

  const [{ data: items }, { data: patients }, { data: beds }] = await Promise.all([
    orderIds.length > 0
      ? supabase.from("order_items").select("order_id, product_id, quantity").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; product_id: string; quantity: number }[] }),
    patientIds.length > 0
      ? supabase.from("patients").select("id, full_name").in("id", patientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    bedIds.length > 0
      ? supabase.from("beds").select("id, label").in("id", bedIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
  ]);

  const productIds = Array.from(new Set((items ?? []).map((i) => i.product_id)));
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };

  const patientById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));
  const bedById = new Map((beds ?? []).map((b) => [b.id, b.label]));
  const productById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const boardOrders: BoardOrder[] = (orders ?? []).map((order) => ({
    id: order.id,
    status: order.status,
    patientName: patientById.get(order.patient_id) ?? "—",
    bedLabel: bedById.get(order.bed_id) ?? "—",
    createdAt: order.created_at,
    items: (items ?? [])
      .filter((i) => i.order_id === order.id)
      .map((i) => ({
        productName: productById.get(i.product_id) ?? "—",
        quantity: i.quantity,
      })),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Kanban de pedidos</h1>
      <KanbanBoard orders={boardOrders} />
    </div>
  );
}
