import "server-only";

export type PrintableOrder = {
  id: string;
  bedLabel: string;
  patientName: string;
  items: { productName: string; quantity: number; notes?: string | null }[];
};

// Ponto de extensão para a integração real com PrintNode (cupom + etiqueta).
// Por enquanto apenas loga/simula o print — fora do escopo deste MVP.
export async function printOrder(order: PrintableOrder): Promise<void> {
  console.log(
    `[printOrder] (simulado) pedido ${order.id} — leito ${order.bedLabel} — paciente ${order.patientName}`
  );
  for (const item of order.items) {
    console.log(`  ${item.quantity}x ${item.productName}${item.notes ? ` (${item.notes})` : ""}`);
  }
}
