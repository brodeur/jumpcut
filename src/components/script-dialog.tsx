"use client";

import { useState } from "react";

interface ScriptDialogProps {
  onIngest: (projectId: string) => void;
}

const VISUAL_STYLES = [
  { value: "35mm film", label: "35mm Film" },
  { value: "IMAX 70mm", label: "IMAX" },
  { value: "anime cel animation", label: "Anime" },
  { value: "digital cinema (RED Monstro 8K)", label: "Digital Cinema" },
  { value: "3D CGI render (photorealistic)", label: "3D CGI" },
] as const;

type Mode = "choose" | "script" | "empty";

export function ScriptDialog({ onIngest }: ScriptDialogProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [scriptText, setScriptText] = useState("");
  const [projectName, setProjectName] = useState("");
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0].value);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmitScript = async () => {
    if (!scriptText.trim()) return;
    setLoading(true);
    setStatus("Extracting structure from script...");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: scriptText.trim(),
          projectName: projectName.trim() || undefined,
          visualStyle,
          userId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ingestion failed");
      }

      const data = await res.json();
      if (data.projectId) {
        localStorage.setItem(`jc_style_${data.projectId}`, visualStyle);
      }
      setStatus(
        `Done! ${data.characterCount} characters, ${data.locationCount} locations, ${data.sceneCount} scenes`
      );
      setTimeout(() => onIngest(data.projectId), 1000);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const handleCreateEmpty = async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    setStatus("Creating project...");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: "(empty project)",
          projectName: projectName.trim(),
          visualStyle,
          userId: "00000000-0000-0000-0000-000000000000",
          emptyProject: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }

      const data = await res.json();
      if (data.projectId) {
        localStorage.setItem(`jc_style_${data.projectId}`, visualStyle);
      }
      onIngest(data.projectId);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-jc-bg/80 flex items-center justify-center z-50">
      <div className="bg-jc-surface border border-jc-border rounded-lg w-[600px] max-h-[80vh] flex flex-col p-6">
        <h2 className="text-heading text-jc-text font-medium mb-1">
          <span>JUMP</span>
          <span className="text-jc-red">{"//"}</span>
          <span>CUT</span>
        </h2>

        {/* Mode chooser */}
        {mode === "choose" && (
          <>
            <p className="text-meta text-jc-text-2 mb-6">
              Start a new project.
            </p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setMode("script")}
                className="flex-1 p-4 rounded border border-jc-border bg-jc-raised hover:bg-jc-surface transition-colors text-left"
              >
                <div className="text-name text-jc-text font-medium mb-1">From Script</div>
                <div className="text-meta text-jc-text-3">
                  Paste a script and auto-extract characters, locations, and scenes.
                </div>
              </button>
              <button
                onClick={() => setMode("empty")}
                className="flex-1 p-4 rounded border border-jc-border bg-jc-raised hover:bg-jc-surface transition-colors text-left"
              >
                <div className="text-name text-jc-text font-medium mb-1">Empty Project</div>
                <div className="text-meta text-jc-text-3">
                  Start blank and add characters, locations, and scenes manually.
                </div>
              </button>
            </div>
          </>
        )}

        {/* Script mode */}
        {mode === "script" && (
          <>
            <button
              onClick={() => setMode("choose")}
              className="text-meta text-jc-text-3 hover:text-jc-text mb-3 text-left"
              disabled={loading}
            >
              ← Back
            </button>

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name (optional)"
              className="w-full bg-jc-raised border border-jc-border rounded px-3 py-2 text-ui text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em mb-3"
              disabled={loading}
            />

            <div className="mb-3">
              <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-1.5">Visual Style</div>
              <div className="flex gap-2 flex-wrap">
                {VISUAL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setVisualStyle(s.value)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded text-meta transition-colors ${
                      visualStyle === s.value
                        ? "bg-jc-red text-jc-text"
                        : "bg-jc-raised border border-jc-border text-jc-text-2 hover:text-jc-text"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your script here..."
              className="w-full flex-1 min-h-[200px] bg-jc-raised border border-jc-border rounded px-3 py-2 text-body font-mono text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em resize-none mb-4"
              disabled={loading}
            />

            {status && <p className="text-meta text-jc-text-2 mb-3">{status}</p>}

            <button
              onClick={handleSubmitScript}
              disabled={loading || !scriptText.trim()}
              className="w-full py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-jc-red text-jc-text hover:bg-jc-red-hover"
            >
              {loading ? "Processing..." : "Ingest Script"}
            </button>
          </>
        )}

        {/* Empty project mode */}
        {mode === "empty" && (
          <>
            <button
              onClick={() => setMode("choose")}
              className="text-meta text-jc-text-3 hover:text-jc-text mb-3 text-left"
              disabled={loading}
            >
              ← Back
            </button>

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full bg-jc-raised border border-jc-border rounded px-3 py-2 text-ui text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em mb-3"
              disabled={loading}
              autoFocus
            />

            <div className="mb-4">
              <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-1.5">Visual Style</div>
              <div className="flex gap-2 flex-wrap">
                {VISUAL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setVisualStyle(s.value)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded text-meta transition-colors ${
                      visualStyle === s.value
                        ? "bg-jc-red text-jc-text"
                        : "bg-jc-raised border border-jc-border text-jc-text-2 hover:text-jc-text"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {status && <p className="text-meta text-jc-text-2 mb-3">{status}</p>}

            <button
              onClick={handleCreateEmpty}
              disabled={loading || !projectName.trim()}
              className="w-full py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-jc-red text-jc-text hover:bg-jc-red-hover"
            >
              {loading ? "Creating..." : "Create Empty Project"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
