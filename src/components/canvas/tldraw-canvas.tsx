"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, type Editor } from "tldraw";
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generations = [],
  onOpenGenerate,
}: TldrawCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const shapesCreatedRef = useRef(false);
  const prevLevelRef = useRef<string>("project");
  const { selectNode, drillDown, navigateUp, currentLevel, breadcrumb } = useCanvas();

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Dark background
      editor.user.updateUserPreferences({ colorScheme: "dark" });

      // Listen for selection changes → update inspector
      editor.sideEffects.registerAfterChangeHandler("instance_page_state", () => {
        const selected = editor.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          const objectId = (shape.props as Record<string, unknown>).objectId as string | undefined;
          if (objectId) {
            selectNode(objectId);
          }
        } else if (selected.length === 0) {
          selectNode(null);
        }
      });
    },
    [selectNode]
  );

  // Handle double-click on shapes for drill-down navigation
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleDoubleClick = () => {
      const selected = editor.getSelectedShapes();
      if (selected.length !== 1) return;

      const shape = selected[0];
      const props = shape.props as Record<string, unknown>;
      const objectId = props.objectId as string | undefined;
      const name = props.name as string | undefined;

      if (!objectId) return;

      if (shape.type === CHARACTER_NODE_TYPE && name) {
        drillDown("character", objectId, name);
      } else if (shape.type === LOCATION_NODE_TYPE && name) {
        drillDown("location", objectId, name);
      } else if (shape.type === SCENE_NODE_TYPE && name) {
        drillDown("scene", objectId, name);
      } else if (shape.type === CARD_NODE_TYPE) {
        const kind = props.kind as string;
        if (kind === "face" && onOpenGenerate) {
          onOpenGenerate(objectId, "character_face");
        } else if (kind === "bible") {
          selectNode(objectId);
        }
      }
    };

    const container = document.querySelector(".tl-container");
    if (container) {
      container.addEventListener("dblclick", handleDoubleClick);
      return () => container.removeEventListener("dblclick", handleDoubleClick);
    }
  }, [drillDown, currentLevel, onOpenGenerate, selectNode]);

  // Helper: clear all shapes from the canvas
  const clearCanvas = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const allShapes = editor.getCurrentPageShapes();
    if (allShapes.length > 0) {
      editor.deleteShapes(allShapes.map((s) => s.id));
    }
  }, []);

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
      }
      // location and scene sub-canvases can be added similarly

      prevLevelRef.current = currentLevel;
    }
  }, [currentLevel, characters, locations, scenes, canvasNodes, breadcrumb, clearCanvas, renderProjectCanvas, renderCharacterCanvas]);

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
        hideUi
      />
    </div>
  );
}
