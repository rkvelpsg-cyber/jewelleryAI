import type { LandmarkLike } from "./faceTracking";

export const HAND_LANDMARKS = {
  wrist: 0,
  thumbMcp: 2,
  indexMcp: 5,
  indexPip: 6,
  indexDip: 7,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleDip: 11,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringDip: 15,
  ringTip: 16,
  littleMcp: 17,
  littlePip: 18,
  littleDip: 19,
  littleTip: 20,
} as const;

export type Handedness = "Left" | "Right" | "Unknown";

export interface HandInfo {
  landmarks: LandmarkLike[];
  handedness: Handedness;
  wrist: LandmarkLike;
  wristWidth: number;
  palmAngle: number;
}

export function getHandInfo(
  landmarks: LandmarkLike[] | undefined,
  handedness: Handedness = "Unknown",
): HandInfo | null {
  if (!landmarks || landmarks.length < 21) return null;
  const wrist = landmarks[HAND_LANDMARKS.wrist];
  const indexMcp = landmarks[HAND_LANDMARKS.indexMcp];
  const littleMcp = landmarks[HAND_LANDMARKS.littleMcp];
  if (!wrist || !indexMcp || !littleMcp) return null;
  return {
    landmarks,
    handedness,
    wrist,
    wristWidth: Math.hypot(indexMcp.x - littleMcp.x, indexMcp.y - littleMcp.y),
    palmAngle: Math.atan2(indexMcp.y - littleMcp.y, indexMcp.x - littleMcp.x),
  };
}

export function getFingerLandmarks(
  hand: HandInfo,
  finger: "index" | "middle" | "ring" | "little",
) {
  const starts = { index: 5, middle: 9, ring: 13, little: 17 };
  const start = starts[finger];
  return {
    mcp: hand.landmarks[start],
    pip: hand.landmarks[start + 1],
    dip: hand.landmarks[start + 2],
    tip: hand.landmarks[start + 3],
  };
}
