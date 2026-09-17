"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createAllergen(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do alérgeno." };

  const supabase = await createClient();
  const { error } = await supabase.from("allergens").insert({ name });
  if (error) {
    return {
      error: error.code === "23505" ? "Esse alérgeno já existe." : "Não foi possível criar o alérgeno.",
    };
  }

  revalidatePath("/admin/allergens");
  return {};
}

export async function renameAllergen(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome do alérgeno." };

  const supabase = await createClient();
  const { error } = await supabase.from("allergens").update({ name }).eq("id", id);
  if (error) return { error: "Não foi possível renomear o alérgeno." };

  revalidatePath("/admin/allergens");
  return {};
}

export async function deleteAllergen(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("allergens").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir: este alérgeno está em uso." };
  revalidatePath("/admin/allergens");
  return {};
}
