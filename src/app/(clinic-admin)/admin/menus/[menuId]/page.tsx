import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuDetailManager } from "./menu-detail-manager";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  const supabase = await createClient();

  const { data: menu } = await supabase
    .from("menus")
    .select("id, name, active")
    .eq("id", menuId)
    .single();

  if (!menu) notFound();

  const [
    { data: availability },
    { data: groups },
    { data: groupProducts },
    { data: products },
  ] = await Promise.all([
    supabase
      .from("menu_availability")
      .select("id, start_date, end_date, days_of_week, start_time, end_time")
      .eq("menu_id", menuId),
    supabase
      .from("menu_groups")
      .select("id, name, sort_order")
      .eq("menu_id", menuId)
      .order("sort_order"),
    supabase.from("menu_group_products").select("menu_group_id, product_id, sort_order"),
    supabase.from("products").select("id, name, active").order("name"),
  ]);

  const groupIds = new Set((groups ?? []).map((g) => g.id));
  const relevantGroupProducts = (groupProducts ?? []).filter((gp) =>
    groupIds.has(gp.menu_group_id)
  );

  return (
    <MenuDetailManager
      menu={menu}
      initialAvailability={availability ?? []}
      initialGroups={groups ?? []}
      initialGroupProducts={relevantGroupProducts}
      products={products ?? []}
    />
  );
}
