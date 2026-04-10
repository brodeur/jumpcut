"use client";

import { useState } from "react";
import { User, MapPin, Clapperboard } from "lucide-react";

interface NewEntityDialogProps {
  projectId: string;
  characters?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
}

const ENTITY_TYPES = [
  { type: "character" as const, label: "Character", Icon: User, color: "#CC3300", descPlaceholder: "Describe this character — role, age, appearance, personality, backstory..." },
  { type: "location" as const, label: "Location", Icon: MapPin, color: "#2A6B3C", descPlaceholder: "Describe this location — setting, atmosphere, time period, visual details..." },
  { type: "scene" as const, label: "Scene", Icon: Clapperboard, color: "#8A6200", descPlaceholder: "Describe what happens in this scene..." },
];

export function NewEntityDialog({ projectId, characters = [], locations = [], onClose, onCreated }: NewEntityDialogProps) {
  const [selectedType, setSelectedType] = useState<"character" | "location" | "scene" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;
    setLoading(true);
    setStatus(description.trim() ? "Creating and generating bible..." : "Creating...");

    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: selectedType,
          name: name.trim(),
          description: description.trim() || undefined,
          ...(selectedType === "scene" && {
            characterIds: selectedCharIds,
            locationId: selectedLocId,
          }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Creation failed");
      }

      onCreated();
      onClose();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      setLoading(false);
    }
  };

  const typeConfig = ENTITY_TYPES.find((t) => t.type === selectedType);

  return (
    <div className="fixed inset-0 bg-jc-bg/80 flex items-center justify-center z-50">
      <div className="bg-jc-surface border border-jc-border rounded-lg w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-name text-jc-text font-medium">
            {selectedType ? `New ${typeConfig?.label}` : "Add to Project"}
          </h3>
          <button onClick={onClose} className="text-jc-text-3 hover:text-jc-text text-ui">
            ✕
          </button>
        </div>

        {/* Type selector */}
        {!selectedType && (
          <div className="flex gap-3">
            {ENTITY_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => setSelectedType(t.type)}
                className="flex-1 p-4 rounded border border-jc-border bg-jc-raised hover:bg-jc-surface transition-colors flex flex-col items-center gap-2"
              >
                <t.Icon size={24} color={t.color} />
                <span className="text-ui text-jc-text">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Entity form */}
        {selectedType && (
          <>
            <button
              onClick={() => setSelectedType(null)}
              className="text-meta text-jc-text-3 hover:text-jc-text mb-3 text-left"
              disabled={loading}
            >
              ← Back
            </button>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${typeConfig?.label} name`}
              className="w-full bg-jc-raised border border-jc-border rounded px-3 py-2 text-ui text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em mb-3"
              disabled={loading}
              autoFocus
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={typeConfig?.descPlaceholder}
              className="w-full h-32 bg-jc-raised border border-jc-border rounded px-3 py-2 text-body text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em resize-none mb-3"
              disabled={loading}
            />

            {/* Scene-specific: character and location pickers */}
            {selectedType === "scene" && (
              <>
                {characters.length > 0 && (
                  <div className="mb-3">
                    <label className="text-micro uppercase tracking-widest text-jc-text-3 block mb-1">Characters in scene</label>
                    <div className="flex flex-wrap gap-2">
                      {characters.map((c) => {
                        const selected = selectedCharIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCharIds((prev) =>
                              selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            )}
                            disabled={loading}
                            className={`px-3 py-1 rounded text-ui border transition-colors ${
                              selected
                                ? "border-jc-red bg-jc-red/20 text-jc-text"
                                : "border-jc-border bg-jc-raised text-jc-text-2 hover:text-jc-text"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {locations.length > 0 && (
                  <div className="mb-3">
                    <label className="text-micro uppercase tracking-widest text-jc-text-3 block mb-1">Location</label>
                    <div className="flex flex-wrap gap-2">
                      {locations.map((l) => {
                        const selected = selectedLocId === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelectedLocId(selected ? null : l.id)}
                            disabled={loading}
                            className={`px-3 py-1 rounded text-ui border transition-colors ${
                              selected
                                ? "border-green-600 bg-green-900/30 text-jc-text"
                                : "border-jc-border bg-jc-raised text-jc-text-2 hover:text-jc-text"
                            }`}
                          >
                            {l.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-micro text-jc-text-3 mb-3">
              {selectedType !== "scene"
                ? "If you provide a description, a bible will be auto-generated via Claude."
                : "Select characters and a location, then describe what happens."}
            </p>

            {status && <p className="text-meta text-jc-text-2 mb-3">{status}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded text-ui border border-jc-border text-jc-text-2 hover:text-jc-text transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 py-2 rounded text-ui font-medium transition-colors disabled:opacity-30 bg-jc-red text-jc-text hover:bg-jc-red-hover"
              >
                {loading ? "Creating..." : `Create ${typeConfig?.label}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
