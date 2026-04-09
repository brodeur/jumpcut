import type { NodeStatus } from "@/lib/types";

const STATUS_BORDER: Record<NodeStatus, string> = {
  empty: "border-dashed border-[rgba(255,255,255,0.08)]",
  generating: "border-solid border-[rgba(240,237,232,0.30)] animate-pulse",
  generated: "border-solid border-[rgba(255,255,255,0.16)]",
  reacted: "border-solid border-[rgba(204,51,0,0.15)]",
  starred: "border-solid border-[#CC3300]",
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  character: { label: "CHR", color: "#CC3300" },
  location: { label: "LOC", color: "#2A6B3C" },
  scene: { label: "SCN", color: "#8A6200" },
};

interface NodeComponentProps {
  name: string;
  status: NodeStatus;
  nodeType: "character" | "location" | "scene";
  thumbnailUrl: string;
  w: number;
  h: number;
}

export function NodeComponent({
  name,
  status,
  nodeType,
  thumbnailUrl,
  w,
  h,
}: NodeComponentProps) {
  const typeInfo = TYPE_LABELS[nodeType];
  const starred = status === "starred";

  return (
    <div
      style={{ width: w, height: h }}
      className={`rounded-sm border-2 ${STATUS_BORDER[status]} bg-[#1A1917] flex flex-col overflow-hidden select-none`}
    >
      {/* Thumbnail area */}
      <div className="flex-1 bg-[#111110] flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            style={{ color: typeInfo.color, fontSize: 22, fontWeight: 700 }}
          >
            {typeInfo.label}
          </span>
        )}
      </div>

      {/* Label bar */}
      <div
        className="px-2 py-1 flex items-center gap-1.5"
        style={{ background: "#222220" }}
      >
        {starred && (
          <span style={{ color: "#CC3300", fontSize: 11 }}>★</span>
        )}
        <span
          style={{
            fontSize: 11,
            color: "#F0EDE8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 9,
            color: typeInfo.color,
            opacity: 0.7,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {typeInfo.label}
        </span>
      </div>
    </div>
  );
}
