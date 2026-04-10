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
    const { objectId, objectType, prompt, style, count = 4, conditioningRefs = [], imageUrls = [] } =
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
          system: `You are a casting director. Given a character description for image generation, produce ${count} brief, distinct casting directions.

CRITICAL RULES:
- NEVER change explicitly stated physical traits (ethnicity, race, gender, age range, eye color, hair color, etc.). If the description says "white male" or "East Asian woman" or "mid-50s", every variant MUST match those traits exactly.
- DO vary: expression, energy, grooming, facial hair style, hairstyle, build within the stated range, clothing interpretation, lighting mood, posture, intensity level, degree of weathering/polish.
- Each direction should feel like a different actor walking in for the same role — same type, different person.

Keep each direction to 1-2 sentences. Return ONLY a JSON array of strings.`,
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

    // Use 16:9 for locations and scenes (establishing/cinematic shots), 1:1 for characters
    const aspectRatio = (objectType === "location" || objectType === "scene") ? "16:9" as const : "1:1" as const;

    // Use edit endpoint when reference images are provided (body←face, wardrobe←body, scene←characters+location)
    const hasRefs = Array.isArray(imageUrls) && imageUrls.length > 0;
    const endpoint = hasRefs ? "fal-ai/nano-banana-2/edit" : "fal-ai/nano-banana-2";

    // Generate images in parallel via fal.ai Nano Banana 2
    const generationPromises = Array.from({ length: count }, (_, i) => {
      const direction = castingDirections[i] || "";
      const variantPrompt = direction
        ? `${styledPrompt}\n\nCasting direction: ${direction}`
        : styledPrompt;

      const input: Record<string, unknown> = {
        prompt: variantPrompt,
        aspect_ratio: aspectRatio,
        resolution: "1K" as const,
        output_format: "jpeg" as const,
        seed: Math.floor(Math.random() * 2147483647),
      };

      // Pass reference images to edit endpoint
      if (hasRefs) {
        input.image_urls = imageUrls;
      }

      return fal.subscribe(endpoint, { input });
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
