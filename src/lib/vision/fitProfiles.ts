import type { JewelleryFitProfile } from "@/types";

export interface JewelleryFitProfileConfig {
  verticalAnchorRatio: number;
  scaleMultiplier: number;
  minScale: number;
  maxScale: number;
}

export const JEWELLERY_FIT_PROFILES: Record<
  JewelleryFitProfile,
  JewelleryFitProfileConfig
> = {
  choker: {
    verticalAnchorRatio: 0.22,
    scaleMultiplier: 0.75,
    minScale: 0.1,
    maxScale: 0.8,
  },
  "short-necklace": {
    verticalAnchorRatio: 0.36,
    scaleMultiplier: 0.9,
    minScale: 0.1,
    maxScale: 0.85,
  },
  "medium-necklace": {
    verticalAnchorRatio: 0.48,
    scaleMultiplier: 1.05,
    minScale: 0.12,
    maxScale: 0.9,
  },
  "long-necklace": {
    verticalAnchorRatio: 0.62,
    scaleMultiplier: 1.12,
    minScale: 0.14,
    maxScale: 0.95,
  },
  haaram: {
    verticalAnchorRatio: 0.76,
    scaleMultiplier: 1.2,
    minScale: 0.16,
    maxScale: 1,
  },
  mangalsutra: {
    verticalAnchorRatio: 0.5,
    scaleMultiplier: 1.05,
    minScale: 0.12,
    maxScale: 0.9,
  },
  "bridal-set": {
    verticalAnchorRatio: 0.58,
    scaleMultiplier: 1.28,
    minScale: 0.16,
    maxScale: 1,
  },
};

export function getFitProfile(profile?: JewelleryFitProfile) {
  return JEWELLERY_FIT_PROFILES[profile ?? "medium-necklace"];
}
