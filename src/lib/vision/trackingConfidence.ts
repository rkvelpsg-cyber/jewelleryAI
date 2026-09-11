import type { LandmarkLike } from "./faceTracking";

export function landmarkConfidence(landmarks: LandmarkLike[] | undefined) {
  if (!landmarks?.length) return 0;
  const values = landmarks.map((landmark) =>
    Math.min(landmark.visibility ?? 1, landmark.presence ?? 1),
  );
  return values.reduce((total, value) => total + value, 0) / values.length;
}
