export function smoothValue(
  previous: number,
  current: number,
  factor: number,
  deadZone = 0.0005,
) {
  if (Math.abs(current - previous) <= deadZone) return previous;
  return previous * (1 - factor) + current * factor;
}

export function smoothTransform<T extends Record<string, unknown>>(
  previous: T,
  current: T,
  factors: Record<string, number>,
) {
  const next: Record<string, unknown> = { ...current };
  Object.keys(factors).forEach((key) => {
    if (typeof previous[key] === "number" && typeof current[key] === "number") {
      next[key] = smoothValue(
        previous[key] as number,
        current[key] as number,
        factors[key],
      );
    }
  });
  return next as T;
}
