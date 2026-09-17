"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  const { data } = await supabase.auth.getClaims();
  const tenantRole = (
    data?.claims.app_metadata as { tenant_role?: string } | undefined
  )?.tenant_role;

  if (!data || !(data.claims.app_metadata as { tenant_id?: string })?.tenant_id) {
    await supabase.auth.signOut();
    return {
      error:
        "Este usuário não está vinculado a nenhuma clínica. Fale com o administrador.",
    };
  }

  redirect(tenantRole === "copa" || tenantRole === "copeira" ? "/kitchen/board" : "/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
