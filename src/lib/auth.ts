import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TenantRole } from "@/lib/supabase/database.types";

export type StaffSession = {
  userId: string;
  email: string | undefined;
  tenantId: string;
  tenantRole: TenantRole | undefined;
};

// Lê o tenant_id/tenant_role injetados no JWT pelo Custom Access Token Hook
// (supabase/migrations/003_custom_access_token_hook.sql). Sem o hook
// habilitado no dashboard, app_metadata.tenant_id nunca aparece aqui e o
// staff nunca passa desta checagem — mesmo com login válido.
export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const appMetadata = (data.claims.app_metadata ?? {}) as {
    tenant_id?: string;
    tenant_role?: TenantRole;
  };
  if (!appMetadata.tenant_id) return null;

  return {
    userId: data.claims.sub,
    email: data.claims.email as string | undefined,
    tenantId: appMetadata.tenant_id,
    tenantRole: appMetadata.tenant_role,
  };
}

export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  return session;
}
