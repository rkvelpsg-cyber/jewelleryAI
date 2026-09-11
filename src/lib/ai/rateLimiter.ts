export function createRateLimiter(limit: number, windowMs: number) {
  const timestamps: number[] = [];
  return {
    allow(now = Date.now()) {
      while (timestamps[0] !== undefined && now - timestamps[0] >= windowMs)
        timestamps.shift();
      if (timestamps.length >= limit) return false;
      timestamps.push(now);
      return true;
    },
  };
}
