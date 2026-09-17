import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

// Cliente para uso em Server Components, Server Actions e Route Handlers.
// Respeita RLS: as policies filtram por tenant_id a partir do JWT do usuário.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component sem permissão de escrita
            // de cookies (ex.: durante render estático). O proxy já cuida de
            // renovar a sessão nessas rotas, então é seguro ignorar aqui.
          }
        },
      },
    }
  );
}
