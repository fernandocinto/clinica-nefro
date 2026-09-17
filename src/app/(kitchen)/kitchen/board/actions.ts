"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/database.types";

export type ActionState = { error?: string };

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionState> {
  const session = await requireStaffSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: "Não foi possível atualizar o pedido." };

  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status, changed_by: session.userId });

  revalidatePath("/kitchen/board");
  revalidatePath("/kitchen/kds");
  return {};
}
