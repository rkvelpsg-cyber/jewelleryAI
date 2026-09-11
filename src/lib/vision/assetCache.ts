const imageCache = new Map<string, HTMLImageElement>();

export function preloadImage(url?: string) {
  if (!url || typeof window === "undefined") return Promise.resolve(null);
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);

  const image = new Image();
  image.src = url;
  imageCache.set(url, image);

  return new Promise<HTMLImageElement | null>((resolve) => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });
}

export function getCachedImage(url?: string) {
  return url ? (imageCache.get(url) ?? null) : null;
}

export async function preloadImages(urls: Array<string | undefined>) {
  await Promise.all(urls.filter(Boolean).map((url) => preloadImage(url)));
}
