"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAllergen, deleteAllergen, renameAllergen, type ActionState } from "./actions";

type Allergen = { id: string; name: string };

const emptyState: ActionState = {};

export function AllergensManager({ initialAllergens }: { initialAllergens: Allergen[] }) {
  const [createState, createAction, createPending] = useActionState(createAllergen, emptyState);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (createState !== emptyState && !createState.error) {
      toast.success("Alérgeno criado.");
    }
  }, [createState]);

  function startEditing(allergen: Allergen) {
    setEditingId(allergen.id);
    setEditingName(allergen.name);
  }

  function saveEditing(id: string) {
    const name = editingName.trim();
    if (!name) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("name", name);
      const result = await renameAllergen(emptyState, formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Alérgeno renomeado.");
        setEditingId(null);
      }
    });
  }

  function handleDelete(allergen: Allergen) {
    if (!confirm(`Excluir o alérgeno "${allergen.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteAllergen(allergen.id);
      if (result.error) toast.error(result.error);
      else toast.success("Alérgeno excluído.");
    });
  }

  return (
    <div className="max-w-lg space-y-4">
      <form action={createAction} className="flex gap-2">
        <Input name="name" placeholder="Novo alérgeno (ex.: glúten)" required />
        <Button type="submit" disabled={createPending}>
          Adicionar
        </Button>
      </form>
      {createState.error && <p className="text-sm text-red-600">{createState.error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialAllergens.map((allergen) => (
            <TableRow key={allergen.id}>
              <TableCell>
                {editingId === allergen.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  allergen.name
                )}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                {editingId === allergen.id ? (
                  <Button size="sm" disabled={isPending} onClick={() => saveEditing(allergen.id)}>
                    Salvar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => startEditing(allergen)}>
                    Renomear
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(allergen)}
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialAllergens.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-gray-500">
                Nenhum alérgeno cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
