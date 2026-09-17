"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOrderStatus } from "./actions";
import type { OrderStatus } from "@/lib/supabase/database.types";

export type BoardOrder = {
  id: string;
  status: OrderStatus;
  patientName: string;
  bedLabel: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "recebido", label: "Recebido" },
  { status: "em_preparo", label: "Em Preparo" },
  { status: "em_montagem", label: "Em Montagem" },
  { status: "pronto", label: "Pronto" },
  { status: "entregue", label: "Entregue" },
];

function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = COLUMNS.findIndex((c) => c.status === status);
  return index >= 0 && index < COLUMNS.length - 1 ? COLUMNS[index + 1].status : null;
}

function previousStatus(status: OrderStatus): OrderStatus | null {
  const index = COLUMNS.findIndex((c) => c.status === status);
  return index > 0 ? COLUMNS[index - 1].status : null;
}

function OrderCard({ order }: { order: BoardOrder }) {
  const [isPending, startTransition] = useTransition();
  const next = nextStatus(order.status);
  const previous = previousStatus(order.status);

  function move(status: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {order.bedLabel} — {order.patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="text-sm text-gray-700">
          {order.items.map((item, index) => (
            <li key={index}>
              {item.quantity}x {item.productName}
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          {previous && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => move(previous)}
            >
              ← Voltar
            </Button>
          )}
          {next && (
            <Button size="sm" disabled={isPending} onClick={() => move(next)}>
              Avançar →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({ orders }: { orders: BoardOrder[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((column) => {
        const columnOrders = orders.filter((o) => o.status === column.status);
        return (
          <div key={column.status} className="space-y-2 rounded-md border bg-white p-3">
            <h2 className="flex items-center justify-between text-sm font-medium text-gray-700">
              {column.label}
              <span className="text-xs text-gray-400">{columnOrders.length}</span>
            </h2>
            <div className="space-y-2">
              {columnOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {columnOrders.length === 0 && (
                <p className="text-xs text-gray-400">Nenhum pedido.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
