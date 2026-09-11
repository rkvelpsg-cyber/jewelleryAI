export type JewelleryType = "necklace" | "choker" | "earrings" | "mangalsutra";
export type RenderMode = "2d" | "3d";

export interface JewelleryProduct {
  id: string;
  name: string;
  sku: string;
  type: JewelleryType;
  price?: number;
  weight?: string;
  purity?: string;
  imageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  model3dUrl?: string;
  renderMode?: RenderMode;
  scaleMultiplier?: number;
  offsetX?: number;
  offsetY?: number;
  verticalAnchorRatio?: number;
  rotationOffset?: number;
  earringScaleMultiplier?: number;
  leftOffsetX?: number;
  leftOffsetY?: number;
  rightOffsetX?: number;
  rightOffsetY?: number;
  yawScaleStrength?: number;
  yawOpacityStrength?: number;
  rotationDeg?: number;
  active: boolean;
  assetCrop?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface ARTransform {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
  rotationZ: number;
  yaw: number;
  pitch: number;
}

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
