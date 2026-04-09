import { User, MapPin, Clapperboard, Star } from "lucide-react";
import type { NodeStatus } from "@/lib/types";

const STATUS_BORDER: Record<NodeStatus, string> = {
  empty: "border-dashed border-[rgba(255,255,255,0.08)]",
  generating: "border-solid border-[rgba(240,237,232,0.30)] animate-pulse",
  generated: "border-solid border-[rgba(255,255,255,0.16)]",
  reacted: "border-solid border-[rgba(204,51,0,0.15)]",
  starred: "border-solid border-[#CC3300]",
};

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof User }> = {
  character: { label: "CHR", color: "#CC3300", Icon: User },
  location: { label: "LOC", color: "#2A6B3C", Icon: MapPin },
  scene: { label: "SCN", color: "#8A6200", Icon: Clapperboard },
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
  const typeInfo = TYPE_CONFIG[nodeType];
  const starred = status === "starred";
  const IconEl = typeInfo.Icon;

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
          <IconEl size={32} color={typeInfo.color} strokeWidth={1.5} />
        )}
      </div>

      {/* Label bar */}
      <div
        className="px-2 py-1 flex items-center gap-1.5"
        style={{ background: "#222220" }}
      >
        {starred && (
          <Star size={11} color="#CC3300" fill="#CC3300" />
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
        <IconEl size={10} color={typeInfo.color} strokeWidth={1.5} style={{ opacity: 0.7 }} />
      </div>
    </div>
  );
}
