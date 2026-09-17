"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

function parseAllergenIds(formData: FormData): string[] {
  return formData.getAll("allergen_ids").map(String);
}

async function replacePatientAllergens(
  patientId: string,
  allergenIds: string[]
) {
  const supabase = await createClient();
  await supabase.from("patient_allergens").delete().eq("patient_id", patientId);
  if (allergenIds.length > 0) {
    await supabase.from("patient_allergens").insert(
      allergenIds.map((allergen_id) => ({ patient_id: patientId, allergen_id }))
    );
  }
}

export async function createPatient(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStaffSession();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");

  if (!fullName || !birthDate) {
    return { error: "Nome e data de nascimento são obrigatórios." };
  }

  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({ tenant_id: session.tenantId, full_name: fullName, birth_date: birthDate })
    .select("id")
    .single();

  if (error || !patient) {
    return { error: "Não foi possível criar o paciente." };
  }

  await replacePatientAllergens(patient.id, parseAllergenIds(formData));

  revalidatePath("/admin/patients");
  return {};
}

export async function updatePatient(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaffSession();
  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");
  const active = formData.get("active") === "true";

  if (!id || !fullName || !birthDate) {
    return { error: "Nome e data de nascimento são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ full_name: fullName, birth_date: birthDate, active })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar o paciente." };
  }

  await replacePatientAllergens(id, parseAllergenIds(formData));

  revalidatePath("/admin/patients");
  return {};
}

export async function deletePatient(id: string): Promise<ActionState> {
  await requireStaffSession();
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").delete().eq("id", id).select("id");

  if (error) {
    return {
      error:
        "Não foi possível excluir: este paciente já tem pedidos ou ocupações registradas.",
    };
  }
  if (!data || data.length === 0) {
    return { error: "Não foi possível excluir: paciente não encontrado ou sem permissão." };
  }

  revalidatePath("/admin/patients");
  return {};
}
