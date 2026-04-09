import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const projectId = params.id;

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

    return NextResponse.json({
      project,
      characters: characters || [],
      locations: locations || [],
      scenes: scenes || [],
      canvasNodes: canvasNodes || [],
    });
  } catch (error) {
    console.error("Fetch project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
