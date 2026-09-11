const responseCache = new Map<string, unknown>();

export function normalizePrompt(input: string) {
  return input.trim().toLowerCase().replace(/\\s+/g, " ");
}

export function getCachedResponse<T>(input: string) {
  return responseCache.get(normalizePrompt(input)) as T | undefined;
}

export function setCachedResponse<T>(input: string, response: T) {
  responseCache.set(normalizePrompt(input), response);
}
