"use client";

import { useState, useRef, useCallback } from "react";
import { useCanvas } from "@/lib/store/canvas-store";
import type { Character, Location, Scene, Generation, AudienceReaction } from "@/lib/types";

type Tab = "inspector" | "chat";

interface InspectorPanelProps {
  characters?: Character[];
  locations?: Location[];
  scenes?: Scene[];
  generations?: Generation[];
  reactions?: AudienceReaction[];
  onStar?: (generationId: string) => void;
}

export function InspectorPanel({
  characters = [],
  locations = [],
  scenes = [],
  generations = [],
  reactions = [],
  onStar,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("inspector");
  const { selectedNodeId } = useCanvas();

  return (
    <div className="w-[260px] shrink-0 border-l border-jc-border bg-jc-surface flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-jc-border shrink-0">
        <button
          onClick={() => setActiveTab("inspector")}
          className={`flex-1 py-2 text-meta text-center transition-colors ${
            activeTab === "inspector"
              ? "text-jc-text border-b border-jc-red"
              : "text-jc-text-3 hover:text-jc-text-2"
          }`}
        >
          Inspector
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-meta text-center transition-colors ${
            activeTab === "chat"
              ? "text-jc-text border-b border-jc-red"
              : "text-jc-text-3 hover:text-jc-text-2"
          }`}
        >
          Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "inspector" ? (
          <InspectorContent
            selectedNodeId={selectedNodeId}
            characters={characters}
            locations={locations}
            scenes={scenes}
            generations={generations}
            reactions={reactions}
            onStar={onStar}
          />
        ) : (
          <ChatContent selectedNodeId={selectedNodeId} />
        )}
      </div>
    </div>
  );
}

// --- Bible field renderer ---

function BibleField({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;

  if (Array.isArray(value)) {
    return (
      <div className="mb-2">
        <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-0.5">
          {label}
        </div>
        <ul className="text-body text-jc-text-2 list-disc list-inside">
          {value.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-0.5">
        {label}
      </div>
      <div className="text-body text-jc-text-2">{String(value)}</div>
    </div>
  );
}

// --- Inspector tab ---

function InspectorContent({
  selectedNodeId,
  characters,
  locations,
  scenes,
  generations,
  reactions,
  onStar,
}: {
  selectedNodeId: string | null;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  generations: Generation[];
  reactions: AudienceReaction[];
  onStar?: (generationId: string) => void;
}) {
  if (!selectedNodeId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-meta text-jc-text-3 text-center">
          Select a node on the canvas
          <br />
          to inspect it
        </p>
      </div>
    );
  }

  // Find the selected entity
  const character = characters.find((c) => c.id === selectedNodeId);
  const location = locations.find((l) => l.id === selectedNodeId);
  const scene = scenes.find((s) => s.id === selectedNodeId);

  if (character) {
    const bible = character.bible as Record<string, unknown> | null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-micro uppercase tracking-widest text-jc-red">
            Character
          </span>
          <span className="text-micro uppercase tracking-widest text-jc-text-3">
            {character.status}
          </span>
        </div>
        <div className="text-name text-jc-text font-medium mb-3">
          {character.name}
        </div>
        {bible && (
          <div>
            <BibleField label="Role" value={bible.role} />
            <BibleField label="Archetype" value={bible.archetype} />
            <BibleField label="Essence" value={bible.essence} />
            <BibleField label="Wound" value={bible.wound} />
            <BibleField label="Desire" value={bible.desire} />
            <BibleField label="Fear" value={bible.fear} />
            <BibleField label="Notable Traits" value={bible.notable_traits} />
            <BibleField
              label="Visual Description"
              value={bible.visual_description}
            />
            <BibleField label="Voice" value={bible.voice} />
          </div>
        )}
      </div>
    );
  }

  if (location) {
    const bible = location.bible as Record<string, unknown> | null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-micro uppercase tracking-widest text-jc-confirm">
            Location
          </span>
          <span className="text-micro uppercase tracking-widest text-jc-text-3">
            {location.status}
          </span>
        </div>
        <div className="text-name text-jc-text font-medium mb-3">
          {location.name}
        </div>
        {bible && (
          <div>
            <BibleField label="Setting" value={bible.setting} />
            <BibleField label="Period" value={bible.period} />
            <BibleField label="Tone" value={bible.tone} />
            <BibleField label="Meaning" value={bible.meaning_in_story} />
            <BibleField
              label="Visual Description"
              value={bible.visual_description}
            />
            <BibleField label="Atmosphere" value={bible.atmosphere} />
          </div>
        )}
      </div>
    );
  }

  if (scene) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-micro uppercase tracking-widest text-jc-warn">
            Scene
          </span>
        </div>
        <div className="text-name text-jc-text font-medium mb-3">
          {scene.name}
        </div>
        {scene.description && (
          <BibleField label="Description" value={scene.description} />
        )}
      </div>
    );
  }

  // Check if selectedNodeId is a generation ID
  const generation = generations.find((g) => g.id === selectedNodeId);
  if (generation) {
    const genReactions = reactions.filter((r) => r.generation_id === generation.id);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-micro uppercase tracking-widest text-jc-red">
            Generated Image
          </span>
          {onStar && (
            <button
              onClick={() => onStar(generation.id)}
              className={`text-ui transition-colors ${
                generation.starred
                  ? "text-jc-red"
                  : "text-jc-text-3 hover:text-jc-red"
              }`}
            >
              {generation.starred ? "★ Starred" : "☆ Star"}
            </button>
          )}
        </div>
        {generation.cloud_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={generation.cloud_url}
            alt="Generated"
            className="w-full rounded mb-3"
          />
        )}
        {genReactions.length === 0 && (
          <p className="text-meta text-jc-text-3">Audience reactions pending...</p>
        )}
        {genReactions.map((r) => {
          const rxn = r.reaction as Record<string, unknown>;
          const isNeural = r.segment === "neural";

          if (isNeural) {
            // Neural response card — distinct brain-themed treatment
            return (
              <div
                key={r.id}
                className="mb-3 p-2 rounded border"
                style={{ background: "rgba(88, 28, 135, 0.15)", borderColor: "rgba(147, 51, 234, 0.3)" }}
              >
                <div className="text-micro uppercase tracking-widest mb-1" style={{ color: "#a78bfa" }}>
                  🧠 Neural Response
                </div>
                <div className="text-body text-jc-text-2 mb-1.5 italic">
                  {String(rxn.instant_reaction || "")}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-micro">
                  <span style={{ color: "#a78bfa" }}>Visual Salience</span>
                  <span className="text-jc-text">{String(rxn.visual_salience ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Face Recognition</span>
                  <span className="text-jc-text">{String(rxn.face_recognition ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Emotional Arousal</span>
                  <span className="text-jc-text">{String(rxn.emotional_arousal ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Reward Anticipation</span>
                  <span className="text-jc-text">{String(rxn.reward_anticipation ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Narrative Engage.</span>
                  <span className="text-jc-text">{String(rxn.narrative_engagement ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Cognitive Attn.</span>
                  <span className="text-jc-text">{String(rxn.cognitive_attention ?? "-")}/10</span>
                  <span style={{ color: "#a78bfa" }}>Overall</span>
                  <span className="text-jc-text font-medium">{String(rxn.overall_engagement ?? "-")}/10</span>
                </div>
              </div>
            );
          }

          // Standard persona reaction card
          return (
            <div
              key={r.id}
              className="mb-3 p-2 rounded bg-jc-raised border border-jc-border"
            >
              <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-1">
                {r.segment.replace("_", " ")}
              </div>
              <div className="text-body text-jc-text-2 mb-1 italic">
                {String(rxn.instant_reaction || "")}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-micro">
                <span className="text-jc-text-3">Trust</span>
                <span className="text-jc-text">{String(rxn.trust_score ?? "-")}/10</span>
                <span className="text-jc-text-3">Distinct</span>
                <span className="text-jc-text">{String(rxn.distinctiveness ?? "-")}/10</span>
                <span className="text-jc-text-3">Compulsion</span>
                <span className="text-jc-text">{String(rxn.compulsion_score ?? "-")}/10</span>
                <span className="text-jc-text-3">Would watch</span>
                <span className="text-jc-text">{rxn.would_watch ? "Yes" : "No"}</span>
              </div>
              {!!rxn.character_truth && (
                <div className="mt-1 text-body text-jc-text-2">
                  {String(rxn.character_truth)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="text-meta text-jc-text-3">No data found for this node.</div>
  );
}

// --- Chat tab ---

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ChatContent({ selectedNodeId }: { selectedNodeId: string | null }) {
  const mode = selectedNodeId ? "in-context" : "project-wide";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: selectedNodeId
            ? `Selected node: ${selectedNodeId}`
            : "Project-wide context",
          mode,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: assistantContent },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not get a response." },
      ]);
    } finally {
      setLoading(false);
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [input, loading, mode, selectedNodeId]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-micro uppercase tracking-widest text-jc-text-3 mb-2">
        {mode === "in-context" ? "In-context Chat" : "Project Chat"}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.length === 0 && (
          <p className="text-meta text-jc-text-3">
            {mode === "in-context"
              ? "Ask anything about the selected node."
              : "Ask anything about the project."}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-body rounded px-2 py-1 ${
              msg.role === "user"
                ? "bg-jc-raised text-jc-text"
                : "text-jc-text-2"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="text-body text-jc-text-3 animate-pulse">...</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "in-context"
              ? "Ask about this node..."
              : "Ask about the project..."
          }
          className="w-full bg-jc-raised border border-jc-border rounded px-2 py-1.5 text-ui text-jc-text placeholder:text-jc-text-3 focus:outline-none focus:border-jc-border-em"
          disabled={loading}
        />
      </form>
    </div>
  );
}
