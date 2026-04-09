"use client";

import { useState, useCallback } from "react";
import { CanvasProvider } from "@/components/providers/canvas-provider";
import { Toolbar } from "@/components/toolbar";
import { NodeBrowser } from "@/components/sidebar/node-browser";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { ScriptDialog } from "@/components/script-dialog";
import { GenerateDialog } from "@/components/generate-dialog";
import { useProject } from "@/lib/hooks/use-project";
import type { Generation } from "@/lib/types";

interface GenerateDialogState {
  objectId: string;
  objectType: string;
  defaultPrompt: string;
}

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const { characters, locations, scenes, canvasNodes } = useProject(projectId);
  const [generateDialog, setGenerateDialog] = useState<GenerateDialogState | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);

  const handleOpenGenerate = useCallback(
    (objectId: string, objectType: string) => {
      // Find the character's visual description for the default prompt
      const char = characters.find((c) => c.id === objectId);
      const bible = char?.bible as Record<string, unknown> | null;
      const visualDesc = (bible?.visual_description as string) || "";
      setGenerateDialog({ objectId, objectType, defaultPrompt: visualDesc });
    },
    [characters]
  );

  const handleGenerated = useCallback(
    (newGens: Array<{ id: string; cloud_url: string }>) => {
      const objectType = (generateDialog?.objectType || "character_face") as Generation["object_type"];
      setGenerations((prev) => [
        ...prev,
        ...newGens.map((g): Generation => ({
          id: g.id,
          cloud_url: g.cloud_url,
          object_id: generateDialog?.objectId || "",
          object_type: objectType,
          prompt: "",
          local_path: null,
          local_synced: false,
          starred: false,
          conditioning_refs: [],
          created_at: new Date().toISOString(),
        })),
      ]);
    },
    [generateDialog]
  );

  return (
    <CanvasProvider>
      {!projectId && <ScriptDialog onIngest={setProjectId} />}
      {generateDialog && (
        <GenerateDialog
          objectId={generateDialog.objectId}
          objectType={generateDialog.objectType}
          defaultPrompt={generateDialog.defaultPrompt}
          onClose={() => setGenerateDialog(null)}
          onGenerated={handleGenerated}
        />
      )}
      <div className="h-screen flex flex-col">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <NodeBrowser
            characters={characters.map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status,
            }))}
            locations={locations.map((l) => ({
              id: l.id,
              name: l.name,
              status: l.status,
            }))}
            scenes={scenes.map((s) => ({
              id: s.id,
              name: s.name,
              status: "empty" as const,
            }))}
          />
          <CanvasPanel
            characters={characters}
            locations={locations}
            scenes={scenes}
            canvasNodes={canvasNodes}
            generations={generations}
            onOpenGenerate={handleOpenGenerate}
          />
          <InspectorPanel
            characters={characters}
            locations={locations}
            scenes={scenes}
          />
        </div>
      </div>
    </CanvasProvider>
  );
}
