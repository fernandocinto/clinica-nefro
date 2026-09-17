import { createClient } from "@/lib/supabase/server";
import { MenusManager } from "./menus-manager";

export default async function MenusPage() {
  const supabase = await createClient();
  const { data: menus } = await supabase
    .from("menus")
    .select("id, name, active")
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cardápios</h1>
      <MenusManager initialMenus={menus ?? []} />
    </div>
  );
}
