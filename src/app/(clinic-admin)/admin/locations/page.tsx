import { requireStaffSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocationsManager } from "./locations-manager";

export default async function LocationsPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  const [{ data: tenant }, { data: locations }, { data: beds }] = await Promise.all([
    supabase.from("tenants").select("subdomain").eq("id", session.tenantId).single(),
    supabase.from("locations").select("id, name").order("name"),
    supabase
      .from("beds")
      .select("id, label, location_id, public_token")
      .order("label"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Locais e leitos</h1>
      <LocationsManager
        initialLocations={locations ?? []}
        initialBeds={beds ?? []}
        subdomain={tenant?.subdomain ?? ""}
      />
    </div>
  );
}
