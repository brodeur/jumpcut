import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractScript } from "@/lib/ai/extract-script";
import {
  generateCharacterBible,
  generateLocationBible,
} from "@/lib/ai/generate-bible";

// Use service role key for server-side operations
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { scriptText, projectName, visualStyle, userId, emptyProject } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: projectName || "Untitled Project",
        script_text: emptyProject ? null : scriptText,
        created_by: userId,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // For empty projects, just create the project and return
    if (emptyProject) {
      // Initialize ladder state
      await supabase.from("ladder_state").insert({ project_id: project.id });

      return NextResponse.json({
        projectId: project.id,
        title: projectName || "Untitled Project",
        summary: "",
        visualStyle: visualStyle || "35mm film",
        characterCount: 0,
        locationCount: 0,
        sceneCount: 0,
      });
    }

    if (!scriptText) {
      return NextResponse.json(
        { error: "scriptText is required for non-empty projects" },
        { status: 400 }
      );
    }

    // 2. Extract structure from script via GPT-4o
    const extraction = await extractScript(scriptText);

    // Truncate script for bible context (first 4000 chars)
    const scriptContext = scriptText.slice(0, 4000);

    // 3. Generate bibles — throttled to avoid API rate limits
    // Process in batches of 3 to stay within token-per-minute limits
    const processBatch = async <T, R>(
      items: T[],
      fn: (item: T) => Promise<R>,
      batchSize = 3
    ): Promise<R[]> => {
      const results: R[] = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
      }
      return results;
    };

    const characters = await processBatch(extraction.characters, async (char) => {
      const bible = await generateCharacterBible(
        char.name,
        char.description,
        scriptContext
      );

      const { data, error } = await supabase
        .from("characters")
        .insert({
          project_id: project.id,
          name: char.name,
          bible,
          status: "empty",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    const locations = await processBatch(extraction.locations, async (loc) => {
      const bible = await generateLocationBible(
        loc.name,
        loc.description,
        scriptContext
      );

      const { data, error } = await supabase
        .from("locations")
        .insert({
          project_id: project.id,
          name: loc.name,
          bible,
          status: "empty",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    // Build lookup maps for scene references
    const charMap = new Map(characters.map((c) => [c.name, c.id]));
    const locMap = new Map(locations.map((l) => [l.name, l.id]));

    // Process scenes
    const scenePromises = extraction.scenes.map(async (scene) => {
      const characterIds = scene.characters
        .map((name) => charMap.get(name))
        .filter(Boolean);
      const locationId = locMap.get(scene.location) || null;

      const { data, error } = await supabase
        .from("scenes")
        .insert({
          project_id: project.id,
          name: scene.name,
          character_ids: characterIds,
          location_id: locationId,
          description: scene.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    const scenes = await Promise.all(scenePromises);

    // 4. Create canvas nodes (auto-layout in a grid)
    const GRID_COLS = 4;
    const SPACING_X = 280;
    const SPACING_Y = 200;
    const allEntities = [
      ...characters.map((c) => ({
        object_id: c.id,
        object_type: "character" as const,
      })),
      ...locations.map((l) => ({
        object_id: l.id,
        object_type: "location" as const,
      })),
      ...scenes.map((s) => ({
        object_id: s.id,
        object_type: "scene" as const,
      })),
    ];

    const canvasNodes = allEntities.map((entity, i) => ({
      project_id: project.id,
      canvas_level: "project",
      parent_id: null,
      object_id: entity.object_id,
      object_type: entity.object_type,
      position: {
        x: (i % GRID_COLS) * SPACING_X,
        y: Math.floor(i / GRID_COLS) * SPACING_Y,
      },
    }));

    if (canvasNodes.length > 0) {
      const { error: nodesError } = await supabase
        .from("canvas_nodes")
        .insert(canvasNodes);
      if (nodesError) throw nodesError;
    }

    // 5. Initialize ladder state
    const { error: ladderError } = await supabase
      .from("ladder_state")
      .insert({ project_id: project.id });
    if (ladderError) throw ladderError;

    // Update project name if extracted
    if (extraction.title) {
      await supabase
        .from("projects")
        .update({ name: extraction.title })
        .eq("id", project.id);
    }

    return NextResponse.json({
      projectId: project.id,
      title: extraction.title,
      summary: extraction.summary,
      visualStyle: visualStyle || "35mm film",
      characterCount: characters.length,
      locationCount: locations.length,
      sceneCount: scenes.length,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
