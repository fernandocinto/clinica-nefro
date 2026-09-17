"use server";

import { getTenantFromHeaders } from "@/lib/tenant";
import {
  getActiveMenuForTenant,
  getCurrentPatientForBed,
  resolveBedByToken,
} from "@/lib/patient-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { printOrder } from "@/lib/print/printOrder";

export type OrderActionState = { error?: string; success?: boolean };

export type OrderItemInput = { productId: string; quantity: number };

export async function createPatientOrder(
  token: string,
  items: OrderItemInput[]
): Promise<OrderActionState> {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { error: "Link inválido." };

  const bed = await resolveBedByToken(token, tenant.id);
  if (!bed) return { error: "Link inválido." };

  const patient = await getCurrentPatientForBed(bed.id);
  if (!patient) {
    return { error: "Não encontramos um paciente associado a este leito agora. Fale com a equipe." };
  }

  const menu = await getActiveMenuForTenant(tenant.id);
  if (!menu) return { error: "Nenhum cardápio disponível no momento." };

  const productsById = new Map(menu.groups.flatMap((g) => g.products).map((p) => [p.id, p]));
  const cleanItems = items.filter((item) => item.quantity > 0);

  if (cleanItems.length === 0) return { error: "Selecione ao menos um item." };

  for (const item of cleanItems) {
    const product = productsById.get(item.productId);
    if (!product) return { error: "Um dos itens selecionados não está mais disponível." };
    if (product.allergenIds.some((id) => patient.allergenIds.includes(id))) {
      return { error: `"${product.name}" contém um alérgeno do paciente e não pode ser pedido.` };
    }
  }

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ tenant_id: tenant.id, patient_id: patient.id, bed_id: bed.id })
    .select("id")
    .single();

  if (orderError || !order) return { error: "Não foi possível enviar o pedido. Tente novamente." };

  const { error: itemsError } = await supabase.from("order_items").insert(
    cleanItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
    }))
  );
  if (itemsError) return { error: "Não foi possível salvar os itens do pedido." };

  await supabase
    .from("order_status_history")
    .insert({ order_id: order.id, status: "recebido", changed_by: null });

  await printOrder({
    id: order.id,
    bedLabel: bed.label,
    patientName: patient.fullName,
    items: cleanItems.map((item) => ({
      productName: productsById.get(item.productId)!.name,
      quantity: item.quantity,
    })),
  });

  return { success: true };
}
