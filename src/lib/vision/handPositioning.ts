import type { HandTransform } from "@/types";
import { clamp } from "./faceTracking";
import { getFingerLandmarks, type HandInfo } from "./handTracking";

export function calculateBangleTransform(
  hand: HandInfo,
  scaleMultiplier = 1,
): HandTransform {
  return {
    x: hand.wrist.x,
    y: hand.wrist.y,
    scale: clamp(hand.wristWidth * 5.2 * scaleMultiplier, 0.05, 0.8),
    rotationX: 0,
    rotationY: hand.palmAngle * 0.25,
    rotationZ: hand.palmAngle,
    opacity: 1,
  };
}

export function calculateRingTransform(
  hand: HandInfo,
  finger: "index" | "middle" | "ring" | "little" = "ring",
  scaleMultiplier = 1,
): HandTransform | null {
  const points = getFingerLandmarks(hand, finger);
  if (!points.mcp || !points.pip || !points.dip) return null;
  const x = (points.pip.x + points.dip.x) / 2;
  const y = (points.pip.y + points.dip.y) / 2;
  const angle = Math.atan2(
    points.dip.y - points.pip.y,
    points.dip.x - points.pip.x,
  );
  const width = Math.hypot(
    points.dip.x - points.pip.x,
    points.dip.y - points.pip.y,
  );
  return {
    x,
    y,
    scale: clamp(width * 7 * scaleMultiplier, 0.03, 0.35),
    rotationX: 0,
    rotationY: 0,
    rotationZ: angle,
    opacity: 1,
  };
}
