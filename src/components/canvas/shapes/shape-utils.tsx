import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  type RecordProps,
  type TLShape,
} from "tldraw";
import {
  CHARACTER_NODE_TYPE,
  LOCATION_NODE_TYPE,
  SCENE_NODE_TYPE,
  CARD_NODE_TYPE,
  GEN_IMAGE_TYPE,
} from "./types";
import { NodeComponent } from "./node-component";

// --- Type augmentation ---

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [CHARACTER_NODE_TYPE]: {
      w: number;
      h: number;
      name: string;
      status: string;
      objectId: string;
      thumbnailUrl: string;
    };
    [LOCATION_NODE_TYPE]: {
      w: number;
      h: number;
      name: string;
      status: string;
      objectId: string;
      thumbnailUrl: string;
    };
    [SCENE_NODE_TYPE]: {
      w: number;
      h: number;
      name: string;
      status: string;
      objectId: string;
      thumbnailUrl: string;
    };
    [CARD_NODE_TYPE]: {
      w: number;
      h: number;
      label: string;
      kind: string;
      locked: boolean;
      objectId: string;
    };
    [GEN_IMAGE_TYPE]: {
      w: number;
      h: number;
      imageUrl: string;
      generationId: string;
      objectId: string;
      starred: boolean;
    };
  }
}

// Shared props validator
const nodeProps: RecordProps<TLShape<typeof CHARACTER_NODE_TYPE>> = {
  w: T.number,
  h: T.number,
  name: T.string,
  status: T.string,
  objectId: T.string,
  thumbnailUrl: T.string,
};

const NODE_W = 220;
const NODE_H = 160;

// --- Character Node ---

type CharacterShape = TLShape<typeof CHARACTER_NODE_TYPE>;

export class CharacterNodeUtil extends ShapeUtil<CharacterShape> {
  static override type = CHARACTER_NODE_TYPE;
  static override props = nodeProps;

  getDefaultProps(): CharacterShape["props"] {
    return {
      w: NODE_W,
      h: NODE_H,
      name: "Character",
      status: "empty",
      objectId: "",
      thumbnailUrl: "",
    };
  }

  override canEdit() {
    return false;
  }
  override canResize() {
    return false;
  }

  getGeometry(shape: CharacterShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: CharacterShape) {
    return (
      <HTMLContainer>
        <NodeComponent
          name={shape.props.name}
          status={shape.props.status as "empty" | "generating" | "generated" | "reacted" | "starred"}
          nodeType="character"
          thumbnailUrl={shape.props.thumbnailUrl}
          w={shape.props.w}
          h={shape.props.h}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: CharacterShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

// --- Location Node ---

type LocationShape = TLShape<typeof LOCATION_NODE_TYPE>;

export class LocationNodeUtil extends ShapeUtil<LocationShape> {
  static override type = LOCATION_NODE_TYPE;
  static override props = nodeProps as RecordProps<LocationShape>;

  getDefaultProps(): LocationShape["props"] {
    return {
      w: NODE_W,
      h: NODE_H,
      name: "Location",
      status: "empty",
      objectId: "",
      thumbnailUrl: "",
    };
  }

  override canEdit() {
    return false;
  }
  override canResize() {
    return false;
  }

  getGeometry(shape: LocationShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: LocationShape) {
    return (
      <HTMLContainer>
        <NodeComponent
          name={shape.props.name}
          status={shape.props.status as "empty" | "generating" | "generated" | "reacted" | "starred"}
          nodeType="location"
          thumbnailUrl={shape.props.thumbnailUrl}
          w={shape.props.w}
          h={shape.props.h}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LocationShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

// --- Scene Node ---

type SceneShape = TLShape<typeof SCENE_NODE_TYPE>;

export class SceneNodeUtil extends ShapeUtil<SceneShape> {
  static override type = SCENE_NODE_TYPE;
  static override props = nodeProps as RecordProps<SceneShape>;

  getDefaultProps(): SceneShape["props"] {
    return {
      w: NODE_W,
      h: NODE_H,
      name: "Scene",
      status: "empty",
      objectId: "",
      thumbnailUrl: "",
    };
  }

  override canEdit() {
    return false;
  }
  override canResize() {
    return false;
  }

  getGeometry(shape: SceneShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SceneShape) {
    return (
      <HTMLContainer>
        <NodeComponent
          name={shape.props.name}
          status={shape.props.status as "empty" | "generating" | "generated" | "reacted" | "starred"}
          nodeType="scene"
          thumbnailUrl={shape.props.thumbnailUrl}
          w={shape.props.w}
          h={shape.props.h}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: SceneShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

// --- Card Node (Bible, Face, Body, Wardrobe cards in sub-canvases) ---

type CardShape = TLShape<typeof CARD_NODE_TYPE>;

// Lucide icon names mapped to card kinds (rendered inline as SVG strings for tldraw HTMLContainer)
const CARD_KIND_CONFIG: Record<string, { color: string; svgPath: string }> = {
  bible: {
    color: "#F0EDE8",
    svgPath: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  },
  face: {
    color: "#CC3300",
    svgPath: '<circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  },
  body: {
    color: "#CC3300",
    svgPath: '<circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 7v6m-4 4 4-4 4 4M8 13h8" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  },
  wardrobe: {
    color: "#CC3300",
    svgPath: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="m8 10 4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  },
  generate: {
    color: "#CC3300",
    svgPath: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 8v8m-4-4h8" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  },
};

export class CardNodeUtil extends ShapeUtil<CardShape> {
  static override type = CARD_NODE_TYPE;
  static override props: RecordProps<CardShape> = {
    w: T.number,
    h: T.number,
    label: T.string,
    kind: T.string,
    locked: T.boolean,
    objectId: T.string,
  };

  getDefaultProps(): CardShape["props"] {
    return { w: 200, h: 120, label: "Card", kind: "bible", locked: false, objectId: "" };
  }

  override canEdit() { return false; }
  override canResize() { return false; }

  getGeometry(shape: CardShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: CardShape) {
    const cfg = CARD_KIND_CONFIG[shape.props.kind] ?? CARD_KIND_CONFIG.bible;
    const locked = shape.props.locked;
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: locked ? "#161614" : "#1A1917",
            border: locked ? "2px dashed rgba(255,255,255,0.06)" : "2px solid rgba(255,255,255,0.12)",
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: locked ? 0.4 : 1,
            userSelect: "none",
            color: cfg.color,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: cfg.svgPath }} />
          <span style={{ fontSize: 12, color: cfg.color, fontWeight: 500 }}>
            {shape.props.label}
          </span>
          {locked && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "rgba(240,237,232,0.3)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              Locked
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: CardShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

// --- Generated Image Node ---

type GenImageShape = TLShape<typeof GEN_IMAGE_TYPE>;

export class GenImageNodeUtil extends ShapeUtil<GenImageShape> {
  static override type = GEN_IMAGE_TYPE;
  static override props: RecordProps<GenImageShape> = {
    w: T.number,
    h: T.number,
    imageUrl: T.string,
    generationId: T.string,
    objectId: T.string,
    starred: T.boolean,
  };

  getDefaultProps(): GenImageShape["props"] {
    return { w: 220, h: 220, imageUrl: "", generationId: "", objectId: "", starred: false };
  }

  override canEdit() { return false; }
  override canResize() { return false; }

  getGeometry(shape: GenImageShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: GenImageShape) {
    const starred = shape.props.starred;
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: "#111110",
            border: starred ? "2px solid #CC3300" : "2px solid rgba(255,255,255,0.12)",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
            userSelect: "none",
          }}
        >
          {shape.props.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shape.props.imageUrl}
              alt="Generated"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(90deg, #1A1917 25%, #222220 50%, #1A1917 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              <span style={{ color: "rgba(240,237,232,0.3)", fontSize: 11 }}>Generating...</span>
            </div>
          )}
          {starred && (
            <div style={{ position: "absolute", top: 6, right: 6, color: "#CC3300", fontSize: 16 }}>★</div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: GenImageShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

export const customShapeUtils = [
  CharacterNodeUtil,
  LocationNodeUtil,
  SceneNodeUtil,
  CardNodeUtil,
  GenImageNodeUtil,
];
