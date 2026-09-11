import type { LandmarkLike } from "./faceTracking";

export function getPoseInfo(landmarks: LandmarkLike[] | undefined) {
  if (!landmarks || landmarks.length < 13) return null;

  const leftShoulder = landmarks[11] ?? landmarks[5] ?? null;
  const rightShoulder = landmarks[12] ?? landmarks[6] ?? null;

  if (!leftShoulder || !rightShoulder) return null;

  const shoulderWidth = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y,
  );

  if (shoulderWidth < 0.02) return null;

  const confidence = Math.min(
    leftShoulder.visibility ?? 1,
    rightShoulder.visibility ?? 1,
    leftShoulder.presence ?? 1,
    rightShoulder.presence ?? 1,
  );

  if (confidence < 0.35) return null;

  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;

  return {
    leftShoulder,
    rightShoulder,
    shoulderWidth,
    shoulderCenterX,
    shoulderCenterY,
    shoulderAngle: Math.atan2(dy, dx),
    confidence,
  };
}

export const POSE_LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
} as const;
