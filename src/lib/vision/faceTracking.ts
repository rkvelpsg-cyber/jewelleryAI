export type LandmarkLike = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function dist(a: LandmarkLike, b: LandmarkLike) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getFaceInfo(landmarks: LandmarkLike[] | undefined) {
  if (!landmarks || landmarks.length < 10) return null;

  const chin = landmarks[152] ?? landmarks[10] ?? landmarks[0];
  const nose = landmarks[1] ?? landmarks[0];
  const forehead = landmarks[10] ?? landmarks[0];
  const leftFaceSide =
    landmarks[234] ??
    landmarks[127] ??
    landmarks[93] ??
    landmarks[4] ??
    landmarks[0];
  const rightFaceSide =
    landmarks[454] ??
    landmarks[356] ??
    landmarks[323] ??
    landmarks[14] ??
    landmarks[0];

  if (!chin || !nose || !forehead || !leftFaceSide || !rightFaceSide)
    return null;

  const faceWidth = dist(leftFaceSide, rightFaceSide);
  const faceHeight = dist(forehead, chin);
  const centerX = (leftFaceSide.x + rightFaceSide.x) / 2;
  const centerY = (leftFaceSide.y + rightFaceSide.y) / 2;
  const yaw = (nose.x - centerX) / Math.max(faceWidth, 0.001);

  return {
    chin,
    nose,
    forehead,
    leftFaceSide,
    rightFaceSide,
    centerX,
    centerY,
    faceWidth,
    faceHeight,
    yaw: clamp(yaw, -1, 1),
  };
}

export const FACE_LANDMARKS = {
  chin: 152,
  nose: 1,
  forehead: 10,
  leftFaceSide: 234,
  rightFaceSide: 454,
  leftJaw: 127,
  rightJaw: 356,
} as const;
