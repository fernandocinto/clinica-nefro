"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  createPatient,
  deletePatient,
  updatePatient,
  type ActionState,
} from "./actions";

type Allergen = { id: string; name: string };
type Patient = {
  id: string;
  full_name: string;
  birth_date: string;
  active: boolean;
  allergenIds: string[];
};

const emptyState: ActionState = {};

function PatientForm({
  patient,
  allergens,
  onDone,
}: {
  patient: Patient | null;
  allergens: Allergen[];
  onDone: () => void;
}) {
  const action = patient ? updatePatient : createPatient;
  const [state, formAction, pending] = useActionState(action, emptyState);

  useEffect(() => {
    if (state === emptyState) return;
    if (!state.error) {
      toast.success(patient ? "Paciente atualizado." : "Paciente criado.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {patient && <input type="hidden" name="id" value={patient.id} />}
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={patient?.full_name}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="birth_date">Data de nascimento</Label>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          defaultValue={patient?.birth_date}
          required
        />
      </div>
      {patient && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="active"
            name="active"
            value="true"
            defaultChecked={patient.active}
          />
          <Label htmlFor="active">Ativo</Label>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Alérgenos</Label>
        <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
          {allergens.length === 0 && (
            <p className="col-span-2 text-sm text-gray-500">
              Nenhum alérgeno cadastrado ainda.
            </p>
          )}
          {allergens.map((allergen) => (
            <div key={allergen.id} className="flex items-center gap-2">
              <Checkbox
                id={`allergen-${allergen.id}`}
                name="allergen_ids"
                value={allergen.id}
                defaultChecked={patient?.allergenIds.includes(allergen.id)}
              />
              <Label htmlFor={`allergen-${allergen.id}`} className="font-normal">
                {allergen.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PatientsManager({
  initialPatients,
  allergens,
}: {
  initialPatients: Patient[];
  allergens: Allergen[];
}) {
  const [editing, setEditing] = useState<Patient | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleDelete(patient: Patient) {
    if (!confirm(`Excluir o paciente "${patient.full_name}"?`)) return;
    startTransition(async () => {
      const result = await deletePatient(patient.id);
      if (result.error) toast.error(result.error);
      else toast.success("Paciente excluído.");
    });
  }

  return (
    <div className="space-y-4">
      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogTrigger
          render={<Button onClick={() => setEditing(null)}>Novo paciente</Button>}
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <PatientForm
              patient={editing}
              allergens={allergens}
              onDone={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Nascimento</TableHead>
            <TableHead>Alérgenos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialPatients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">{patient.full_name}</TableCell>
              <TableCell>
                {new Date(patient.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {patient.allergenIds.map((id) => {
                    const allergen = allergens.find((a) => a.id === id);
                    return allergen ? (
                      <Badge key={id} variant="secondary">
                        {allergen.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={patient.active ? "default" : "outline"}>
                  {patient.active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button variant="outline" size="sm" onClick={() => setEditing(patient)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(patient)}
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialPatients.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                Nenhum paciente cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
