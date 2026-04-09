"use client";

import { useCanvas } from "@/lib/store/canvas-store";
import type { NodeStatus } from "@/lib/types";

interface NodeItem {
  id: string;
  name: string;
  status: NodeStatus;
}

interface NodeBrowserProps {
  characters: NodeItem[];
  locations: NodeItem[];
  scenes: NodeItem[];
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  empty: "bg-jc-border-em",
  generating: "bg-jc-text-3 animate-pulse",
  generated: "bg-jc-border-em",
  reacted: "bg-jc-red-muted",
  starred: "bg-jc-red",
};

function NodeSection({
  title,
  items,
  onSelect,
  onNavigate,
  selectedId,
}: {
  title: string;
  items: NodeItem[];
  onSelect: (id: string) => void;
  onNavigate: (id: string, name: string) => void;
  selectedId: string | null;
}) {
  return (
    <div className="mb-4">
      <div className="text-micro uppercase tracking-widest text-jc-text-3 px-3 mb-1">
        {title}
      </div>
      {items.length === 0 && (
        <div className="text-meta text-jc-text-3 px-3 py-1">None yet</div>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          onDoubleClick={() => onNavigate(item.id, item.name)}
          className={`w-full flex items-center gap-2 px-3 py-1 text-ui text-left transition-colors ${
            selectedId === item.id
              ? "bg-jc-raised text-jc-text"
              : "text-jc-text-2 hover:bg-jc-raised hover:text-jc-text"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[item.status]}`}
          />
          <span className="truncate">{item.name}</span>
        </button>
      ))}
    </div>
  );
}

export function NodeBrowser({
  characters,
  locations,
  scenes,
}: NodeBrowserProps) {
  const { selectedNodeId, selectNode, drillDown } = useCanvas();

  return (
    <div className="w-[200px] shrink-0 border-r border-jc-border bg-jc-surface overflow-y-auto py-3">
      <NodeSection
        title="Characters"
        items={characters}
        onSelect={selectNode}
        onNavigate={(id, name) => drillDown("character", id, name)}
        selectedId={selectedNodeId}
      />
      <NodeSection
        title="Locations"
        items={locations}
        onSelect={selectNode}
        onNavigate={(id, name) => drillDown("location", id, name)}
        selectedId={selectedNodeId}
      />
      <NodeSection
        title="Scenes"
        items={scenes}
        onSelect={selectNode}
        onNavigate={(id, name) => drillDown("scene", id, name)}
        selectedId={selectedNodeId}
      />
    </div>
  );
}
