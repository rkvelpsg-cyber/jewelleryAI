import type { AssistantAction, JewelleryProduct } from "@/types";
import { emitProductEvent } from "./events";
import { parseLocalCommand } from "./localCommands";

export function handleAssistantInput(
  input: string,
  current?: JewelleryProduct,
) {
  const action = parseLocalCommand(input, current);
  emitProductEvent({ type: "VOICE_COMMAND", text: input });
  return action;
}

export function announceProduct(product: JewelleryProduct) {
  emitProductEvent({
    type: "PRODUCT_CHANGED",
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      weight: product.weight,
      purity: product.purity,
      category: product.category,
    },
  });
}

export function speakShort(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.volume = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function isNavigationalAction(
  action: AssistantAction | null,
): action is Extract<
  AssistantAction,
  { action: "NEXT_PRODUCT" | "PREVIOUS_PRODUCT" }
> {
  return (
    action?.action === "NEXT_PRODUCT" || action?.action === "PREVIOUS_PRODUCT"
  );
}
