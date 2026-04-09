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
    const { objectId, objectType, prompt, style, count = 4, conditioningRefs = [] } =
      await req.json();

    if (!objectId || !objectType || !prompt) {
      return NextResponse.json(
        { error: "objectId, objectType, and prompt are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Prepend visual style to the prompt if set
    const styledPrompt = style
      ? `${prompt}. Shot on ${style}, cinematic quality.`
      : prompt;

    // Generate images in parallel via fal.ai Nano Banana 2
    const generationPromises = Array.from({ length: count }, () =>
      fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: styledPrompt,
          aspect_ratio: "1:1" as const,
          resolution: "1K" as const,
          output_format: "jpeg" as const,
        },
      })
    );

    const results = await Promise.all(generationPromises);

    // Save each generation to Supabase
    const generations = [];
    for (const result of results) {
      const images = (result.data as { images?: FalImage[] }).images;
      const imageUrl = images?.[0]?.url || (result.data as { images?: Array<{ url: string }> }).images?.[0]?.url;

      const { data, error } = await supabase
        .from("generations")
        .insert({
          object_id: objectId,
          object_type: objectType,
          prompt: styledPrompt,
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
