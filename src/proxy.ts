import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Convenção Next.js 16: "middleware.ts" foi renomeado para "proxy.ts"
// (função `proxy`). Ver node_modules/next/dist/docs/.../file-conventions/proxy.md.

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000")
  .replace(/^https?:\/\//, "")
  .toLowerCase();

const PUBLIC_HOSTS = new Set([ROOT_DOMAIN, `www.${ROOT_DOMAIN}`]);
const TENANT_OVERRIDE_COOKIE = "tenant_override";

function extractSubdomain(host: string): string | null {
  const normalizedHost = host.toLowerCase();

  if (PUBLIC_HOSTS.has(normalizedHost)) return null;

  if (normalizedHost.endsWith(`.${ROOT_DOMAIN}`)) {
    return normalizedHost.slice(0, -`.${ROOT_DOMAIN}`.length);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  let subdomain = extractSubdomain(host);

  // Provisório: enquanto não há um domínio próprio com wildcard DNS
  // (ex.: testando no domínio padrão *.vercel.app), permite escolher o
  // tenant por ?tenant=<subdominio> e mantém a escolha num cookie, para
  // não precisar repetir o parâmetro a cada navegação. Remover quando a
  // clínica tiver domínio próprio configurado com subdomínio curinga.
  const queryTenant = request.nextUrl.searchParams.get("tenant");
  const cookieTenant = request.cookies.get(TENANT_OVERRIDE_COOKIE)?.value;
  const usingOverride = !subdomain && Boolean(queryTenant || cookieTenant);
  if (!subdomain) {
    subdomain = queryTenant ?? cookieTenant ?? null;
  }

  if (!subdomain) {
    return NextResponse.next();
  }

  const supabase = createAdminClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, subdomain")
    .eq("subdomain", subdomain)
    .single();

  if (!tenant) {
    return NextResponse.rewrite(new URL("/tenant-not-found", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-subdomain", tenant.subdomain);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (usingOverride) {
    response.cookies.set(TENANT_OVERRIDE_COOKIE, tenant.subdomain, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
