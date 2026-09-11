import { clamp, dist, type LandmarkLike } from "./faceTracking";
import { getPoseInfo } from "./poseTracking";
import { getFitProfile } from "./fitProfiles";

export interface Transform2D {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface JewelleryTransforms {
  necklace?: Transform2D;
  leftEarring?: Transform2D;
  rightEarring?: Transform2D;
}

export function computeJewelleryTransforms(
  product: {
    type?: string;
    scaleMultiplier?: number;
    offsetX?: number;
    offsetY?: number;
    verticalAnchorRatio?: number;
    rotationOffset?: number;
    fitProfile?: Parameters<typeof getFitProfile>[0];
    earringScaleMultiplier?: number;
    leftOffsetX?: number;
    leftOffsetY?: number;
    rightOffsetX?: number;
    rightOffsetY?: number;
    yawScaleStrength?: number;
    yawOpacityStrength?: number;
  },
  faceLandmarks?: LandmarkLike[],
  poseLandmarks?: LandmarkLike[],
  previous?: JewelleryTransforms,
) {
  const faceInfo = faceLandmarks ? getFaceInfo(faceLandmarks) : null;
  const poseInfo = poseLandmarks ? getPoseInfo(poseLandmarks) : null;

  const previousNecklace = previous?.necklace ?? {
    x: 0.5,
    y: 0.52,
    scale: 0.2,
    rotation: 0,
    opacity: 1,
  };

  const previousLeft = previous?.leftEarring ?? {
    x: 0.35,
    y: 0.42,
    scale: 0.12,
    rotation: 0,
    opacity: 1,
  };

  const previousRight = previous?.rightEarring ?? {
    x: 0.65,
    y: 0.42,
    scale: 0.12,
    rotation: 0,
    opacity: 1,
  };

  const necklace = buildNecklaceTransform(
    product,
    faceInfo,
    poseInfo,
    previousNecklace,
  );
  const earrings = buildEarringTransforms(
    product,
    faceInfo,
    previousLeft,
    previousRight,
  );

  return {
    necklace,
    leftEarring: earrings.left,
    rightEarring: earrings.right,
    yaw: faceInfo?.yaw ?? 0,
    poseDetected: Boolean(poseInfo),
    faceDetected: Boolean(faceInfo),
  };
}

function getFaceInfo(landmarks: LandmarkLike[]) {
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

function buildNecklaceTransform(
  product: {
    type?: string;
    scaleMultiplier?: number;
    offsetX?: number;
    offsetY?: number;
    verticalAnchorRatio?: number;
    rotationOffset?: number;
    fitProfile?: Parameters<typeof getFitProfile>[0];
  },
  faceInfo: ReturnType<typeof getFaceInfo>,
  poseInfo: ReturnType<typeof getPoseInfo>,
  previous: Transform2D,
): Transform2D {
  const profile = getFitProfile(product.fitProfile);
  const scaleMultiplier = product.scaleMultiplier ?? profile.scaleMultiplier;
  const offsetX = product.offsetX ?? 0;
  const offsetY = product.offsetY ?? 0;
  const verticalAnchorRatio =
    product.verticalAnchorRatio ?? profile.verticalAnchorRatio;
  const rotationOffset = product.rotationOffset ?? 0;

  let x = 0.5;
  let y = 0.52;
  let scale = 0.22;
  let rotation = 0;

  if (poseInfo && faceInfo) {
    x = poseInfo.shoulderCenterX + offsetX;
    y =
      faceInfo.chin.y +
      (poseInfo.shoulderCenterY - faceInfo.chin.y) * verticalAnchorRatio +
      offsetY;
    scale = poseInfo.shoulderWidth * scaleMultiplier;
    rotation =
      (clamp(
        (Math.atan2(
          poseInfo.rightShoulder.y - poseInfo.leftShoulder.y,
          poseInfo.rightShoulder.x - poseInfo.leftShoulder.x,
        ) +
          rotationOffset) *
          (180 / Math.PI),
        -15,
        15,
      ) /
        180) *
      Math.PI;
  } else if (faceInfo) {
    x = faceInfo.centerX + offsetX;
    y =
      faceInfo.chin.y +
      faceInfo.faceHeight * (verticalAnchorRatio + 0.15) +
      offsetY;
    scale = faceInfo.faceWidth * scaleMultiplier;
    rotation = clamp((faceInfo.yaw * 0.9 + rotationOffset) * 0.7, -0.26, 0.26);
  }

  return {
    x: clamp(x, 0.1, 0.9),
    y: clamp(y, 0.1, 0.9),
    scale: clamp(scale, profile.minScale, profile.maxScale),
    rotation: clamp(rotation, -0.26, 0.26),
    opacity: 1,
  };
}

function buildEarringTransforms(
  product: {
    earringScaleMultiplier?: number;
    leftOffsetX?: number;
    leftOffsetY?: number;
    rightOffsetX?: number;
    rightOffsetY?: number;
    yawScaleStrength?: number;
    yawOpacityStrength?: number;
  },
  faceInfo: ReturnType<typeof getFaceInfo>,
  previousLeft: Transform2D,
  previousRight: Transform2D,
) {
  const earringScaleMultiplier = product.earringScaleMultiplier ?? 0.16;
  const leftOffsetX = product.leftOffsetX ?? -0.02;
  const leftOffsetY = product.leftOffsetY ?? 0.04;
  const rightOffsetX = product.rightOffsetX ?? 0.02;
  const rightOffsetY = product.rightOffsetY ?? 0.04;
  const yawScaleStrength = product.yawScaleStrength ?? 0.2;
  const yawOpacityStrength = product.yawOpacityStrength ?? 0.5;

  if (!faceInfo) {
    return {
      left: previousLeft,
      right: previousRight,
    };
  }

  const faceWidth = faceInfo.faceWidth;
  const leftX = faceInfo.leftFaceSide.x + faceWidth * leftOffsetX;
  const leftY = faceInfo.leftFaceSide.y + faceWidth * leftOffsetY;
  const rightX = faceInfo.rightFaceSide.x + faceWidth * rightOffsetX;
  const rightY = faceInfo.rightFaceSide.y + faceWidth * rightOffsetY;

  const leftYawFactor = clamp(1 + faceInfo.yaw * yawScaleStrength, 0.8, 1.08);
  const rightYawFactor = clamp(1 - faceInfo.yaw * yawScaleStrength, 0.8, 1.08);

  const baseLeftScale = faceWidth * earringScaleMultiplier * leftYawFactor;
  const baseRightScale = faceWidth * earringScaleMultiplier * rightYawFactor;

  const leftOpacity = clamp(
    1 - Math.max(0, faceInfo.yaw) * yawOpacityStrength,
    0.25,
    1,
  );
  const rightOpacity = clamp(
    1 + Math.min(0, faceInfo.yaw) * yawOpacityStrength,
    0.25,
    1,
  );

  return {
    left: {
      x: clamp(leftX, 0.06, 0.94),
      y: clamp(leftY, 0.1, 0.9),
      scale: clamp(baseLeftScale, 0.05, 0.5),
      rotation: 0,
      opacity: leftOpacity,
    },
    right: {
      x: clamp(rightX, 0.06, 0.94),
      y: clamp(rightY, 0.1, 0.9),
      scale: clamp(baseRightScale, 0.05, 0.5),
      rotation: 0,
      opacity: rightOpacity,
    },
  };
}
