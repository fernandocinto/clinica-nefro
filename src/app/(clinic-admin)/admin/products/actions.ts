"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

function parseAllergenIds(formData: FormData): string[] {
  return formData.getAll("allergen_ids").map(String);
}

async function replaceProductAllergens(productId: string, allergenIds: string[]) {
  const supabase = await createClient();
  await supabase.from("product_allergens").delete().eq("product_id", productId);
  if (allergenIds.length > 0) {
    await supabase.from("product_allergens").insert(
      allergenIds.map((allergen_id) => ({ product_id: productId, allergen_id }))
    );
  }
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { error: "Informe o nome do produto." };

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({ tenant_id: session.tenantId, name, description: description || null })
    .select("id")
    .single();

  if (error || !product) return { error: "Não foi possível criar o produto." };

  await replaceProductAllergens(product.id, parseAllergenIds(formData));

  revalidatePath("/admin/products");
  return {};
}

export async function updateProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "true";
  if (!id || !name) return { error: "Informe o nome do produto." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ name, description: description || null, active })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o produto." };

  await replaceProductAllergens(id, parseAllergenIds(formData));

  revalidatePath("/admin/products");
  return {};
}

export async function deleteProduct(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return { error: "Não foi possível excluir: este produto está em uso em algum cardápio ou pedido." };
  }
  revalidatePath("/admin/products");
  return {};
}
