export default function TenantNotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Clínica não encontrada</h1>
      <p className="text-muted-foreground">
        Não encontramos nenhuma clínica cadastrada para este endereço.
      </p>
    </main>
  );
}
