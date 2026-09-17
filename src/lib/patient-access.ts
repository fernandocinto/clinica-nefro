import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClinicNow, getShiftForTime } from "@/lib/clinic-time";

// Tudo aqui roda com o client de service role: o paciente não tem sessão
// no Supabase Auth (auth.users), então RLS não se aplica a ele. A validação
// de acesso (token -> leito -> tenant) é feita neste módulo, em código, e
// deve ser chamada em toda rota/ação da área do paciente antes de ler ou
// gravar qualquer coisa.

export type ResolvedBed = { id: string; label: string; tenantId: string };

export async function resolveBedByToken(
  token: string,
  expectedTenantId: string
): Promise<ResolvedBed | null> {
  const supabase = createAdminClient();
  const { data: bed } = await supabase
    .from("beds")
    .select("id, label, tenant_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!bed || bed.tenant_id !== expectedTenantId) return null;

  return { id: bed.id, label: bed.label, tenantId: bed.tenant_id };
}

export type CurrentPatient = {
  id: string;
  fullName: string;
  allergenIds: string[];
};

// Falha fechado por design: se não houver ocupação exata para o
// turno/dia atual, não adivinha o paciente (checagem de alergia depende
// disso estar certo).
export async function getCurrentPatientForBed(
  bedId: string
): Promise<CurrentPatient | null> {
  const supabase = createAdminClient();
  const now = getClinicNow();
  const shift = getShiftForTime(now.time);

  const { data: occupancy } = await supabase
    .from("patient_occupancy")
    .select("patient_id")
    .eq("bed_id", bedId)
    .eq("occupancy_date", now.date)
    .eq("shift", shift)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!occupancy) return null;

  const [{ data: patient }, { data: allergens }] = await Promise.all([
    supabase.from("patients").select("id, full_name, active").eq("id", occupancy.patient_id).single(),
    supabase.from("patient_allergens").select("allergen_id").eq("patient_id", occupancy.patient_id),
  ]);

  if (!patient || !patient.active) return null;

  return {
    id: patient.id,
    fullName: patient.full_name,
    allergenIds: (allergens ?? []).map((a) => a.allergen_id),
  };
}

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  allergenIds: string[];
};
export type MenuGroupWithProducts = {
  id: string;
  name: string;
  products: MenuProduct[];
};
export type ActiveMenu = { id: string; name: string; groups: MenuGroupWithProducts[] };

function availabilityMatchesNow(
  rule: {
    start_date: string | null;
    end_date: string | null;
    days_of_week: number[] | null;
    start_time: string | null;
    end_time: string | null;
  },
  now: ReturnType<typeof getClinicNow>
) {
  if (rule.start_date && now.date < rule.start_date) return false;
  if (rule.end_date && now.date > rule.end_date) return false;
  if (rule.days_of_week && !rule.days_of_week.includes(now.dayOfWeek)) return false;
  if (rule.start_time && now.time < rule.start_time) return false;
  if (rule.end_time && now.time > rule.end_time) return false;
  return true;
}

export async function getActiveMenuForTenant(tenantId: string): Promise<ActiveMenu | null> {
  const supabase = createAdminClient();
  const now = getClinicNow();

  const { data: menus } = await supabase
    .from("menus")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (!menus || menus.length === 0) return null;

  const { data: rules } = await supabase
    .from("menu_availability")
    .select("menu_id, start_date, end_date, days_of_week, start_time, end_time")
    .in("menu_id", menus.map((m) => m.id));

  const rulesByMenu = new Map<string, typeof rules>();
  for (const rule of rules ?? []) {
    const list = rulesByMenu.get(rule.menu_id) ?? [];
    list.push(rule);
    rulesByMenu.set(rule.menu_id, list);
  }

  const matchedMenu =
    menus.find((menu) => (rulesByMenu.get(menu.id) ?? []).some((r) => availabilityMatchesNow(r, now))) ??
    menus.find((menu) => (rulesByMenu.get(menu.id) ?? []).length === 0);

  if (!matchedMenu) return null;

  const { data: groups } = await supabase
    .from("menu_groups")
    .select("id, name, sort_order")
    .eq("menu_id", matchedMenu.id)
    .order("sort_order");

  if (!groups || groups.length === 0) return { id: matchedMenu.id, name: matchedMenu.name, groups: [] };

  const { data: groupProducts } = await supabase
    .from("menu_group_products")
    .select("menu_group_id, product_id, sort_order")
    .in("menu_group_id", groups.map((g) => g.id))
    .order("sort_order");

  const productIds = Array.from(new Set((groupProducts ?? []).map((gp) => gp.product_id)));
  if (productIds.length === 0) {
    return {
      id: matchedMenu.id,
      name: matchedMenu.name,
      groups: groups.map((g) => ({ id: g.id, name: g.name, products: [] })),
    };
  }

  const [{ data: products }, { data: productAllergens }] = await Promise.all([
    supabase.from("products").select("id, name, description, active").in("id", productIds),
    supabase.from("product_allergens").select("product_id, allergen_id").in("product_id", productIds),
  ]);

  const allergensByProduct = new Map<string, string[]>();
  for (const row of productAllergens ?? []) {
    const list = allergensByProduct.get(row.product_id) ?? [];
    list.push(row.allergen_id);
    allergensByProduct.set(row.product_id, list);
  }
  const productsById = new Map((products ?? []).filter((p) => p.active).map((p) => [p.id, p]));

  return {
    id: matchedMenu.id,
    name: matchedMenu.name,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      products: (groupProducts ?? [])
        .filter((gp) => gp.menu_group_id === group.id)
        .map((gp) => productsById.get(gp.product_id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          allergenIds: allergensByProduct.get(p.id) ?? [],
        })),
    })),
  };
}
