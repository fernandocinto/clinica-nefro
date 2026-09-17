import { requireTenant } from "@/lib/tenant";
import {
  getActiveMenuForTenant,
  getCurrentPatientForBed,
  resolveBedByToken,
} from "@/lib/patient-access";
import { PatientOrderForm } from "./patient-order-form";

function InfoScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-gray-600">{message}</p>
    </main>
  );
}

export default async function PatientOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tenant = await requireTenant();

  const bed = await resolveBedByToken(token, tenant.id);
  if (!bed) {
    return (
      <InfoScreen
        title="Link inválido"
        message="Este link não corresponde a nenhum leito. Fale com a equipe da copa."
      />
    );
  }

  const patient = await getCurrentPatientForBed(bed.id);
  if (!patient) {
    return (
      <InfoScreen
        title="Nenhum paciente associado"
        message={`Não encontramos um paciente associado ao leito "${bed.label}" neste momento. Fale com a equipe da copa.`}
      />
    );
  }

  const menu = await getActiveMenuForTenant(tenant.id);
  if (!menu) {
    return (
      <InfoScreen
        title="Cardápio indisponível"
        message="Não há cardápio disponível neste horário. Tente novamente mais tarde."
      />
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <p className="text-sm text-gray-500">Leito {bed.label}</p>
        <h1 className="text-xl font-semibold">Olá, {patient.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-gray-500">{menu.name}</p>
      </header>
      <PatientOrderForm token={token} menu={menu} patientAllergenIds={patient.allergenIds} />
    </main>
  );
}
