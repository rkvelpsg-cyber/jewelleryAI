import type { AssistantAction } from "@/types";

export interface AssistantContext {
  input: string;
  currentProductId?: string;
  catalogue: Array<
    Pick<
      import("@/types").JewelleryProduct,
      | "id"
      | "name"
      | "type"
      | "price"
      | "weight"
      | "purity"
      | "category"
      | "style"
      | "material"
    >
  >;
}

export interface AssistantProvider {
  understand(context: AssistantContext): Promise<AssistantAction>;
}

export function createOptionalProvider(): AssistantProvider | null {
  return process.env.NEXT_PUBLIC_ENABLE_LLM === "true" ? null : null;
}
