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
    const { projectId, type, name, description, bible, characterIds, locationId } = await req.json();

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
          character_ids: characterIds || [],
          location_id: locationId || null,
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

/**
 * DELETE /api/entities
 *
 * Delete a character, location, or scene and all associated data.
 * Cascades: generations → audience_reactions, canvas_nodes.
 *
 * Input: { entityId: string, type: "character" | "location" | "scene" }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { entityId, type } = await req.json();

    if (!entityId || !type) {
      return NextResponse.json(
        { error: "entityId and type are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const table = type === "character" ? "characters" : type === "location" ? "locations" : "scenes";

    // 1. Find all generations for this entity
    const { data: gens } = await supabase
      .from("generations")
      .select("id")
      .eq("object_id", entityId);
    const genIds = gens?.map((g) => g.id) || [];

    // 2. Delete audience reactions for those generations
    if (genIds.length > 0) {
      // Delete in batches to avoid PostgREST .in() issues
      for (let i = 0; i < genIds.length; i += 50) {
        const batch = genIds.slice(i, i + 50);
        await supabase.from("audience_reactions").delete().in("generation_id", batch);
      }
    }

    // 3. Delete generations
    await supabase.from("generations").delete().eq("object_id", entityId);

    // 4. Delete canvas nodes
    await supabase.from("canvas_nodes").delete().eq("object_id", entityId);

    // 5. Delete the entity itself
    const { error } = await supabase.from(table).delete().eq("id", entityId);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Entity deletion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete entity" },
      { status: 500 }
    );
  }
}
