import type { JewelleryProduct, ProductEventType } from "@/types";

export interface ProductEvent {
  type: ProductEventType;
  product?: Pick<
    JewelleryProduct,
    "id" | "sku" | "name" | "price" | "weight" | "purity" | "category"
  >;
  text?: string;
  timestamp: number;
}

type Listener = (event: ProductEvent) => void;
const listeners = new Set<Listener>();

export function subscribeToProductEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitProductEvent(event: Omit<ProductEvent, "timestamp">) {
  const completeEvent = { ...event, timestamp: Date.now() };
  listeners.forEach((listener) => listener(completeEvent));
  return completeEvent;
}
