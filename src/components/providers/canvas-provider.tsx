"use client";

import { useState, useCallback, useMemo } from "react";
import { CanvasContext, type CanvasStore } from "@/lib/store/canvas-store";
import type { BreadcrumbItem, CanvasLevel } from "@/lib/types";

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [currentLevel, setCurrentLevel] = useState<CanvasLevel>("project");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { label: "Untitled Project", level: "project" },
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const drillDown = useCallback(
    (level: CanvasLevel, objectId: string, label: string) => {
      setBreadcrumb((prev) => [...prev, { label, level, objectId }]);
      setCurrentLevel(level);
      setSelectedNodeId(null);
    },
    []
  );

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
