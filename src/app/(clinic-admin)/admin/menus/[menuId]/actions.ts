"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function updateMenuName(id: string, name: string): Promise<ActionState> {
  await requireStaffSession();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome do cardápio." };

  const supabase = await createClient();
  const { error } = await supabase.from("menus").update({ name: trimmed }).eq("id", id);
  if (error) return { error: "Não foi possível renomear o cardápio." };

  revalidatePath(`/admin/menus/${id}`);
  return {};
}

export async function createAvailability(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const menuId = String(formData.get("menu_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "") || null;
  const endDate = String(formData.get("end_date") ?? "") || null;
  const startTime = String(formData.get("start_time") ?? "") || null;
  const endTime = String(formData.get("end_time") ?? "") || null;
  const daysOfWeek = formData.getAll("days_of_week").map(Number);

  const supabase = await createClient();
  const { error } = await supabase.from("menu_availability").insert({
    menu_id: menuId,
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    days_of_week: daysOfWeek.length > 0 ? daysOfWeek : null,
  });

  if (error) return { error: "Não foi possível criar a regra de disponibilidade." };

  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function deleteAvailability(id: string, menuId: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("menu_availability").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a regra." };
  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function createGroup(menuId: string, name: string, nextSortOrder: number): Promise<ActionState> {
  await requireStaffSession();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome do grupo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_groups")
    .insert({ menu_id: menuId, name: trimmed, sort_order: nextSortOrder });
  if (error) return { error: "Não foi possível criar o grupo." };

  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function renameGroup(id: string, menuId: string, name: string): Promise<ActionState> {
  await requireStaffSession();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome do grupo." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_groups").update({ name: trimmed }).eq("id", id);
  if (error) return { error: "Não foi possível renomear o grupo." };

  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function deleteGroup(id: string, menuId: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("menu_groups").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o grupo." };
  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function reorderGroups(
  menuId: string,
  orderedIds: string[]
): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("menu_groups").update({ sort_order: index }).eq("id", id)
    )
  );
  if (results.some((r) => r.error)) return { error: "Não foi possível reordenar os grupos." };

  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}

export async function saveGroupProducts(
  groupId: string,
  menuId: string,
  productIds: string[]
): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();

  await supabase.from("menu_group_products").delete().eq("menu_group_id", groupId);
  if (productIds.length > 0) {
    const { error } = await supabase.from("menu_group_products").insert(
      productIds.map((product_id, index) => ({
        menu_group_id: groupId,
        product_id,
        sort_order: index,
      }))
    );
    if (error) return { error: "Não foi possível salvar os produtos do grupo." };
  }

  revalidatePath(`/admin/menus/${menuId}`);
  return {};
}
