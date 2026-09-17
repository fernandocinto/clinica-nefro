"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function createLocation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do local." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .insert({ tenant_id: session.tenantId, name });

  if (error) return { error: "Não foi possível criar o local." };

  revalidatePath("/admin/locations");
  return {};
}

export async function deleteLocation(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) {
    return { error: "Não foi possível excluir: este local ainda tem leitos cadastrados." };
  }
  revalidatePath("/admin/locations");
  return {};
}

export async function createBed(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStaffSession();
  const label = String(formData.get("label") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "");
  if (!label || !locationId) return { error: "Informe o local e o rótulo do leito." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("beds")
    .insert({ tenant_id: session.tenantId, location_id: locationId, label });

  if (error) return { error: "Não foi possível criar o leito." };

  revalidatePath("/admin/locations");
  return {};
}

export async function updateBed(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "");
  if (!id || !label || !locationId) return { error: "Informe o local e o rótulo do leito." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("beds")
    .update({ label, location_id: locationId })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o leito." };

  revalidatePath("/admin/locations");
  return {};
}

export async function deleteBed(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("beds").delete().eq("id", id);
  if (error) {
    return { error: "Não foi possível excluir: este leito já tem pedidos ou ocupações registradas." };
  }
  revalidatePath("/admin/locations");
  return {};
}

export async function regenerateBedToken(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("beds")
    .update({ public_token: token })
    .eq("id", id);
  if (error) return { error: "Não foi possível gerar um novo link." };
  revalidatePath("/admin/locations");
  return {};
}
