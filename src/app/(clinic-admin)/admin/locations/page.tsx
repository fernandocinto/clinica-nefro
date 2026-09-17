import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenant";
import { LocationsManager } from "./locations-manager";

export default async function LocationsPage() {
  const tenant = await requireTenant();
  const supabase = await createClient();

  const [{ data: locations }, { data: beds }] = await Promise.all([
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
        subdomain={tenant.subdomain}
      />
    </div>
  );
}
