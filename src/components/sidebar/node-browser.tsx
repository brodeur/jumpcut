"use client";

import { useState } from "react";
import { useCanvas } from "@/lib/store/canvas-store";
import type { NodeStatus, CanvasLevel } from "@/lib/types";

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

// Sub-items for each entity type
const CHARACTER_CHILDREN = [
  { label: "Bible", kind: "bible" },
  { label: "Face", level: "face" as CanvasLevel },
  { label: "Body", level: "body" as CanvasLevel },
  { label: "Wardrobe", level: "wardrobe" as CanvasLevel },
];

const LOCATION_CHILDREN = [
  { label: "Bible", kind: "bible" },
  { label: "Visual", level: "location" as CanvasLevel },
];

function TreeItem({
  item,
  entityLevel,
  subItems,
  selectedId,
  onNavigate,
}: {
  item: NodeItem;
  entityLevel: CanvasLevel;
  subItems: Array<{ label: string; kind?: string; level?: CanvasLevel }>;
  selectedId: string | null;
  onNavigate: (levels: Array<{ level: CanvasLevel; id: string; label: string }>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === item.id;

  return (
    <div>
      {/* Entity row */}
      <button
        onClick={() => {
          setExpanded(!expanded);
          // Navigate to this entity's canvas
          onNavigate([{ level: entityLevel, id: item.id, label: item.name }]);
        }}
        className={`w-full flex items-center gap-1.5 px-3 py-1 text-ui text-left transition-colors ${
          isSelected
            ? "bg-jc-raised text-jc-text"
            : "text-jc-text-2 hover:bg-jc-raised hover:text-jc-text"
        }`}
      >
        <span
          className={`text-micro transition-transform ${
            expanded ? "rotate-90" : ""
          } text-jc-text-3`}
        >
          ▶
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[item.status]}`}
        />
        <span className="truncate">{item.name}</span>
      </button>

      {/* Sub-items */}
      {expanded && (
        <div className="ml-3">
          {subItems.map((child) => (
            <button
              key={child.label}
              onClick={() => {
                if (child.level) {
                  // Navigate: first to entity, then to sub-level
                  onNavigate([
                    { level: entityLevel, id: item.id, label: item.name },
                    { level: child.level, id: item.id, label: child.label },
                  ]);
                } else {
                  // Bible: just navigate to entity and select it
                  onNavigate([{ level: entityLevel, id: item.id, label: item.name }]);
                }
              }}
              className="w-full flex items-center gap-1.5 px-3 py-0.5 text-meta text-left text-jc-text-3 hover:text-jc-text-2 hover:bg-jc-raised transition-colors"
            >
              <span className="w-1.5" />
              <span className="truncate">{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 px-3 py-1 text-micro uppercase tracking-widest text-jc-text-3 hover:text-jc-text-2 transition-colors"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function NodeBrowser({
  characters,
  locations,
  scenes,
}: NodeBrowserProps) {
  const { selectedNodeId, selectNode, drillDown, navigateTo } = useCanvas();

  // Navigate to a specific path: reset to root then drill to target
  const handleNavigate = (levels: Array<{ level: CanvasLevel; id: string; label: string }>) => {
    // Reset to project root
    navigateTo(0);

    // Drill down after the canvas has cleared (next frame)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        levels.forEach((lvl) => {
          drillDown(lvl.level, lvl.id, lvl.label);
        });
        const last = levels[levels.length - 1];
        if (last) selectNode(last.id);
      });
    });
  };

  return (
    <div className="w-[200px] shrink-0 border-r border-jc-border bg-jc-surface overflow-y-auto py-2">
      <CollapsibleSection title="Characters">
        {characters.length === 0 && (
          <div className="text-meta text-jc-text-3 px-3 py-1">None yet</div>
        )}
        {characters.map((c) => (
          <TreeItem
            key={c.id}
            item={c}
            entityLevel="character"
            subItems={CHARACTER_CHILDREN}
            selectedId={selectedNodeId}
            onNavigate={handleNavigate}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Locations">
        {locations.length === 0 && (
          <div className="text-meta text-jc-text-3 px-3 py-1">None yet</div>
        )}
        {locations.map((l) => (
          <TreeItem
            key={l.id}
            item={l}
            entityLevel="location"
            subItems={LOCATION_CHILDREN}
            selectedId={selectedNodeId}
            onNavigate={handleNavigate}
          />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Scenes">
        {scenes.length === 0 && (
          <div className="text-meta text-jc-text-3 px-3 py-1">None yet</div>
        )}
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              handleNavigate([{ level: "scene", id: s.id, label: s.name }]);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1 text-ui text-left transition-colors ${
              selectedNodeId === s.id
                ? "bg-jc-raised text-jc-text"
                : "text-jc-text-2 hover:bg-jc-raised hover:text-jc-text"
            }`}
          >
            <span className="w-3" />
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[s.status]}`}
            />
            <span className="truncate">{s.name}</span>
          </button>
        ))}
      </CollapsibleSection>
    </div>
  );
}
