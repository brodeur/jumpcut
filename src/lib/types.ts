// Core data types matching the Supabase schema

export type NodeStatus = "empty" | "generating" | "generated" | "reacted" | "starred";

export type ObjectType =
  | "character_face"
  | "character_body"
  | "location"
  | "scene"
  | "wardrobe";

export type AudienceSegment = "converter" | "evangelist" | "skeptic" | "genre_native";

export type CanvasLevel =
  | "project"
  | "character"
  | "location"
  | "scene"
  | "face"
  | "body"
  | "wardrobe"
  | "sequence"
  | "first_10";

// --- Database row types ---

export interface Project {
  id: string;
  name: string;
  script_text: string | null;
  created_by: string;
  created_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  bible: Record<string, unknown> | null;
  status: NodeStatus;
  created_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  name: string;
  bible: Record<string, unknown> | null;
  status: NodeStatus;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  name: string;
  character_ids: string[];
  location_id: string | null;
  description: string | null;
  beat_sheet: Record<string, unknown> | null;
  created_at: string;
}

export interface Generation {
  id: string;
  object_id: string;
  object_type: ObjectType;
  prompt: string;
  cloud_url: string | null;
  local_path: string | null;
  local_synced: boolean;
  starred: boolean;
  conditioning_refs: string[];
  created_at: string;
}

export interface AudienceReaction {
  id: string;
  generation_id: string;
  segment: AudienceSegment;
  demographic_profile: Record<string, unknown>;
  reaction: {
    instant_reaction: string;
    trust_score: number;
    distinctiveness: number;
    character_truth: string;
    would_watch: boolean;
    compulsion_score: number;
    anticipation_load: number;
    cost_felt: string;
    evangelist_moment: string | null;
  };
  created_at: string;
}

export interface LadderState {
  id: string;
  project_id: string;
  state: {
    active_promises: unknown[];
    paid_costs: unknown[];
    compulsion_history: number[];
    variable_reward_log: unknown[];
    audience_emotional_state: Record<AudienceSegment, Record<string, unknown>>;
  };
  updated_at: string;
}

export interface CanvasNode {
  id: string;
  project_id: string;
  canvas_level: CanvasLevel;
  parent_id: string | null;
  object_id: string;
  object_type: string;
  position: { x: number; y: number };
  created_at: string;
}

// --- Navigation ---

export interface BreadcrumbItem {
  label: string;
  level: CanvasLevel;
  objectId?: string;
}
