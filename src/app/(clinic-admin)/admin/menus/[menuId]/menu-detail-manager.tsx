"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toggleMenuActive } from "../actions";
import {
  createAvailability,
  createGroup,
  deleteAvailability,
  deleteGroup,
  renameGroup,
  reorderGroups,
  saveGroupProducts,
  updateMenuName,
  type ActionState,
} from "./actions";

type Menu = { id: string; name: string; active: boolean };
type Availability = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
};
type Group = { id: string; name: string; sort_order: number };
type GroupProduct = { menu_group_id: string; product_id: string; sort_order: number };
type Product = { id: string; name: string; active: boolean };

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const emptyState: ActionState = {};

function formatAvailability(rule: Availability) {
  const parts: string[] = [];
  if (rule.start_date || rule.end_date) {
    parts.push(
      `${rule.start_date ? new Date(rule.start_date + "T00:00:00").toLocaleDateString("pt-BR") : "..."} - ${
        rule.end_date ? new Date(rule.end_date + "T00:00:00").toLocaleDateString("pt-BR") : "..."
      }`
    );
  }
  if (rule.days_of_week && rule.days_of_week.length > 0) {
    parts.push(rule.days_of_week.map((d) => DAY_LABELS[d]).join(", "));
  }
  if (rule.start_time || rule.end_time) {
    parts.push(`${rule.start_time ?? "00:00"} - ${rule.end_time ?? "23:59"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Sempre disponível";
}

function AvailabilityForm({ menuId, onDone }: { menuId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createAvailability, emptyState);

  useEffect(() => {
    if (state === emptyState) return;
    if (!state.error) {
      toast.success("Regra criada.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="menu_id" value={menuId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Data inicial</Label>
          <Input id="start_date" name="start_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">Data final</Label>
          <Input id="end_date" name="end_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_time">Hora inicial</Label>
          <Input id="start_time" name="start_time" type="time" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_time">Hora final</Label>
          <Input id="end_time" name="end_time" type="time" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Dias da semana (vazio = todos os dias)</Label>
        <div className="flex flex-wrap gap-3">
          {DAY_LABELS.map((label, index) => (
            <div key={label} className="flex items-center gap-1.5">
              <Checkbox id={`day-${index}`} name="days_of_week" value={String(index)} />
              <Label htmlFor={`day-${index}`} className="font-normal">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar regra"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function GroupProductsEditor({
  group,
  products,
  initialProductIds,
  menuId,
}: {
  group: Group;
  products: Product[];
  initialProductIds: string[];
  menuId: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialProductIds);
  const [isPending, startTransition] = useTransition();
  const dirty =
    selected.length !== initialProductIds.length ||
    selected.some((id) => !initialProductIds.includes(id));

  function toggle(productId: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId)
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveGroupProducts(group.id, menuId, selected);
      if (result.error) toast.error(result.error);
      else toast.success("Produtos do grupo salvos.");
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
        {products.length === 0 && (
          <p className="col-span-2 text-sm text-gray-500">Nenhum produto cadastrado ainda.</p>
        )}
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-2">
            <Checkbox
              id={`group-${group.id}-product-${product.id}`}
              checked={selected.includes(product.id)}
              onCheckedChange={(checked) => toggle(product.id, checked === true)}
            />
            <Label
              htmlFor={`group-${group.id}-product-${product.id}`}
              className="font-normal"
            >
              {product.name}
              {!product.active && " (inativo)"}
            </Label>
          </div>
        ))}
      </div>
      <Button size="sm" disabled={!dirty || isPending} onClick={save}>
        {isPending ? "Salvando..." : "Salvar produtos do grupo"}
      </Button>
    </div>
  );
}

export function MenuDetailManager({
  menu,
  initialAvailability,
  initialGroups,
  initialGroupProducts,
  products,
}: {
  menu: Menu;
  initialAvailability: Availability[];
  initialGroups: Group[];
  initialGroupProducts: GroupProduct[];
  products: Product[];
}) {
  const [menuName, setMenuName] = useState(menu.name);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveMenuName() {
    if (menuName.trim() === menu.name) return;
    startTransition(async () => {
      const result = await updateMenuName(menu.id, menuName);
      if (result.error) toast.error(result.error);
      else toast.success("Nome salvo.");
    });
  }

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await toggleMenuActive(menu.id, checked);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDeleteAvailability(rule: Availability) {
    if (!confirm("Excluir esta regra de disponibilidade?")) return;
    startTransition(async () => {
      const result = await deleteAvailability(rule.id, menu.id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createGroup(menu.id, name, initialGroups.length);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Grupo criado.");
        setNewGroupName("");
      }
    });
  }

  function startEditGroup(group: Group) {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  }

  function saveGroupName(group: Group) {
    const name = editingGroupName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await renameGroup(group.id, menu.id, name);
      if (result.error) toast.error(result.error);
      else setEditingGroupId(null);
    });
  }

  function handleDeleteGroup(group: Group) {
    if (!confirm(`Excluir o grupo "${group.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteGroup(group.id, menu.id);
      if (result.error) toast.error(result.error);
    });
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= initialGroups.length) return;
    const reordered = [...initialGroups];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderGroups(menu.id, reordered.map((g) => g.id));
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/menus" className="text-sm text-gray-600 hover:underline">
        ← Cardápios
      </Link>

      <div className="flex items-center gap-3">
        <Input
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          onBlur={saveMenuName}
          className="max-w-xs text-lg font-semibold"
        />
        <div className="flex items-center gap-2">
          <Switch checked={menu.active} disabled={isPending} onCheckedChange={handleToggleActive} />
          <Label>Ativo</Label>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Disponibilidade</CardTitle>
          <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
            <DialogTrigger render={<Button size="sm">Nova regra</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova regra de disponibilidade</DialogTitle>
              </DialogHeader>
              <AvailabilityForm menuId={menu.id} onDone={() => setAvailabilityDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regra</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialAvailability.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{formatAvailability(rule)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDeleteAvailability(rule)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {initialAvailability.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    Sem regras: o cardápio fica disponível o tempo todo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos e produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ex.: Entradas"
            />
            <Button onClick={handleCreateGroup} disabled={isPending}>
              Novo grupo
            </Button>
          </div>

          {initialGroups.map((group, index) => (
            <Card key={group.id} className="bg-gray-50">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                {editingGroupId === group.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      autoFocus
                    />
                    <Button size="sm" disabled={isPending} onClick={() => saveGroupName(group)}>
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <CardTitle
                    className="cursor-pointer text-base"
                    onClick={() => startEditGroup(group)}
                  >
                    {group.name}
                  </CardTitle>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={isPending || index === 0}
                    onClick={() => moveGroup(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={isPending || index === initialGroups.length - 1}
                    onClick={() => moveGroup(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDeleteGroup(group)}
                  >
                    Excluir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <GroupProductsEditor
                  group={group}
                  products={products}
                  menuId={menu.id}
                  initialProductIds={initialGroupProducts
                    .filter((gp) => gp.menu_group_id === group.id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((gp) => gp.product_id)}
                />
              </CardContent>
            </Card>
          ))}
          {initialGroups.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum grupo cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
