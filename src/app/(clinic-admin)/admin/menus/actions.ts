"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createMenu(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do cardápio." };

  const supabase = await createClient();
  const { error } = await supabase.from("menus").insert({ tenant_id: session.tenantId, name });
  if (error) return { error: "Não foi possível criar o cardápio." };

  revalidatePath("/admin/menus");
  return {};
}

export async function toggleMenuActive(id: string, active: boolean): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("menus").update({ active }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar o cardápio." };
  revalidatePath("/admin/menus");
  return {};
}

export async function deleteMenu(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("menus").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o cardápio." };
  revalidatePath("/admin/menus");
  return {};
}
