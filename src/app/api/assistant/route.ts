import { createCostController } from "@/lib/ai/costController";
import { getCachedResponse, setCachedResponse } from "@/lib/ai/cache";

const costController = createCostController();

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_LLM !== "true") {
    return Response.json({ enabled: false }, { status: 404 });
  }

  if (!costController.canCall()) {
    return Response.json(
      {
        enabled: false,
        message:
          "I can still help you explore lighter, cheaper, similar, bridal, necklace, earrings, bangles or rings.",
        reason: "budget_limit",
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    input?: string;
    currentProduct?: unknown;
    session?: unknown;
  };
  const input = body.input?.trim();
  if (!input || input.length > 500) {
    return Response.json(
      { error: "Invalid assistant input." },
      { status: 400 },
    );
  }

  const cached = getCachedResponse<{ message: string }>(input);
  if (cached) return Response.json({ ...cached, cached: true });

  const provider = process.env.AI_ASSISTANT_PROVIDER;
  const apiKey = process.env.AI_ASSISTANT_API_KEY;
  if (!provider || !apiKey) {
    return Response.json(
      {
        enabled: false,
        message: "I can help with the collection using local commands.",
      },
      { status: 503 },
    );
  }

  const prompt = JSON.stringify({
    input,
    currentProduct: body.currentProduct,
    session: body.session,
    instruction:
      "Return concise JSON with message and optional filters. Never request or infer biometric data.",
  });

  try {
    const response = await fetch(provider, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: prompt }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error(`Assistant provider returned ${response.status}`);

    const providerResult = (await response.json()) as {
      message?: string;
      filters?: Record<string, string | number>;
    };
    const result = {
      message:
        providerResult.message?.slice(0, 280) ??
        "I found a few options. Let us explore the collection together.",
      filters: providerResult.filters,
    };
    costController.recordRequest();
    setCachedResponse(input, result);
    return Response.json(result);
  } catch (error) {
    console.error("Optional assistant provider failed", error);
    return Response.json(
      {
        enabled: false,
        message:
          "I can still help you explore the collection using local options.",
      },
      { status: 502 },
    );
  }
}
