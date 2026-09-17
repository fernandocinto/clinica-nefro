import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Convenção Next.js 16: "middleware.ts" foi renomeado para "proxy.ts"
// (função `proxy`). Ver node_modules/next/dist/docs/.../file-conventions/proxy.md.

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000")
  .replace(/^https?:\/\//, "")
  .toLowerCase();

const PUBLIC_HOSTS = new Set([ROOT_DOMAIN, `www.${ROOT_DOMAIN}`]);

function extractSubdomain(host: string): string | null {
  const normalizedHost = host.toLowerCase();

  if (PUBLIC_HOSTS.has(normalizedHost)) return null;

  if (normalizedHost.endsWith(`.${ROOT_DOMAIN}`)) {
    return normalizedHost.slice(0, -`.${ROOT_DOMAIN}`.length);
  }

  // Preview deploys da Vercel (*.vercel.app) não têm subdomínio de tenant.
  if (normalizedHost.endsWith(".vercel.app")) return null;

  return null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);

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

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
