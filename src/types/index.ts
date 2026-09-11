export type JewelleryType =
  | "necklace"
  | "choker"
  | "earrings"
  | "mangalsutra"
  | "haaram"
  | "bridal-set"
  | "maang-tikka"
  | "bangles"
  | "bracelet"
  | "rings";
export type RenderMode = "2d" | "3d";
export type JewelleryFitProfile =
  | "choker"
  | "short-necklace"
  | "medium-necklace"
  | "long-necklace"
  | "mangalsutra"
  | "haaram"
  | "bridal-set";

export interface JewelleryProduct {
  id: string;
  name: string;
  sku: string;
  type: JewelleryType;
  price?: number;
  offerPrice?: number;
  weight?: string;
  purity?: string;
  category?: string;
  style?: string;
  material?: string;
  imageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  model3dUrl?: string;
  renderMode?: RenderMode;
  fitProfile?: JewelleryFitProfile;
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
  physicalWidthMm?: number;
  physicalHeightMm?: number;
  collectionId?: string;
  subCategory?: string;
  designFamily?: string;
  occasion?: string;
  handFitConfig?: {
    finger?: "index" | "middle" | "ring" | "little";
    offsetX?: number;
    offsetY?: number;
    scaleMultiplier?: number;
  };
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
  hand?: HandTransform;
}

export interface HandTransform {
  x: number;
  y: number;
  scale: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  opacity: number;
}

export interface TrackingState {
  faceDetected: boolean;
  poseDetected: boolean;
  confidence: number;
  yaw: number;
  faceWidth: number;
  shoulderWidth: number;
  lostForMs: number;
}

export interface SessionPreferences {
  triedCategories: string[];
  preferredMaterial?: string;
  maxPrice?: number;
  preferredWeight?: string;
}

export type AssistantAction =
  | { action: "NEXT_PRODUCT" }
  | { action: "PREVIOUS_PRODUCT" }
  | { action: "FILTER_PRODUCTS"; filters: Record<string, string | number> }
  | { action: "SAVE_LOOK" }
  | { action: "SEND_TO_PHONE" }
  | { action: "ANSWER"; text: string }
  | { action: "OPEN_ASSISTANT" };

export type ProductEventType =
  | "SESSION_STARTED"
  | "PRODUCT_CHANGED"
  | "CATEGORY_CHANGED"
  | "PRODUCT_SAVED"
  | "QR_OPENED"
  | "WHATSAPP_CLICKED"
  | "VOICE_COMMAND"
  | "INACTIVITY";

export interface ShoppingSessionContext {
  sessionId: string;
  occasion?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredStyles: string[];
  preferredCategories: string[];
  preferredMaterials: string[];
  preferredWeight?: "light" | "medium" | "heavy";
  triedProducts: string[];
  likedProducts: string[];
  savedProducts: string[];
  skippedProducts: string[];
  currentProductId?: string;
  previousProductId?: string;
  conversationHistory: string[];
}
