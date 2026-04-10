import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCharacterBible, generateLocationBible } from "@/lib/ai/generate-bible";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );
}

/**
 * POST /api/entities
 *
 * Create a character, location, or scene manually.
 * If description is provided, generates a bible via Claude.
 *
 * Input: {
 *   projectId: string,
 *   type: "character" | "location" | "scene",
 *   name: string,
 *   description?: string,  // Optional - used to generate bible
 *   bible?: object,        // Optional - provide bible directly
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, type, name, description, bible } = await req.json();

    if (!projectId || !type || !name) {
      return NextResponse.json(
        { error: "projectId, type, and name are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (type === "character") {
      // Generate bible if description provided but no bible
      let charBible = bible || null;
      if (!charBible && description) {
        charBible = await generateCharacterBible(name, description, description);
      }

      const { data, error } = await supabase
        .from("characters")
        .insert({
          project_id: projectId,
          name,
          bible: charBible,
          status: "empty",
        })
        .select()
        .single();

      if (error) throw error;

      // Create canvas node
      const { data: existingNodes } = await supabase
        .from("canvas_nodes")
        .select("position")
        .eq("project_id", projectId)
        .eq("canvas_level", "project");

      const nodeCount = existingNodes?.length || 0;
      await supabase.from("canvas_nodes").insert({
        project_id: projectId,
        canvas_level: "project",
        parent_id: null,
        object_id: data.id,
        object_type: "character",
        position: { x: (nodeCount % 4) * 280, y: Math.floor(nodeCount / 4) * 200 },
      });

      return NextResponse.json({ entity: data, type: "character" });
    }

    if (type === "location") {
      let locBible = bible || null;
      if (!locBible && description) {
        locBible = await generateLocationBible(name, description, description);
      }

      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: projectId,
          name,
          bible: locBible,
          status: "empty",
        })
        .select()
        .single();

      if (error) throw error;

      const { data: existingNodes } = await supabase
        .from("canvas_nodes")
        .select("position")
        .eq("project_id", projectId)
        .eq("canvas_level", "project");

      const nodeCount = existingNodes?.length || 0;
      await supabase.from("canvas_nodes").insert({
        project_id: projectId,
        canvas_level: "project",
        parent_id: null,
        object_id: data.id,
        object_type: "location",
        position: { x: (nodeCount % 4) * 280, y: Math.floor(nodeCount / 4) * 200 },
      });

      return NextResponse.json({ entity: data, type: "location" });
    }

    if (type === "scene") {
      const { data, error } = await supabase
        .from("scenes")
        .insert({
          project_id: projectId,
          name,
          description: description || null,
          character_ids: [],
        })
        .select()
        .single();

      if (error) throw error;

      const { data: existingNodes } = await supabase
        .from("canvas_nodes")
        .select("position")
        .eq("project_id", projectId)
        .eq("canvas_level", "project");

      const nodeCount = existingNodes?.length || 0;
      await supabase.from("canvas_nodes").insert({
        project_id: projectId,
        canvas_level: "project",
        parent_id: null,
        object_id: data.id,
        object_type: "scene",
        position: { x: (nodeCount % 4) * 280, y: Math.floor(nodeCount / 4) * 200 },
      });

      return NextResponse.json({ entity: data, type: "scene" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Entity creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create entity" },
      { status: 500 }
    );
  }
}
