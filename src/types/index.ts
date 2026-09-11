export type JewelleryType = "necklace" | "choker" | "earrings";
export type RenderMode = "2d" | "3d";

export interface JewelleryProduct {
  id: string;
  name: string;
  sku: string;
  type: JewelleryType;
  price: number;
  weight?: string;
  purity?: string;
  imageUrl: string;
  model3dUrl?: string;
  renderMode: RenderMode;
  scaleMultiplier: number;
  offsetX: number;
  offsetY: number;
  rotationDeg?: number;
  active: boolean;
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
