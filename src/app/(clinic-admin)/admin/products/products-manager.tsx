"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createProduct,
  deleteProduct,
  updateProduct,
  type ActionState,
} from "./actions";

type Allergen = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  allergenIds: string[];
};

const emptyState: ActionState = {};

function ProductForm({
  product,
  allergens,
  onDone,
}: {
  product: Product | null;
  allergens: Allergen[];
  onDone: () => void;
}) {
  const action = product ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, emptyState);

  useEffect(() => {
    if (state === emptyState) return;
    if (!state.error) {
      toast.success(product ? "Produto atualizado." : "Produto criado.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={product?.description ?? ""} />
      </div>
      {product && (
        <div className="flex items-center gap-2">
          <Checkbox id="active" name="active" value="true" defaultChecked={product.active} />
          <Label htmlFor="active">Ativo</Label>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Alérgenos</Label>
        <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
          {allergens.length === 0 && (
            <p className="col-span-2 text-sm text-gray-500">Nenhum alérgeno cadastrado ainda.</p>
          )}
          {allergens.map((allergen) => (
            <div key={allergen.id} className="flex items-center gap-2">
              <Checkbox
                id={`prod-allergen-${allergen.id}`}
                name="allergen_ids"
                value={allergen.id}
                defaultChecked={product?.allergenIds.includes(allergen.id)}
              />
              <Label htmlFor={`prod-allergen-${allergen.id}`} className="font-normal">
                {allergen.name}
              </Label>
            </div>
          ))}
        </div>
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

export function ProductsManager({
  initialProducts,
  allergens,
}: {
  initialProducts: Product[];
  allergens: Allergen[];
}) {
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleDelete(product: Product) {
    if (!confirm(`Excluir o produto "${product.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogTrigger render={<Button onClick={() => setEditing(null)}>Novo produto</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <ProductForm product={editing} allergens={allergens} onDone={() => setEditing(undefined)} />
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Alérgenos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.allergenIds.map((id) => {
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
                <Badge variant={product.active ? "default" : "outline"}>
                  {product.active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button variant="outline" size="sm" onClick={() => setEditing(product)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(product)}
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                Nenhum produto cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
