import type { JewelleryProduct } from "@/types";

export function friendlyProductMessage(
  product: JewelleryProduct,
  previous?: JewelleryProduct,
) {
  if (!previous) return `Here's ${product.name}. Feel free to take a look.`;
  if (
    product.weight &&
    previous.weight &&
    parseFloat(product.weight) < parseFloat(previous.weight)
  ) {
    return "This one is a little lighter than the previous option.";
  }
  if (product.style && product.style === previous.style)
    return "Here's another design in a similar style.";
  return "Here's another lovely option to explore.";
}

export const FRIEND_MODE_PROMPTS = [
  "Would you like to see something similar?",
  "I can show you a lighter option if you'd like.",
  "Would matching earrings be useful?",
] as const;
