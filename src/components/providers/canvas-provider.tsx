"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { CanvasContext, type CanvasStore } from "@/lib/store/canvas-store";
import type { BreadcrumbItem, CanvasLevel } from "@/lib/types";

/** Convert a label to a URL-safe slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a URL path from the breadcrumb stack */
function breadcrumbToPath(crumbs: BreadcrumbItem[]): string {
  if (crumbs.length <= 1) return "/";
  const segments = crumbs.map((c) => slugify(c.label));
  return "/" + segments.join("/");
}

interface CanvasProviderProps {
  children: React.ReactNode;
  projectName?: string;
}

export function CanvasProvider({ children, projectName }: CanvasProviderProps) {
  const [currentLevel, setCurrentLevel] = useState<CanvasLevel>("project");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { label: "Untitled Project", level: "project" },
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const suppressPush = useRef(false);

  // Update root breadcrumb label when project name loads
  useEffect(() => {
    if (projectName) {
      setBreadcrumb((prev) => {
        if (prev.length > 0 && prev[0].label !== projectName) {
          const next = [...prev];
          next[0] = { ...next[0], label: projectName };
          return next;
        }
        return prev;
      });
    }
  }, [projectName]);

  // Push breadcrumb to browser history on every navigation
  useEffect(() => {
    if (suppressPush.current) {
      suppressPush.current = false;
      return;
    }
    const path = breadcrumbToPath(breadcrumb);
    const state = { breadcrumb, currentLevel };
    // Only push if path actually changed
    if (window.location.pathname !== path) {
      window.history.pushState(state, "", path);
    }
  }, [breadcrumb, currentLevel]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.breadcrumb && e.state?.currentLevel) {
        suppressPush.current = true;
        setBreadcrumb(e.state.breadcrumb);
        setCurrentLevel(e.state.currentLevel);
        setSelectedNodeId(null);
      } else {
        // Back to root
        suppressPush.current = true;
        setBreadcrumb((prev) => [prev[0]]);
        setCurrentLevel("project");
        setSelectedNodeId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // On mount: store URL path for resolution (only once, only if not already at root)
  const pathStored = useRef(false);
  useEffect(() => {
    if (pathStored.current) return;
    pathStored.current = true;

    const path = window.location.pathname;
    if (path === "/" || path === "") return;

    const segments = path.split("/").filter(Boolean);
    if (segments.length > 1) { // Need at least project + one sub-level to drill
      sessionStorage.setItem("jc_pending_path", JSON.stringify(segments));
    }
  }, []);

  const drillDown = useCallback(
    (level: CanvasLevel, objectId: string, label: string) => {
      setBreadcrumb((prev) => {
        // Guard: don't drill if already at this exact level+object
        const last = prev[prev.length - 1];
        if (last && last.level === level && last.objectId === objectId) return prev;
        return [...prev, { label, level, objectId }];
      });
      setCurrentLevel(level);
      setSelectedNodeId(null);
    },
    []
  );

  // Listen for jc-drill custom events (used by URL resolution)
  useEffect(() => {
    const handler = (e: Event) => {
      const { level, id, label } = (e as CustomEvent).detail;
      drillDown(level as CanvasLevel, id, label);
    };
    window.addEventListener("jc-drill", handler);
    return () => window.removeEventListener("jc-drill", handler);
  }, [drillDown]);

  const navigateUp = useCallback(() => {
    setBreadcrumb((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setCurrentLevel(next[next.length - 1].level);
      setSelectedNodeId(null);
      return next;
    });
  }, []);

  const navigateTo = useCallback((index: number) => {
    setBreadcrumb((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.slice(0, index + 1);
      setCurrentLevel(next[next.length - 1].level);
      setSelectedNodeId(null);
      return next;
    });
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const setProject = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  const store: CanvasStore = useMemo(
    () => ({
      currentLevel,
      breadcrumb,
      selectedNodeId,
      projectId,
      drillDown,
      navigateUp,
      navigateTo,
      selectNode,
      setProject,
    }),
    [
      currentLevel,
      breadcrumb,
      selectedNodeId,
      projectId,
      drillDown,
      navigateUp,
      navigateTo,
      selectNode,
      setProject,
    ]
  );

  return (
    <CanvasContext.Provider value={store}>{children}</CanvasContext.Provider>
  );
}
