"use client";

import dynamic from "next/dynamic";
import type { Character, Location, Scene, CanvasNode, Generation, AudienceReaction } from "@/lib/types";

const TldrawCanvas = dynamic(() => import("./tldraw-canvas"), { ssr: false });

interface CanvasPanelProps {
  characters?: Character[];
  locations?: Location[];
  scenes?: Scene[];
  canvasNodes?: CanvasNode[];
  generations?: Generation[];
  reactions?: AudienceReaction[];
  onOpenGenerate?: (objectId: string, objectType: string) => void;
  onDeleteEntity?: (entityId: string, type: "character" | "location" | "scene") => void;
}

export function CanvasPanel({
  characters = [],
  locations = [],
  scenes = [],
  canvasNodes = [],
  generations = [],
  reactions = [],
  onOpenGenerate,
  onDeleteEntity,
}: CanvasPanelProps) {
  return (
    <div className="flex-1 bg-jc-bg relative overflow-hidden">
      <TldrawCanvas
        characters={characters}
        locations={locations}
        scenes={scenes}
        canvasNodes={canvasNodes}
        generations={generations}
        reactions={reactions}
        onOpenGenerate={onOpenGenerate}
        onDeleteEntity={onDeleteEntity}
      />
    </div>
  );
}
