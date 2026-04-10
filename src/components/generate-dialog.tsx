"use client";

import { useState } from "react";
import type { CharacterRefOption } from "@/app/[[...path]]/page";

const REF_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  character_body: "Body",
  character_face: "Face",
};

interface GenerateDialogProps {
  defaultPrompt: string;
  objectId: string;
  objectType: string;
  style?: string;
  imageUrls?: string[];
  /** Scene-only: per-character reference options for wardrobe picker */
  characterRefs?: CharacterRefOption[];
  /** Scene-only: location ref always included */
  locationRefUrl?: string;
  onClose: () => void;
}

export function GenerateDialog({
  defaultPrompt,
  objectId,
  objectType,
  style,
  imageUrls = [],
  characterRefs,
  locationRefUrl,
  onClose,
}: GenerateDialogProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);

  // Per-character selected reference URL (for scene picker)
  const [selectedRefs, setSelectedRefs] = useState<Record<string, string | null>>(() => {
    if (!characterRefs) return {};
    const initial: Record<string, string | null> = {};
    for (const cr of characterRefs) {
      initial[cr.characterId] = cr.defaultUrl;
    }
    return initial;
  });

  const isScene = objectType === "scene" && characterRefs && characterRefs.length > 0;

  // Build final imageUrls: for scenes, assemble from picker selections + location
  const getFinalImageUrls = (): string[] => {
    if (!isScene) return imageUrls;
    const urls: string[] = [];
    for (const cr of characterRefs!) {
      const selected = selectedRefs[cr.characterId];
      if (selected) urls.push(selected);
    }
    if (locationRefUrl) urls.push(locationRefUrl);
    return urls;
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    const finalImageUrls = getFinalImageUrls();

    // Create 2 placeholder entries immediately
    const placeholders = Array.from({ length: 2 }, (_, i) => ({
      id: `pending-${Date.now()}-${i}`,
      cloud_url: "",
    }));

    // Dispatch start event with placeholders + context
    console.log("[generate] dispatching jc-generate-start", objectId, objectType);
    window.dispatchEvent(new CustomEvent("jc-generate-start", {
      detail: { placeholders, objectId, objectType },
    }));

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
        count: 2,
        imageUrls: finalImageUrls,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Generation failed");
        return res.json();
      })
      .then((data) => {
        // Dispatch completion event
        console.log("[generate] dispatching jc-generate-complete", data.generations.length, "images");
        window.dispatchEvent(new CustomEvent("jc-generate-complete", {
          detail: { generations: data.generations, objectId, objectType },
        }));

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
      <div className="bg-jc-surface border border-jc-border rounded-lg w-[560px] max-h-[80vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-name text-jc-text font-medium">
            {isScene ? "Generate Scene" : "Generate Likenesses"}
          </h3>
          <button
            onClick={onClose}
            className="text-jc-text-3 hover:text-jc-text text-ui"
          >
            ✕
          </button>
        </div>

        <p className="text-meta text-jc-text-3 mb-3">
          Edit the prompt below, then generate 2 variants. The synthetic
          audience will evaluate each one automatically.
        </p>

        {/* Scene: per-character reference picker */}
        {isScene && (
          <div className="mb-3 space-y-3">
            {characterRefs!.map((cr) => (
              <div key={cr.characterId} className="p-2 rounded bg-jc-raised border border-jc-border">
                <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-2">
                  {cr.characterName}
                  {cr.options.length === 0 && <span className="ml-1 text-jc-text-3/50">— no images yet</span>}
                </div>
                {cr.options.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {cr.options.map((opt, i) => {
                      const isSelected = selectedRefs[cr.characterId] === opt.url;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedRefs((prev) => ({
                            ...prev,
                            [cr.characterId]: isSelected ? null : opt.url,
                          }))}
                          className="flex-shrink-0 relative group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={opt.url}
                            alt={`${cr.characterName} ${opt.type}`}
                            className={`h-16 w-16 rounded object-cover border-2 transition-colors ${
                              isSelected
                                ? "border-jc-red"
                                : "border-jc-border group-hover:border-jc-border-em"
                            }`}
                          />
                          <span className="absolute bottom-0 left-0 right-0 text-center bg-black/70 text-[8px] text-jc-text-2 py-0.5 rounded-b">
                            {REF_TYPE_LABELS[opt.type] || opt.type}
                            {opt.starred && " ★"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {locationRefUrl && (
              <div className="p-2 rounded bg-jc-raised border border-jc-border">
                <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-2">Location</div>
                <div className="flex gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={locationRefUrl} alt="Location" className="h-12 rounded border border-green-800 object-cover" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Non-scene: simple reference image row */}
        {!isScene && imageUrls.length > 0 && (
          <div className="mb-3 p-2 rounded bg-jc-raised border border-jc-border">
            <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-2">Reference images ({imageUrls.length})</div>
            <div className="flex gap-2 overflow-x-auto">
              {imageUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Ref ${i + 1}`} className="h-12 rounded border border-jc-border object-cover flex-shrink-0" />
              ))}
            </div>
          </div>
        )}

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
            Generate Variants
          </button>
        </div>
      </div>
    </div>
  );
}
