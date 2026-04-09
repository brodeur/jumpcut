"use client";

import { useState, useRef, useCallback } from "react";
import { useCanvas } from "@/lib/store/canvas-store";
import type { Character, Location, Scene } from "@/lib/types";

type Tab = "inspector" | "chat";

interface InspectorPanelProps {
  characters?: Character[];
  locations?: Location[];
  scenes?: Scene[];
}

export function InspectorPanel({
  characters = [],
  locations = [],
  scenes = [],
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
}: {
  selectedNodeId: string | null;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
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
