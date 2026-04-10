"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CanvasProvider } from "@/components/providers/canvas-provider";
import { Toolbar } from "@/components/toolbar";
import { NodeBrowser } from "@/components/sidebar/node-browser";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { ScriptDialog } from "@/components/script-dialog";
import { GenerateDialog } from "@/components/generate-dialog";
import { NewEntityDialog } from "@/components/new-entity-dialog";
import { useProject } from "@/lib/hooks/use-project";
import type { Generation } from "@/lib/types";

interface GenerateDialogState {
  objectId: string;
  objectType: string;
  defaultPrompt: string;
}

const PROJECT_ID_KEY = "jc_project_id";

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const projectData = useProject(projectId);
  const { characters, locations, scenes, canvasNodes, reactions } = projectData;
  const [generateDialog, setGenerateDialog] = useState<GenerateDialogState | null>(null);
  const [showNewEntity, setShowNewEntity] = useState(false);
  // Merge persisted generations from DB with newly generated ones (before next fetch)
  const [newGenerations, setNewGenerations] = useState<Generation[]>([]);
  const generations = [...projectData.generations, ...newGenerations.filter(
    (ng) => !projectData.generations.some((pg) => pg.id === ng.id)
  )];

  // On mount: resolve project from URL, localStorage, or most recent
  useEffect(() => {
    const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    async function loadProject() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) { setLoadingProject(false); return; }
        const data = await res.json();
        const projects = data.projects || [];

        if (projects.length === 0) { setLoadingProject(false); return; }

        // 1. Try to match project from URL path
        const pathSegments = window.location.pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          const projectSlug = pathSegments[0];
          const matched = projects.find((p: { name: string }) => slugify(p.name) === projectSlug);
          if (matched) {
            setProjectId(matched.id);
            localStorage.setItem(PROJECT_ID_KEY, matched.id);
            setLoadingProject(false);
            return;
          }
        }

        // 2. Fall back to localStorage
        const savedId = localStorage.getItem(PROJECT_ID_KEY);
        if (savedId && projects.some((p: { id: string }) => p.id === savedId)) {
          setProjectId(savedId);
          setLoadingProject(false);
          return;
        }

        // 3. Fall back to most recent
        setProjectId(projects[0].id);
        localStorage.setItem(PROJECT_ID_KEY, projects[0].id);
      } catch {
        // No projects yet — will show script dialog
      }
      setLoadingProject(false);
    }
    loadProject();
  }, []);

  // Save projectId to localStorage when it changes
  const handleSetProject = useCallback((id: string) => {
    setProjectId(id);
    localStorage.setItem(PROJECT_ID_KEY, id);
  }, []);

  // Resolve URL path to canvas state once project data loads
  const urlResolved = useRef(false);

  useEffect(() => {
    if (urlResolved.current || !projectData.project || characters.length === 0) return;

    const pendingRaw = sessionStorage.getItem("jc_pending_path");
    if (!pendingRaw) {
      urlResolved.current = true;
      return;
    }

    const segments: string[] = JSON.parse(pendingRaw);
    sessionStorage.removeItem("jc_pending_path");
    urlResolved.current = true;

    // segments[0] = project slug (already loaded)
    // segments[1] = character/location/scene name slug
    // segments[2] = face/body/wardrobe

    if (segments.length < 2) return;

    const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Find matching entity
    const entitySlug = segments[1];
    const char = characters.find((c) => slugify(c.name) === entitySlug);
    const loc = locations.find((l) => slugify(l.name) === entitySlug);
    const scene = scenes.find((s) => slugify(s.name) === entitySlug);

    // We need to use the canvas context to drill down
    // Since we can't call drillDown from outside the provider, we'll dispatch a custom event
    const drillEvents: Array<{ level: string; id: string; label: string }> = [];

    if (char) {
      drillEvents.push({ level: "character", id: char.id, label: char.name });
      if (segments[2]) {
        const subLevel = segments[2] as string;
        if (["face", "body", "wardrobe"].includes(subLevel)) {
          drillEvents.push({ level: subLevel, id: char.id, label: subLevel.charAt(0).toUpperCase() + subLevel.slice(1) });
        }
      }
    } else if (loc) {
      drillEvents.push({ level: "location", id: loc.id, label: loc.name });
    } else if (scene) {
      drillEvents.push({ level: "scene", id: scene.id, label: scene.name });
    }

    // Dispatch after a short delay to let canvas mount
    if (drillEvents.length > 0) {
      setTimeout(() => {
        drillEvents.forEach((evt, i) => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("jc-drill", { detail: evt }));
          }, i * 150);
        });
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData.project?.id, characters.length]);

  const handleOpenGenerate = useCallback(
    (objectId: string, objectType: string) => {
      let defaultPrompt = "";

      if (objectType === "character_face") {
        const char = characters.find((c) => c.id === objectId);
        const bible = char?.bible as Record<string, unknown> | null;
        const visualDesc = (bible?.visual_description as string) || "";
        defaultPrompt = `Close-up headshot portrait, head and shoulders only, neutral background. ${visualDesc}`;
      } else if (objectType === "character_body") {
        const char = characters.find((c) => c.id === objectId);
        const bible = char?.bible as Record<string, unknown> | null;
        const visualDesc = (bible?.visual_description as string) || "";
        defaultPrompt = `Full body portrait, standing pose, neutral background. ${visualDesc}`;
      } else if (objectType === "location") {
        const loc = locations.find((l) => l.id === objectId);
        const bible = loc?.bible as Record<string, unknown> | null;
        const visualDesc = (bible?.visual_description as string) || "";
        defaultPrompt = `Wide establishing shot, cinematic composition. ${visualDesc}`;
      } else if (objectType === "scene") {
        const scene = scenes.find((s) => s.id === objectId);
        const desc = scene?.description || "";
        // Include starred character faces and location in scene prompt
        const charNames = characters
          .filter((c) => scene?.character_ids?.includes(c.id))
          .map((c) => c.name);
        const loc = locations.find((l) => l.id === scene?.location_id);
        defaultPrompt = `Cinematic scene still. ${desc}. Characters present: ${charNames.join(", ") || "unknown"}. Location: ${loc?.name || "unknown"}.`;
      }

      setGenerateDialog({ objectId, objectType, defaultPrompt });
    },
    [characters, locations, scenes]
  );

  // Ref for refresh to avoid stale closure
  const refreshRef = useRef(projectData.refresh);
  refreshRef.current = projectData.refresh;

  // Listen for generate events from the dialog (uses window events to avoid stale closures)
  useEffect(() => {
    const handleStart = (e: Event) => {
      console.log("[page] received jc-generate-start");
      const { placeholders, objectId, objectType } = (e as CustomEvent).detail;
      setNewGenerations((prev) => [
        ...prev,
        ...placeholders.map((g: { id: string }): Generation => ({
          id: g.id,
          cloud_url: "",
          object_id: objectId,
          object_type: objectType as Generation["object_type"],
          prompt: "",
          local_path: null,
          local_synced: false,
          starred: false,
          conditioning_refs: [],
          created_at: new Date().toISOString(),
        })),
      ]);
    };

    const handleComplete = (e: Event) => {
      console.log("[page] received jc-generate-complete");
      const { generations: realGens, objectId, objectType } = (e as CustomEvent).detail;
      setNewGenerations((prev) => [
        ...prev.filter((g) => !g.id.startsWith("pending-")),
        ...realGens.map((g: { id: string; cloud_url: string }): Generation => ({
          id: g.id,
          cloud_url: g.cloud_url,
          object_id: objectId,
          object_type: objectType as Generation["object_type"],
          prompt: "",
          local_path: null,
          local_synced: false,
          starred: false,
          conditioning_refs: [],
          created_at: new Date().toISOString(),
        })),
      ]);

      // Refresh immediately to pick up new generations from DB
      refreshRef.current();

      // Poll for reactions — evaluations take ~10-30s
      [10000, 25000, 45000].forEach((delay) => {
        setTimeout(() => refreshRef.current(), delay);
      });
    };

    // Evolve handler: adapt from a scored generation, then generate new variants
    const handleEvolve = async (e: Event) => {
      const { generationId, objectId, objectType } = (e as CustomEvent).detail;
      console.log("[page] evolving from", generationId);

      try {
        // Step 1: Get adaptation suggestions
        const adaptRes = await fetch("/api/adapt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId }),
        });

        if (!adaptRes.ok) throw new Error("Adaptation failed");
        const { adapted_prompt, strategy } = await adaptRes.json();
        console.log("[evolve] Strategy:", strategy);

        // Step 2: Create placeholders
        const placeholders = Array.from({ length: 2 }, (_, i) => ({
          id: `pending-${Date.now()}-${i}`,
          cloud_url: "",
        }));
        window.dispatchEvent(new CustomEvent("jc-generate-start", {
          detail: { placeholders, objectId, objectType },
        }));

        // Step 3: Generate with the adapted prompt
        const style = localStorage.getItem(`jc_style_${localStorage.getItem("jc_project_id")}`) || "35mm film";
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectId,
            objectType,
            prompt: adapted_prompt,
            style,
            count: 2,
            conditioningRefs: [generationId], // Track lineage
          }),
        });

        if (!genRes.ok) throw new Error("Generation failed");
        const genData = await genRes.json();

        // Step 4: Dispatch completion
        window.dispatchEvent(new CustomEvent("jc-generate-complete", {
          detail: { generations: genData.generations, objectId, objectType },
        }));

        // Step 5: Fire evaluations
        for (const gen of genData.generations) {
          fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generationId: gen.id }),
          }).catch(console.error);
        }
      } catch (err) {
        console.error("Evolve failed:", err);
      }
    };

    window.addEventListener("jc-generate-start", handleStart);
    window.addEventListener("jc-generate-complete", handleComplete);
    window.addEventListener("jc-evolve", handleEvolve);
    return () => {
      window.removeEventListener("jc-generate-start", handleStart);
      window.removeEventListener("jc-generate-complete", handleComplete);
      window.removeEventListener("jc-evolve", handleEvolve);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [falseNegativeAlert, setFalseNegativeAlert] = useState<{
    diagnosis: string;
    bible_updates: string[];
    confidence: number;
  } | null>(null);

  const handleStar = useCallback(
    async (generationId: string) => {
      const res = await fetch("/api/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, star: true }),
      });

      const data = await res.json();

      // Check for false negative detection
      if (data.falseNegative?.detected && data.falseNegative?.suggestion) {
        try {
          const suggestion = JSON.parse(data.falseNegative.suggestion);
          setFalseNegativeAlert(suggestion);
        } catch { /* ignore parse error */ }
      }

      projectData.refresh();
    },
    [projectData]
  );

  return (
    <CanvasProvider projectName={projectData.project?.name}>
      {!projectId && !loadingProject && <ScriptDialog onIngest={handleSetProject} />}
      {generateDialog && (
        <GenerateDialog
          objectId={generateDialog.objectId}
          objectType={generateDialog.objectType}
          defaultPrompt={generateDialog.defaultPrompt}
          style={projectId ? localStorage.getItem(`jc_style_${projectId}`) || "35mm film" : "35mm film"}
          onClose={() => setGenerateDialog(null)}
        />
      )}
      {showNewEntity && projectId && (
        <NewEntityDialog
          projectId={projectId}
          onClose={() => setShowNewEntity(false)}
          onCreated={() => projectData.refresh()}
        />
      )}

      {/* False Negative Alert — Bible Repair Suggestion */}
      {falseNegativeAlert && (
        <div className="fixed inset-0 bg-jc-bg/80 flex items-center justify-center z-50">
          <div className="bg-jc-surface border border-jc-warn rounded-lg w-[500px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-heading">⚠️</span>
              <h3 className="text-name text-jc-text font-medium">
                False Negative Detected
              </h3>
            </div>
            <p className="text-meta text-jc-text-2 mb-3">
              You starred an image that scored below the population average.
              The evaluation system may be missing something you see.
            </p>
            <div className="mb-3 p-3 rounded bg-jc-raised border border-jc-border">
              <div className="text-micro uppercase tracking-widest text-jc-warn mb-1">Diagnosis</div>
              <div className="text-body text-jc-text">{falseNegativeAlert.diagnosis}</div>
            </div>
            <div className="mb-3 p-3 rounded bg-jc-raised border border-jc-border">
              <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-1">Suggested Bible Updates</div>
              <ul className="text-body text-jc-text-2 list-disc list-inside space-y-1">
                {falseNegativeAlert.bible_updates?.map((update, i) => (
                  <li key={i}>{update}</li>
                ))}
              </ul>
            </div>
            <div className="text-micro text-jc-text-3 mb-3">
              Confidence: {falseNegativeAlert.confidence}/10
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFalseNegativeAlert(null)}
                className="flex-1 py-2 rounded text-ui border border-jc-border text-jc-text-2 hover:text-jc-text transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  // TODO: Apply bible updates automatically
                  setFalseNegativeAlert(null);
                }}
                className="flex-1 py-2 rounded text-ui font-medium bg-jc-warn text-jc-bg hover:opacity-90 transition-colors"
              >
                Apply to Bible
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="h-screen flex flex-col">
        <Toolbar
          currentProjectId={projectId}
          onSwitchProject={handleSetProject}
          onNewProject={() => {
            localStorage.removeItem(PROJECT_ID_KEY);
            setProjectId(null);
          }}
          onNewEntity={projectId ? () => setShowNewEntity(true) : undefined}
        />
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
            reactions={reactions}
            onOpenGenerate={handleOpenGenerate}
          />
          <InspectorPanel
            characters={characters}
            locations={locations}
            scenes={scenes}
            generations={generations}
            reactions={reactions}
            onStar={handleStar}
          />
        </div>
      </div>
    </CanvasProvider>
  );
}
