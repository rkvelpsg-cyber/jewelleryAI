export function normalizedToCanvas(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  mirrored = true,
) {
  const finalX = mirrored ? 1 - x : x;
  return {
    x: finalX * canvasWidth,
    y: y * canvasHeight,
  };
}

export const MIRROR_CAMERA = true;

export function getVideoDisplayMetrics(
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const scale = Math.max(
    canvasWidth / Math.max(videoWidth, 1),
    canvasHeight / Math.max(videoHeight, 1),
  );
  const displayedWidth = videoWidth * scale;
  const displayedHeight = videoHeight * scale;
  const offsetX = (canvasWidth - displayedWidth) / 2;
  const offsetY = (canvasHeight - displayedHeight) / 2;

  return {
    scale,
    displayedWidth,
    displayedHeight,
    offsetX,
    offsetY,
  };
}

export function mapNormalizedToCanvas(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  mirrored = true,
) {
  const { displayedWidth, displayedHeight, offsetX, offsetY, scale } =
    getVideoDisplayMetrics(videoWidth, videoHeight, canvasWidth, canvasHeight);

  const finalX = mirrored ? 1 - x : x;
  const screenX = finalX * displayedWidth + offsetX;
  const screenY = y * displayedHeight + offsetY;

  return {
    x: screenX,
    y: screenY,
    scale,
    offsetX,
    offsetY,
  };
}

export function mapVideoPointToCanvas(
  x: number,
  y: number,
  video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">,
  canvas: Pick<HTMLCanvasElement, "width" | "height">,
  mirrored = MIRROR_CAMERA,
) {
  return mapNormalizedToCanvas(
    x,
    y,
    video.videoWidth,
    video.videoHeight,
    canvas.width,
    canvas.height,
    mirrored,
  );
}
