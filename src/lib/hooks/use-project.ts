"use client";

import { useState, useEffect, useCallback } from "react";
import type { Character, Location, Scene, CanvasNode } from "@/lib/types";

interface ProjectData {
  project: { id: string; name: string; script_text: string | null } | null;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  canvasNodes: CanvasNode[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProject(projectId: string | null): ProjectData {
  const [project, setProject] = useState<ProjectData["project"]>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const data = await res.json();

      setProject(data.project);
      setCharacters(data.characters);
      setLocations(data.locations);
      setScenes(data.scenes);
      setCanvasNodes(data.canvasNodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    characters,
    locations,
    scenes,
    canvasNodes,
    loading,
    error,
    refresh: fetchProject,
  };
}
