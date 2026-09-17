const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const PROTOCOL = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";

export function buildPatientOrderUrl(subdomain: string, publicToken: string) {
  return `${PROTOCOL}://${subdomain}.${ROOT_DOMAIN}/order/${publicToken}`;
}
