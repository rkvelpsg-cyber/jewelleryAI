import type { AssistantAction, JewelleryProduct } from "@/types";

const currencyPattern =
  /(?:under|below|less than)\s*(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(lakh|lac|k)?/i;

export function parseLocalCommand(
  input: string,
  current?: JewelleryProduct,
): AssistantAction | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (/^(next|next one|show next)/.test(text))
    return { action: "NEXT_PRODUCT" };
  if (/^(previous|back|show previous)/.test(text))
    return { action: "PREVIOUS_PRODUCT" };
  if (/show (necklaces?|chains?)/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { type: "necklace" } };
  if (/show (earrings?|jhumkas?)/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { type: "earrings" } };
  if (/show (chokers?)/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { type: "choker" } };
  if (/show (bangles?|bracelets?)/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { type: "bangles" } };
  if (/show rings?/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { type: "rings" } };
  if (/bridal|wedding/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { category: "bridal" } };
  if (/gold/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { material: "gold" } };
  if (/diamond/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { material: "diamond" } };
  if (/lighter|light weight/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { sort: "weight-asc" } };
  if (/heavier|heavy weight/.test(text))
    return { action: "FILTER_PRODUCTS", filters: { sort: "weight-desc" } };
  if (/similar/.test(text))
    return {
      action: "FILTER_PRODUCTS",
      filters: { similarTo: current?.id ?? "" },
    };
  if (/save|favourite|favorite/.test(text)) return { action: "SAVE_LOOK" };
  if (/compare/.test(text))
    return {
      action: "ANSWER",
      text: "I can compare the current piece with the previous design once you try another product.",
    };
  if (/favourites?|saved/.test(text))
    return {
      action: "ANSWER",
      text: "Your saved looks will appear here during this session.",
    };
  if (/send (this )?to (my )?phone|whatsapp/.test(text))
    return { action: "SEND_TO_PHONE" };

  const priceMatch = text.match(currencyPattern);
  if (priceMatch) {
    const amount = Number(priceMatch[1].replace(/,/g, ""));
    const multiplier =
      priceMatch[2]?.toLowerCase() === "lakh" ||
      priceMatch[2]?.toLowerCase() === "lac"
        ? 100000
        : priceMatch[2]?.toLowerCase() === "k"
          ? 1000
          : 1;
    return {
      action: "FILTER_PRODUCTS",
      filters: { maxPrice: amount * multiplier },
    };
  }

  if (/how much|price|cost/.test(text) && current?.price !== undefined) {
    return {
      action: "ANSWER",
      text: `This is ${current.name}, priced at ${current.price.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}.`,
    };
  }
  if (/weight|heavy/.test(text) && current?.weight)
    return {
      action: "ANSWER",
      text: `${current.name} weighs ${current.weight}.`,
    };
  if (/purity|karat|22k|18k/.test(text) && current?.purity)
    return { action: "ANSWER", text: `This piece is ${current.purity}.` };
  return null;
}
