"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Tldraw, type Editor, type TldrawOptions, type StateNode, type TLClickEventInfo } from "tldraw";
import "tldraw/tldraw.css";
import { customShapeUtils } from "./shapes/shape-utils";
import { useCanvas } from "@/lib/store/canvas-store";
import type { Character, Location, Scene, CanvasNode, Generation } from "@/lib/types";
import {
  CHARACTER_NODE_TYPE,
  LOCATION_NODE_TYPE,
  SCENE_NODE_TYPE,
  CARD_NODE_TYPE,
} from "./shapes/types";

interface TldrawCanvasProps {
  characters?: Character[];
  locations?: Location[];
  scenes?: Scene[];
  canvasNodes?: CanvasNode[];
  generations?: Generation[];
  onOpenGenerate?: (objectId: string, objectType: string) => void;
}

export default function TldrawCanvas({
  characters = [],
  locations = [],
  scenes = [],
  canvasNodes = [],
  generations = [],
  onOpenGenerate,
}: TldrawCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const shapesCreatedRef = useRef(false);
  const prevLevelRef = useRef<string>("project");
  const prevCharIdsRef = useRef<string>("");
  const { selectNode, drillDown, navigateUp, currentLevel, breadcrumb } = useCanvas();

  // Store callbacks in refs so the double-click handler always uses the latest
  const drillDownRef = useRef(drillDown);
  drillDownRef.current = drillDown;
  const selectNodeRef = useRef(selectNode);
  selectNodeRef.current = selectNode;
  const onOpenGenerateRef = useRef(onOpenGenerate);
  onOpenGenerateRef.current = onOpenGenerate;
  const currentLevelRef = useRef(currentLevel);
  currentLevelRef.current = currentLevel;

  // Disable tldraw's default double-click-to-create-text
  const tldrawOptions = useMemo<Partial<TldrawOptions>>(() => ({
    createTextOnCanvasDoubleClick: false,
  }), []);

  // Custom double-click handler for our shapes
  const handleShapeDoubleClick = useCallback((editor: Editor) => {
    const selected = editor.getSelectedShapes();
    if (selected.length !== 1) return;

    const shape = selected[0];
    const props = shape.props as Record<string, unknown>;
    const objectId = props.objectId as string | undefined;
    const name = props.name as string | undefined;

    if (!objectId) return;

    if (shape.type === CHARACTER_NODE_TYPE && name) {
      drillDownRef.current("character", objectId, name);
    } else if (shape.type === LOCATION_NODE_TYPE && name) {
      drillDownRef.current("location", objectId, name);
    } else if (shape.type === SCENE_NODE_TYPE && name) {
      drillDownRef.current("scene", objectId, name);
    } else if (shape.type === CARD_NODE_TYPE) {
      const kind = props.kind as string;
      const label = props.label as string || kind;
      if (kind === "face") {
        drillDownRef.current("face", objectId, label);
      } else if (kind === "body") {
        // Only drill if not locked
        if (!props.locked) drillDownRef.current("body", objectId, label);
      } else if (kind === "wardrobe") {
        if (!props.locked) drillDownRef.current("wardrobe", objectId, label);
      } else if (kind === "bible") {
        selectNodeRef.current(objectId);
      } else if (kind === "generate") {
        // The generate button inside a face/body/wardrobe canvas
        if (onOpenGenerateRef.current) {
          const lvl = currentLevelRef.current;
          const objectType =
            lvl === "body" ? "character_body" :
            lvl === "wardrobe" ? "wardrobe" : "character_face";
          onOpenGenerateRef.current(objectId, objectType);
        }
      }
    }
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Dark background
      editor.user.updateUserPreferences({ colorScheme: "dark" });

      // Listen for selection changes → update inspector
      const updateSelection = () => {
        const selected = editor.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          const props = shape.props as Record<string, unknown>;
          // For generated images, select by generationId so inspector can show reactions
          if (shape.type === "jc-gen-image" && props.generationId) {
            selectNodeRef.current(props.generationId as string);
          } else if (props.objectId) {
            selectNodeRef.current(props.objectId as string);
          }
        } else if (selected.length === 0) {
          selectNodeRef.current(null);
        }
      };

      // Fire on any pointer up (catches clicks on shapes)
      editor.on("event", (info) => {
        if (info.type === "pointer" && info.name === "pointer_up") {
          // Small delay to let tldraw update selection state
          setTimeout(updateSelection, 50);
        }
      });

      // Override the SelectTool's double-click behavior
      type IdleStateNode = StateNode & {
        handleDoubleClickOnCanvas(info: TLClickEventInfo): void;
      };
      const selectIdleState = editor.getStateDescendant<IdleStateNode>("select.idle");
      if (selectIdleState) {
        // Disable double-click on canvas (no text creation)
        selectIdleState.handleDoubleClickOnCanvas = () => {};
      }

      // Listen for double-click events on shapes
      let dblClickHandled = false;
      editor.on("event", (info) => {
        if (
          info.type === "click" &&
          info.name === "double_click" &&
          (info.target === "shape" || info.target === "canvas")
        ) {
          if (!dblClickHandled) {
            dblClickHandled = true;
            handleShapeDoubleClick(editor);
            // Reset after the event cycle completes
            setTimeout(() => { dblClickHandled = false; }, 100);
          }
        }
      });
    },
    [handleShapeDoubleClick]
  );

  // Helper: clear all shapes from the canvas
  const clearCanvas = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const allShapes = editor.getCurrentPageShapes();
    if (allShapes.length > 0) {
      editor.deleteShapes(allShapes.map((s) => s.id));
    }
  }, []);

  // Detect project switch: if character IDs change, clear and re-render
  useEffect(() => {
    const charIds = characters.map((c) => c.id).join(",");
    if (prevCharIdsRef.current && charIds && charIds !== prevCharIdsRef.current) {
      clearCanvas();
      shapesCreatedRef.current = false;
      prevLevelRef.current = "project";
    }
    prevCharIdsRef.current = charIds;
  }, [characters, clearCanvas]);

  // Render project-level shapes
  const renderProjectCanvas = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (characters.length === 0 && locations.length === 0 && scenes.length === 0) return;

    const posMap = new Map(canvasNodes.map((n) => [n.object_id, n.position]));
    const GRID_COLS = 4;
    const SPACING_X = 280;
    const SPACING_Y = 200;
    let idx = 0;

    const shapes: Parameters<Editor["createShapes"]>[0] = [];

    characters.forEach((c) => {
      const pos = posMap.get(c.id) ?? { x: (idx % GRID_COLS) * SPACING_X, y: Math.floor(idx / GRID_COLS) * SPACING_Y };
      idx++;
      shapes.push({ type: CHARACTER_NODE_TYPE, x: pos.x, y: pos.y, props: { w: 220, h: 160, name: c.name, status: c.status, objectId: c.id, thumbnailUrl: "" } });
    });
    locations.forEach((l) => {
      const pos = posMap.get(l.id) ?? { x: (idx % GRID_COLS) * SPACING_X, y: Math.floor(idx / GRID_COLS) * SPACING_Y };
      idx++;
      shapes.push({ type: LOCATION_NODE_TYPE, x: pos.x, y: pos.y, props: { w: 220, h: 160, name: l.name, status: l.status, objectId: l.id, thumbnailUrl: "" } });
    });
    scenes.forEach((s) => {
      const pos = posMap.get(s.id) ?? { x: (idx % GRID_COLS) * SPACING_X, y: Math.floor(idx / GRID_COLS) * SPACING_Y };
      idx++;
      shapes.push({ type: SCENE_NODE_TYPE, x: pos.x, y: pos.y, props: { w: 220, h: 160, name: s.name, status: "empty", objectId: s.id, thumbnailUrl: "" } });
    });

    if (shapes.length > 0) {
      editor.createShapes(shapes);
      editor.zoomToFit({ animation: { duration: 300 } });
    }
  }, [characters, locations, scenes, canvasNodes]);

  // Render character sub-canvas (Bible, Face, Body, Wardrobe cards)
  const renderCharacterCanvas = useCallback((characterId: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const char = characters.find((c) => c.id === characterId);
    const hasStarredFace = false; // TODO: check generations table
    const hasStarredBody = false;

    const shapes: Parameters<Editor["createShapes"]>[0] = [
      { type: CARD_NODE_TYPE, x: 0, y: 0, props: { w: 200, h: 120, label: "Character Bible", kind: "bible", locked: false, objectId: characterId } },
      { type: CARD_NODE_TYPE, x: 240, y: 0, props: { w: 200, h: 120, label: "Face", kind: "face", locked: false, objectId: characterId } },
      { type: CARD_NODE_TYPE, x: 480, y: 0, props: { w: 200, h: 120, label: "Body", kind: "body", locked: !hasStarredFace, objectId: characterId } },
      { type: CARD_NODE_TYPE, x: 720, y: 0, props: { w: 200, h: 120, label: "Wardrobe", kind: "wardrobe", locked: !hasStarredBody, objectId: characterId } },
    ];

    // If character has a bible, auto-select it in the inspector
    if (char) {
      selectNode(characterId);
    }

    editor.createShapes(shapes);
    editor.zoomToFit({ animation: { duration: 200 } });
  }, [characters, selectNode]);

  // Render generation sub-canvas (face, body, wardrobe) — shows generate button + existing generated images
  const renderGenerationCanvas = useCallback((objectId: string, level: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const objectType = level === "face" ? "character_face" : level === "body" ? "character_body" : "wardrobe";

    // Filter generations for this object + type
    const relevantGens = generations.filter(
      (g) => g.object_id === objectId && g.object_type === objectType
    );

    const shapes: Parameters<Editor["createShapes"]>[0] = [];

    // Add a "Generate" button card
    shapes.push({
      type: CARD_NODE_TYPE,
      x: 0,
      y: 0,
      props: {
        w: 200,
        h: 160,
        label: "Generate Likenesses",
        kind: "generate",
        locked: false,
        objectId,
      },
    });

    // Add existing generated images
    relevantGens.forEach((gen, i) => {
      shapes.push({
        type: "jc-gen-image" as const,
        x: (i + 1) * 240,
        y: 0,
        props: {
          w: 220,
          h: 220,
          imageUrl: gen.cloud_url || "",
          generationId: gen.id,
          objectId,
          starred: gen.starred,
        },
      });
    });

    editor.createShapes(shapes);
    editor.zoomToFit({ animation: { duration: 200 } });
  }, [generations]);

  // Create / swap shapes based on current level
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // On first data load at project level
    if (currentLevel === "project" && !shapesCreatedRef.current) {
      if (characters.length > 0 || locations.length > 0 || scenes.length > 0) {
        renderProjectCanvas();
        shapesCreatedRef.current = true;
      }
      prevLevelRef.current = currentLevel;
      return;
    }

    // Level changed — swap canvas content
    if (prevLevelRef.current !== currentLevel) {
      clearCanvas();

      if (currentLevel === "project") {
        renderProjectCanvas();
      } else if (currentLevel === "character") {
        const charId = breadcrumb[breadcrumb.length - 1]?.objectId;
        if (charId) renderCharacterCanvas(charId);
      } else if (currentLevel === "face" || currentLevel === "body" || currentLevel === "wardrobe") {
        const objectId = breadcrumb[breadcrumb.length - 1]?.objectId;
        if (objectId) renderGenerationCanvas(objectId, currentLevel);
      }

      prevLevelRef.current = currentLevel;
    }
  }, [currentLevel, characters, locations, scenes, canvasNodes, breadcrumb, clearCanvas, renderProjectCanvas, renderCharacterCanvas, renderGenerationCanvas]);

  // Re-render generation canvas when generations change while already on a generation level
  const prevGenerationsLenRef = useRef(generations.length);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const isGenLevel = currentLevel === "face" || currentLevel === "body" || currentLevel === "wardrobe";
    if (!isGenLevel) {
      prevGenerationsLenRef.current = generations.length;
      return;
    }
    // Only re-render if generations count actually changed
    if (generations.length !== prevGenerationsLenRef.current) {
      prevGenerationsLenRef.current = generations.length;
      clearCanvas();
      const objectId = breadcrumb[breadcrumb.length - 1]?.objectId;
      if (objectId) renderGenerationCanvas(objectId, currentLevel);
    }
  }, [generations, currentLevel, breadcrumb, clearCanvas, renderGenerationCanvas]);

  // Escape key → navigate up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const editor = editorRef.current;
        // Only navigate up if nothing is selected (tldraw handles deselect on first Escape)
        if (editor && editor.getSelectedShapes().length === 0) {
          navigateUp();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateUp]);

  return (
    <div className="absolute inset-0">
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={handleMount}
        options={tldrawOptions}
        hideUi
      />
    </div>
  );
}
