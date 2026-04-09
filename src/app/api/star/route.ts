import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { generationId, star } = await req.json();
    if (!generationId || typeof star !== "boolean") {
      return NextResponse.json(
        { error: "generationId and star (boolean) are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the generation to find its object_id and object_type
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (genError || !gen) throw genError || new Error("Generation not found");

    if (star) {
      // Unstar any currently starred generation for this object+type
      await supabase
        .from("generations")
        .update({ starred: false })
        .eq("object_id", gen.object_id)
        .eq("object_type", gen.object_type)
        .eq("starred", true);

      // Star the selected one
      await supabase
        .from("generations")
        .update({ starred: true })
        .eq("id", generationId);
    } else {
      // Unstar
      await supabase
        .from("generations")
        .update({ starred: false })
        .eq("id", generationId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Star error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Star failed" },
      { status: 500 }
    );
  }
}
