import type { JewelleryProduct, SessionPreferences } from "@/types";

export function recommendProducts(
  products: JewelleryProduct[],
  preferences: SessionPreferences,
  current?: JewelleryProduct,
) {
  return products
    .filter((product) => product.active && product.id !== current?.id)
    .map((product) => ({
      product,
      score:
        (product.category &&
        preferences.triedCategories.includes(product.category)
          ? 3
          : 0) +
        (product.material === preferences.preferredMaterial ? 2 : 0) +
        (preferences.maxPrice === undefined ||
        (product.price ?? Infinity) <= preferences.maxPrice
          ? 1
          : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}
