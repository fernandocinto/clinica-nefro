import { createClient } from "@/lib/supabase/server";
import { ProductsManager } from "./products-manager";

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: allergens }, { data: productAllergens }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, active")
        .order("name"),
      supabase.from("allergens").select("id, name").order("name"),
      supabase.from("product_allergens").select("product_id, allergen_id"),
    ]);

  const allergenIdsByProduct = new Map<string, string[]>();
  for (const row of productAllergens ?? []) {
    const list = allergenIdsByProduct.get(row.product_id) ?? [];
    list.push(row.allergen_id);
    allergenIdsByProduct.set(row.product_id, list);
  }

  const productsWithAllergens = (products ?? []).map((product) => ({
    ...product,
    allergenIds: allergenIdsByProduct.get(product.id) ?? [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Produtos</h1>
      <ProductsManager
        initialProducts={productsWithAllergens}
        allergens={allergens ?? []}
      />
    </div>
  );
}
