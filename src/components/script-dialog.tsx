"use client";

import { useState } from "react";

interface ScriptDialogProps {
  onIngest: (projectId: string) => void;
}

export function ScriptDialog({ onIngest }: ScriptDialogProps) {
  const [scriptText, setScriptText] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
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
          // TODO: Replace with real auth user ID
          userId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ingestion failed");
      }

      const data = await res.json();
      setStatus(
        `Done! ${data.characterCount} characters, ${data.locationCount} locations, ${data.sceneCount} scenes`
      );

      setTimeout(() => onIngest(data.projectId), 1000);
    } catch (err) {
      setStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
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
        <p className="text-meta text-jc-text-2 mb-4">
          Paste a script to begin. The system will extract characters, locations,
          and scenes, then generate bibles for each.
        </p>

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project name (optional)"
          className="w-full bg-jc-raised border border-jc-border rounded px-3 py-2 text-ui text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em mb-3"
          disabled={loading}
        />

        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Paste your script here..."
          className="w-full flex-1 min-h-[200px] bg-jc-raised border border-jc-border rounded px-3 py-2 text-body font-mono text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em resize-none mb-4"
          disabled={loading}
        />

        {status && (
          <p className="text-meta text-jc-text-2 mb-3">{status}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !scriptText.trim()}
          className="w-full py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-jc-red text-jc-text hover:bg-jc-red-hover"
        >
          {loading ? "Processing..." : "Ingest Script"}
        </button>
      </div>
    </div>
  );
}
