"use client";

import { useState, useEffect, useRef } from "react";
import { useCanvas } from "@/lib/store/canvas-store";

interface ProjectItem {
  id: string;
  name: string;
  created_at: string;
}

interface ToolbarProps {
  currentProjectId?: string | null;
  onSwitchProject?: (id: string) => void;
  onNewProject?: () => void;
}

export function Toolbar({
  currentProjectId,
  onSwitchProject,
  onNewProject,
}: ToolbarProps) {
  const { breadcrumb, navigateTo } = useCanvas();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch projects when dropdown opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => {});
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

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

      {/* Project selector + zoom */}
      <div className="flex items-center gap-4">
        {/* Project dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-meta text-jc-text-2 hover:text-jc-text transition-colors"
          >
            <span className="truncate max-w-[140px]">
              {currentProject?.name || "Projects"}
            </span>
            <span className="text-jc-text-3">▾</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-jc-raised border border-jc-border rounded shadow-lg z-50 overflow-hidden">
              {/* New project button */}
              <button
                onClick={() => {
                  setOpen(false);
                  onNewProject?.();
                }}
                className="w-full px-3 py-2 text-ui text-left text-jc-red hover:bg-jc-surface transition-colors border-b border-jc-border"
              >
                + New Project
              </button>

              {/* Project list */}
              <div className="max-h-48 overflow-y-auto">
                {projects.length === 0 && (
                  <div className="px-3 py-2 text-meta text-jc-text-3">
                    No projects
                  </div>
                )}
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setOpen(false);
                      onSwitchProject?.(p.id);
                    }}
                    className={`w-full px-3 py-2 text-ui text-left transition-colors ${
                      p.id === currentProjectId
                        ? "bg-jc-surface text-jc-text"
                        : "text-jc-text-2 hover:bg-jc-surface hover:text-jc-text"
                    }`}
                  >
                    <div className="truncate">{p.name}</div>
                    <div className="text-micro text-jc-text-3">
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2 text-meta text-jc-text-2">
          <button className="hover:text-jc-text transition-colors">−</button>
          <span className="w-10 text-center">100%</span>
          <button className="hover:text-jc-text transition-colors">+</button>
        </div>
      </div>
    </div>
  );
}
