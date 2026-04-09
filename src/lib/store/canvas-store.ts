"use client";

import { createContext, useContext } from "react";
import type { BreadcrumbItem, CanvasLevel } from "@/lib/types";

export interface CanvasState {
  /** Current canvas level being viewed */
  currentLevel: CanvasLevel;
  /** Stack of breadcrumb items for navigation */
  breadcrumb: BreadcrumbItem[];
  /** Currently selected node ID (for inspector) */
  selectedNodeId: string | null;
  /** Current project ID */
  projectId: string | null;
}

export interface CanvasActions {
  /** Navigate into a sub-canvas */
  drillDown: (level: CanvasLevel, objectId: string, label: string) => void;
  /** Navigate up one level */
  navigateUp: () => void;
  /** Navigate to a specific breadcrumb index */
  navigateTo: (index: number) => void;
  /** Select a node (populates inspector) */
  selectNode: (nodeId: string | null) => void;
  /** Set the current project */
  setProject: (projectId: string) => void;
}

export type CanvasStore = CanvasState & CanvasActions;

export const CanvasContext = createContext<CanvasStore | null>(null);

export function useCanvas(): CanvasStore {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within CanvasProvider");
  return ctx;
}
