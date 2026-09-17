"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Reconsulta a página (Server Component) sempre que orders/order_items
// mudam. O Realtime do Supabase respeita RLS: cada staff só recebe
// eventos do próprio tenant.
export function RealtimeOrdersWatcher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
