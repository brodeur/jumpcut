import type { NodeStatus } from "@/lib/types";

// Shape prop interfaces
export interface JCNodeProps {
  w: number;
  h: number;
  name: string;
  status: NodeStatus;
  objectId: string;
  thumbnailUrl: string;
}

// Shape type constants
export const CHARACTER_NODE_TYPE = "jc-character" as const;
export const LOCATION_NODE_TYPE = "jc-location" as const;
export const SCENE_NODE_TYPE = "jc-scene" as const;
export const CARD_NODE_TYPE = "jc-card" as const;
export const GEN_IMAGE_TYPE = "jc-gen-image" as const;

export type CardKind = "bible" | "face" | "body" | "wardrobe" | "generate";

export interface CardNodeProps {
  w: number;
  h: number;
  label: string;
  kind: string; // CardKind
  locked: boolean;
  objectId: string;
}

export interface GenImageProps {
  w: number;
  h: number;
  imageUrl: string;
  generationId: string;
  objectId: string;
  starred: boolean;
}
