import { createClient } from "@/lib/supabase/server";
import { AllergensManager } from "./allergens-manager";

export default async function AllergensPage() {
  const supabase = await createClient();
  const { data: allergens } = await supabase.from("allergens").select("id, name").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Alérgenos</h1>
      <AllergensManager initialAllergens={allergens ?? []} />
    </div>
  );
}
