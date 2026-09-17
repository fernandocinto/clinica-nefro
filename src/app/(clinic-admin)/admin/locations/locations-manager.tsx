"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPatientOrderUrl } from "@/lib/patient-link";
import {
  createBed,
  createLocation,
  deleteBed,
  deleteLocation,
  regenerateBedToken,
  updateBed,
  type ActionState,
} from "./actions";

type Location = { id: string; name: string };
type Bed = { id: string; label: string; location_id: string; public_token: string };

const emptyState: ActionState = {};

function NewLocationForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createLocation, emptyState);

  useEffect(() => {
    if (state === emptyState) return;
    if (!state.error) {
      toast.success("Local criado.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do local</Label>
        <Input id="name" name="name" placeholder="Ex.: Unidade Centro" required />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BedForm({
  bed,
  locations,
  defaultLocationId,
  onDone,
}: {
  bed: Bed | null;
  locations: Location[];
  defaultLocationId?: string;
  onDone: () => void;
}) {
  const action = bed ? updateBed : createBed;
  const [state, formAction, pending] = useActionState(action, emptyState);
  const [locationId, setLocationId] = useState(bed?.location_id ?? defaultLocationId ?? "");

  useEffect(() => {
    if (state === emptyState) return;
    if (!state.error) {
      toast.success(bed ? "Leito atualizado." : "Leito criado.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {bed && <input type="hidden" name="id" value={bed.id} />}
      <input type="hidden" name="location_id" value={locationId} />
      <div className="space-y-1.5">
        <Label>Local</Label>
        <Select value={locationId} onValueChange={(value) => setLocationId(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o local" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label">Rótulo do leito</Label>
        <Input id="label" name="label" defaultValue={bed?.label} placeholder="Ex.: Poltrona 04" required />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending || !locationId}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LocationsManager({
  initialLocations,
  initialBeds,
  subdomain,
}: {
  initialLocations: Location[];
  initialBeds: Bed[];
  subdomain: string;
}) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [bedDialog, setBedDialog] = useState<
    { mode: "create"; locationId: string } | { mode: "edit"; bed: Bed } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function handleDeleteLocation(location: Location) {
    if (!confirm(`Excluir o local "${location.name}" e todos os seus leitos?`)) return;
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDeleteBed(bed: Bed) {
    if (!confirm(`Excluir o leito "${bed.label}"?`)) return;
    startTransition(async () => {
      const result = await deleteBed(bed.id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleRegenerateToken(bed: Bed) {
    if (!confirm("Gerar um novo link para este leito? O link antigo deixa de funcionar.")) return;
    startTransition(async () => {
      const result = await regenerateBedToken(bed.id);
      if (result.error) toast.error(result.error);
      else toast.success("Novo link gerado.");
    });
  }

  function copyLink(bed: Bed) {
    const url = buildPatientOrderUrl(subdomain, bed.public_token);
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  return (
    <div className="space-y-6">
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogTrigger render={<Button>Novo local</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo local</DialogTitle>
          </DialogHeader>
          <NewLocationForm onDone={() => setLocationDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={bedDialog !== null} onOpenChange={(open) => !open && setBedDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bedDialog?.mode === "edit" ? "Editar leito" : "Novo leito"}</DialogTitle>
          </DialogHeader>
          {bedDialog && (
            <BedForm
              bed={bedDialog.mode === "edit" ? bedDialog.bed : null}
              defaultLocationId={bedDialog.mode === "create" ? bedDialog.locationId : undefined}
              locations={initialLocations}
              onDone={() => setBedDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {initialLocations.length === 0 && (
        <p className="text-sm text-gray-500">Nenhum local cadastrado ainda.</p>
      )}

      {initialLocations.map((location) => {
        const beds = initialBeds.filter((bed) => bed.location_id === location.id);
        return (
          <Card key={location.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{location.name}</CardTitle>
              <div className="space-x-2">
                <Button
                  size="sm"
                  onClick={() => setBedDialog({ mode: "create", locationId: location.id })}
                >
                  Novo leito
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleDeleteLocation(location)}
                >
                  Excluir local
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leito</TableHead>
                    <TableHead>Link do paciente</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beds.map((bed) => (
                    <TableRow key={bed.id}>
                      <TableCell className="font-medium">{bed.label}</TableCell>
                      <TableCell>
                        <code className="text-xs text-gray-500">
                          .../order/{bed.public_token.slice(0, 8)}…
                        </code>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => copyLink(bed)}>
                          Copiar link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBedDialog({ mode: "edit", bed })}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRegenerateToken(bed)}
                        >
                          Novo link
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDeleteBed(bed)}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {beds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        Nenhum leito neste local.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
