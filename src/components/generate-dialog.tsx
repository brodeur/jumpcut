"use client";

import { useState } from "react";

interface GenerateDialogProps {
  defaultPrompt: string;
  objectId: string;
  objectType: string;
  onClose: () => void;
  onGenerated: (generations: Array<{ id: string; cloud_url: string }>) => void;
}

export function GenerateDialog({
  defaultPrompt,
  objectId,
  objectType,
  onClose,
  onGenerated,
}: GenerateDialogProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus("Generating 4 images via fal.ai...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectId,
          objectType,
          prompt: prompt.trim(),
          count: 4,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setStatus(`Generated ${data.generations.length} images. Running audience evaluation...`);

      // Fire audience evaluation for each generation (async, don't block)
      for (const gen of data.generations) {
        fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: gen.id }),
        }).catch(console.error);
      }

      onGenerated(data.generations);
      setStatus("Done!");
      setTimeout(onClose, 500);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-jc-bg/80 flex items-center justify-center z-50">
      <div className="bg-jc-surface border border-jc-border rounded-lg w-[500px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-name text-jc-text font-medium">
            Generate Likenesses
          </h3>
          <button
            onClick={onClose}
            className="text-jc-text-3 hover:text-jc-text text-ui"
          >
            ✕
          </button>
        </div>

        <p className="text-meta text-jc-text-3 mb-3">
          Edit the prompt below, then generate 4 variants. The synthetic
          audience will evaluate each one automatically.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 bg-jc-raised border border-jc-border rounded px-3 py-2 text-body font-mono text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em resize-none mb-3"
          disabled={loading}
        />

        {status && (
          <p className="text-meta text-jc-text-2 mb-3">{status}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-ui border border-jc-border text-jc-text-2 hover:text-jc-text transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex-1 py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 bg-jc-red text-jc-text hover:bg-jc-red-hover"
          >
            {loading ? "Generating..." : "Generate 4 Variants"}
          </button>
        </div>
      </div>
    </div>
  );
}
