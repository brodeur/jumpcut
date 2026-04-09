import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_API_KEY! });

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface FalImage {
  url: string;
  width: number;
  height: number;
}

export async function POST(req: NextRequest) {
  try {
    const { objectId, objectType, prompt, count = 4, conditioningRefs = [] } =
      await req.json();

    if (!objectId || !objectType || !prompt) {
      return NextResponse.json(
        { error: "objectId, objectType, and prompt are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Generate images in parallel via fal.ai Flux
    const generationPromises = Array.from({ length: count }, () =>
      fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt,
          image_size: "square_hd",
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      })
    );

    const results = await Promise.all(generationPromises);

    // Save each generation to Supabase
    const generations = [];
    for (const result of results) {
      const images = (result.data as { images?: FalImage[] }).images;
      const imageUrl = images?.[0]?.url;

      const { data, error } = await supabase
        .from("generations")
        .insert({
          object_id: objectId,
          object_type: objectType,
          prompt,
          cloud_url: imageUrl || null,
          starred: false,
          conditioning_refs: conditioningRefs,
        })
        .select()
        .single();

      if (error) throw error;
      generations.push(data);
    }

    return NextResponse.json({ generations });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
