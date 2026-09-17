import Link from "next/link";
import { requireStaffSession } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { RealtimeOrdersWatcher } from "./realtime-watcher";

const NAV_LINKS = [
  { href: "/kitchen/board", label: "Kanban" },
  { href: "/kitchen/kds", label: "KDS" },
];

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold">Copa Clínica — Copa</span>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-600 hover:text-gray-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </header>
      <main className="p-6">{children}</main>
      <RealtimeOrdersWatcher />
    </div>
  );
}
