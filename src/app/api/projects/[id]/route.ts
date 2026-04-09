import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const projectId = params.id;

    // Get all entity IDs for this project to query generations
    const [
      { data: project, error: projectError },
      { data: characters },
      { data: locations },
      { data: scenes },
      { data: canvasNodes },
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase
        .from("characters")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("locations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("canvas_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
    ]);

    if (projectError) throw projectError;

    // Fetch generations for all entities in this project
    const allEntityIds = [
      ...(characters || []).map((c: { id: string }) => c.id),
      ...(locations || []).map((l: { id: string }) => l.id),
      ...(scenes || []).map((s: { id: string }) => s.id),
    ];

    let generations: unknown[] = [];
    let reactions: unknown[] = [];

    const entityIdSet = new Set(allEntityIds);

    if (allEntityIds.length > 0) {
      // Fetch all generations and filter by entity IDs in JS
      const { data: allGens, error: genErr } = await supabase
        .from("generations")
        .select("*")
        .order("created_at")
        .limit(5000);

      console.log(`[project/${projectId}] allGens: ${allGens?.length}, err: ${genErr?.message}, entityIds: ${allEntityIds.length}`);

      generations = (allGens || []).filter(
        (g: { object_id: string }) => entityIdSet.has(g.object_id)
      );
      console.log(`[project/${projectId}] filtered gens: ${(generations as unknown[]).length}`);

      // Fetch reactions for matched generations
      const genIds = generations.map((g: { id: string }) => g.id);
      if (genIds.length > 0) {
        const { data: rxns } = await supabase
          .from("audience_reactions")
          .select("*")
          .in("generation_id", genIds)
          .order("created_at");
        reactions = rxns || [];
      }
    }

    return NextResponse.json({
      project,
      characters: characters || [],
      locations: locations || [],
      scenes: scenes || [],
      canvasNodes: canvasNodes || [],
      generations,
      reactions,
    });
  } catch (error) {
    console.error("Fetch project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
