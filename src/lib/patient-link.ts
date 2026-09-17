const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const PROTOCOL = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
// Ver src/proxy.ts: mesmo mecanismo provisório de ?tenant=, para uso sem
// domínio próprio com wildcard DNS.
const USE_QUERY_TENANT = process.env.NEXT_PUBLIC_TENANT_LINK_MODE === "query";

export function buildPatientOrderUrl(subdomain: string, publicToken: string) {
  if (USE_QUERY_TENANT) {
    return `${PROTOCOL}://${ROOT_DOMAIN}/order/${publicToken}?tenant=${subdomain}`;
  }
  return `${PROTOCOL}://${subdomain}.${ROOT_DOMAIN}/order/${publicToken}`;
}
