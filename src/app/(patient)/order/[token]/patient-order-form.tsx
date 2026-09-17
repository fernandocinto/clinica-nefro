"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActiveMenu } from "@/lib/patient-access";
import { createPatientOrder } from "./actions";

export function PatientOrderForm({
  token,
  menu,
  patientAllergenIds,
}: {
  token: string;
  menu: ActiveMenu;
  patientAllergenIds: string[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const totalItems = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities]
  );

  function setQuantity(productId: string, quantity: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, Math.min(9, quantity)) }));
  }

  function handleSubmit() {
    setError(null);
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }

    startTransition(async () => {
      const result = await createPatientOrder(token, items);
      if (result.error) setError(result.error);
      else setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <h2 className="text-lg font-semibold">Pedido enviado!</h2>
          <p className="text-sm text-gray-600">
            A equipe da copa já recebeu seu pedido e vai preparar em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {menu.groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle className="text-base">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.products.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum item neste grupo.</p>
            )}
            {group.products.map((product) => {
              const blocked = product.allergenIds.some((id) => patientAllergenIds.includes(id));
              const quantity = quantities[product.id] ?? 0;
              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    blocked ? "border-red-200 bg-red-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-gray-500">{product.description}</p>
                    )}
                    {blocked && (
                      <Badge variant="destructive" className="mt-1">
                        Contém alérgeno do paciente
                      </Badge>
                    )}
                  </div>
                  {blocked ? (
                    <span className="text-sm text-red-600">Bloqueado</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={quantity === 0}
                        onClick={() => setQuantity(product.id, quantity - 1)}
                      >
                        −
                      </Button>
                      <span className="w-4 text-center">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <span className="text-sm text-gray-600">{totalItems} item(ns) selecionado(s)</span>
          <Button onClick={handleSubmit} disabled={isPending || totalItems === 0}>
            {isPending ? "Enviando..." : "Enviar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
