import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { href: "/admin/patients", label: "Pacientes", table: "patients" as const },
  { href: "/admin/locations", label: "Leitos", table: "beds" as const },
  { href: "/admin/allergens", label: "Alérgenos", table: "allergens" as const },
  { href: "/admin/products", label: "Produtos", table: "products" as const },
  { href: "/admin/menus", label: "Cardápios", table: "menus" as const },
];

export default async function ClinicAdminHomePage() {
  const supabase = await createClient();

  const counts = await Promise.all(
    SECTIONS.map((section) =>
      supabase.from(section.table).select("*", { count: "exact", head: true })
    )
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Painel da clínica</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SECTIONS.map((section, index) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">{section.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{counts[index].count ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
