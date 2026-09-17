import "server-only";
import { headers } from "next/headers";

export async function getTenantFromHeaders() {
  const headerList = await headers();
  const tenantId = headerList.get("x-tenant-id");
  const subdomain = headerList.get("x-tenant-subdomain");

  if (!tenantId || !subdomain) return null;

  return { id: tenantId, subdomain };
}

export async function requireTenant() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) {
    throw new Error(
      "Tenant não resolvido: rota acessada fora de um subdomínio válido."
    );
  }
  return tenant;
}
