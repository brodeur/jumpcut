"use client";

import dynamic from "next/dynamic";
import type { Character, Location, Scene, CanvasNode, Generation } from "@/lib/types";

const TldrawCanvas = dynamic(() => import("./tldraw-canvas"), { ssr: false });

interface CanvasPanelProps {
  characters?: Character[];
  locations?: Location[];
  scenes?: Scene[];
  canvasNodes?: CanvasNode[];
  generations?: Generation[];
  onOpenGenerate?: (objectId: string, objectType: string) => void;
}

export function CanvasPanel({
  characters = [],
  locations = [],
  scenes = [],
  canvasNodes = [],
  generations = [],
  onOpenGenerate,
}: CanvasPanelProps) {
  return (
    <div className="flex-1 bg-jc-bg relative overflow-hidden">
      <TldrawCanvas
        characters={characters}
        locations={locations}
        scenes={scenes}
        canvasNodes={canvasNodes}
        generations={generations}
        onOpenGenerate={onOpenGenerate}
      />
    </div>
  );
}
