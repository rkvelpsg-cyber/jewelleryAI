import type { JewelleryProduct, ShoppingSessionContext } from "@/types";

export function createShoppingSession(): ShoppingSessionContext {
  return {
    sessionId: crypto.randomUUID(),
    preferredStyles: [],
    preferredCategories: [],
    preferredMaterials: [],
    triedProducts: [],
    likedProducts: [],
    savedProducts: [],
    skippedProducts: [],
    conversationHistory: [],
  };
}

export function recordProductTry(
  session: ShoppingSessionContext,
  product: JewelleryProduct,
) {
  return {
    ...session,
    previousProductId: session.currentProductId,
    currentProductId: product.id,
    triedProducts: session.triedProducts.includes(product.id)
      ? session.triedProducts
      : [...session.triedProducts, product.id],
    preferredCategories:
      product.category &&
      !session.preferredCategories.includes(product.category)
        ? [...session.preferredCategories, product.category]
        : session.preferredCategories,
    preferredMaterials:
      product.material && !session.preferredMaterials.includes(product.material)
        ? [...session.preferredMaterials, product.material]
        : session.preferredMaterials,
  };
}

export function saveProduct(
  session: ShoppingSessionContext,
  productId: string,
) {
  return session.savedProducts.includes(productId)
    ? session
    : { ...session, savedProducts: [...session.savedProducts, productId] };
}
