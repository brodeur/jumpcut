"use client";

import { useCanvas } from "@/lib/store/canvas-store";

export function Toolbar() {
  const { breadcrumb, navigateTo } = useCanvas();

  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-jc-border bg-jc-surface shrink-0">
      {/* Logo */}
      <div className="font-display text-name font-bold tracking-wide whitespace-nowrap">
        <span className="text-jc-text">JUMP</span>
        <span className="text-jc-red">{"//"}</span>
        <span className="text-jc-text">CUT</span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-meta text-jc-text-2">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-jc-text-3">›</span>}
            <button
              onClick={() => navigateTo(i)}
              className={`hover:text-jc-text transition-colors ${
                i === breadcrumb.length - 1 ? "text-jc-text" : ""
              }`}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      {/* Zoom controls (placeholder) */}
      <div className="flex items-center gap-2 text-meta text-jc-text-2">
        <button className="hover:text-jc-text transition-colors">−</button>
        <span className="w-10 text-center">100%</span>
        <button className="hover:text-jc-text transition-colors">+</button>
      </div>
    </div>
  );
}
