"use client";

import { useState } from "react";

interface GenerateDialogProps {
  defaultPrompt: string;
  objectId: string;
  objectType: string;
  style?: string;
  onClose: () => void;
  /** Called immediately with 4 placeholder IDs, then again as each image completes */
  onGenerateStart: (placeholders: Array<{ id: string; cloud_url: string }>) => void;
  onGenerateComplete: (generations: Array<{ id: string; cloud_url: string }>) => void;
}

export function GenerateDialog({
  defaultPrompt,
  objectId,
  objectType,
  style,
  onClose,
  onGenerateStart,
  onGenerateComplete,
}: GenerateDialogProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    // Create 4 placeholder entries immediately
    const placeholders = Array.from({ length: 4 }, (_, i) => ({
      id: `pending-${Date.now()}-${i}`,
      cloud_url: "",
    }));

    // Notify parent to show loading cards
    onGenerateStart(placeholders);

    // Close dialog immediately
    onClose();

    // Fire API call in background
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectId,
        objectType,
        prompt: prompt.trim(),
        style,
        count: 4,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Generation failed");
        return res.json();
      })
      .then((data) => {
        // Replace placeholders with real generations
        onGenerateComplete(data.generations);

        // Fire audience evaluation for each (async, don't block)
        for (const gen of data.generations) {
          fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generationId: gen.id }),
          }).catch(console.error);
        }
      })
      .catch((err) => {
        console.error("Generation error:", err);
      });
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
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-ui border border-jc-border text-jc-text-2 hover:text-jc-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="flex-1 py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 bg-jc-red text-jc-text hover:bg-jc-red-hover"
          >
            Generate 4 Variants
          </button>
        </div>
      </div>
    </div>
  );
}
