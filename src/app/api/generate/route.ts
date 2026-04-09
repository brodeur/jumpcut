import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";
import Anthropic from "@anthropic-ai/sdk";

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

    // Generate unique casting directions for each variant using Claude
    let castingDirections: string[] = [""];
    if (count > 1 && (objectType === "character_face" || objectType === "character_body")) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const resp = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are a casting director. Given a character description for image generation, produce ${count} brief, distinct casting directions. Each should push toward a genuinely different physical interpretation of the same character — different age, ethnicity, build, energy, or look. Keep each direction to 1-2 sentences. Return ONLY a JSON array of strings.`,
          messages: [{ role: "user", content: prompt }],
        });
        const text = resp.content[0].type === "text" ? resp.content[0].text : "[]";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        castingDirections = JSON.parse(cleaned);
      } catch (err) {
        console.error("Casting direction generation failed, using base prompt:", err);
        castingDirections = Array.from({ length: count }, () => "");
      }
    }

    // Generate images in parallel via fal.ai Nano Banana 2
    const generationPromises = Array.from({ length: count }, (_, i) => {
      const direction = castingDirections[i] || "";
      const variantPrompt = direction
        ? `${styledPrompt}\n\nCasting direction: ${direction}`
        : styledPrompt;

      return fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: variantPrompt,
          aspect_ratio: "1:1" as const,
          resolution: "1K" as const,
          output_format: "jpeg" as const,
          seed: Math.floor(Math.random() * 2147483647),
        },
      });
    });

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
