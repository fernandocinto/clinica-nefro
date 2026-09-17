"use client";

import Link from "next/link";
import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createMenu, deleteMenu, toggleMenuActive, type ActionState } from "./actions";

type Menu = { id: string; name: string; active: boolean };

const emptyState: ActionState = {};

export function MenusManager({ initialMenus }: { initialMenus: Menu[] }) {
  const [createState, createAction, createPending] = useActionState(createMenu, emptyState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (createState !== emptyState && !createState.error) toast.success("Cardápio criado.");
  }, [createState]);

  function handleToggle(menu: Menu, active: boolean) {
    startTransition(async () => {
      const result = await toggleMenuActive(menu.id, active);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(menu: Menu) {
    if (!confirm(`Excluir o cardápio "${menu.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteMenu(menu.id);
      if (result.error) toast.error(result.error);
      else toast.success("Cardápio excluído.");
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <form action={createAction} className="flex gap-2">
        <Input name="name" placeholder="Ex.: Cardápio Padrão" required />
        <Button type="submit" disabled={createPending}>
          Novo cardápio
        </Button>
      </form>
      {createState.error && <p className="text-sm text-red-600">{createState.error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialMenus.map((menu) => (
            <TableRow key={menu.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/menus/${menu.id}`} className="hover:underline">
                  {menu.name}
                </Link>
                {menu.active && (
                  <Badge variant="default" className="ml-2">
                    ativo
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  checked={menu.active}
                  disabled={isPending}
                  onCheckedChange={(checked) => handleToggle(menu, checked)}
                />
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/menus/${menu.id}`}>Gerenciar</Link>}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(menu)}
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialMenus.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500">
                Nenhum cardápio cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
