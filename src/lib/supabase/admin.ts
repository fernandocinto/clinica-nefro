import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Cliente com service role: ignora RLS. Só pode ser importado em código
// server-side de confiança (proxy, route handlers administrativos,
// server actions que fazem sua própria checagem de autorização).
// O import "server-only" faz o build falhar se isto for puxado para o client.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
