import { createClient } from "@/lib/supabase/server";
import { PatientsManager } from "./patients-manager";

export default async function PatientsPage() {
  const supabase = await createClient();

  const [{ data: patients }, { data: allergens }, { data: patientAllergens }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name, birth_date, active")
        .order("full_name"),
      supabase.from("allergens").select("id, name").order("name"),
      supabase.from("patient_allergens").select("patient_id, allergen_id"),
    ]);

  const allergenIdsByPatient = new Map<string, string[]>();
  for (const row of patientAllergens ?? []) {
    const list = allergenIdsByPatient.get(row.patient_id) ?? [];
    list.push(row.allergen_id);
    allergenIdsByPatient.set(row.patient_id, list);
  }

  const patientsWithAllergens = (patients ?? []).map((patient) => ({
    ...patient,
    allergenIds: allergenIdsByPatient.get(patient.id) ?? [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pacientes</h1>
      <PatientsManager
        initialPatients={patientsWithAllergens}
        allergens={allergens ?? []}
      />
    </div>
  );
}
