import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );
}

/**
 * POST /api/chemistry
 *
 * Evaluates pairwise chemistry between two character generations.
 * Used in Ensemble Co-Evolution to select characters that work well together.
 *
 * Input: { generationIdA: string, generationIdB: string }
 * Output: { chemistry_score, visual_harmony, dramatic_tension, power_dynamic, casting_compatibility, rationale }
 */
export async function POST(req: NextRequest) {
  try {
    const { generationIdA, generationIdB } = await req.json();
    if (!generationIdA || !generationIdB) {
      return NextResponse.json(
        { error: "generationIdA and generationIdB are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get both generations
    const [{ data: genA }, { data: genB }] = await Promise.all([
      supabase.from("generations").select("*").eq("id", generationIdA).single(),
      supabase.from("generations").select("*").eq("id", generationIdB).single(),
    ]);

    if (!genA || !genB) {
      return NextResponse.json({ error: "One or both generations not found" }, { status: 404 });
    }

    // Get character bibles for both
    const [{ data: charA }, { data: charB }] = await Promise.all([
      supabase.from("characters").select("name, bible").eq("id", genA.object_id).single(),
      supabase.from("characters").select("name, bible").eq("id", genB.object_id).single(),
    ]);

    const contextA = charA
      ? `Character A: ${charA.name}\nBible: ${JSON.stringify(charA.bible)}\nImage: ${genA.cloud_url}`
      : `Character A image: ${genA.cloud_url}`;

    const contextB = charB
      ? `Character B: ${charB.name}\nBible: ${JSON.stringify(charB.bible)}\nImage: ${genB.cloud_url}`
      : `Character B image: ${genB.cloud_url}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are an Ensemble Chemistry Agent — a specialist in evaluating how two characters work together visually and dramatically. You assess whether two characters create productive tension, visual contrast, and dramatic potential when placed in the same frame.

Great pairings have:
- Visual contrast (different energy, build, coloring, posture)
- Dramatic tension (the audience should feel something when they're in a scene together)
- Power dynamic (one should feel like they have leverage, or both should feel equally matched in a way that creates friction)
- Casting compatibility (they should look like they belong in the same show, not like they were cast by different casting directors)

Return a JSON object:
{
  "chemistry_score": <0-10 overall chemistry rating>,
  "visual_harmony": <0-10 how well they contrast/complement visually>,
  "dramatic_tension": <0-10 how much tension the pairing creates>,
  "power_dynamic": <0-10 how interesting the power relationship reads>,
  "casting_compatibility": <0-10 do they feel like they're from the same show>,
  "rationale": "2-3 sentences explaining the chemistry assessment",
  "pairing_type": "One of: electric, complementary, volatile, mismatch, neutral"
}
Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Evaluate the chemistry between these two characters:\n\n${contextA}\n\n${contextB}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({
      characterA: charA?.name || genA.object_id,
      characterB: charB?.name || genB.object_id,
      ...result,
    });
  } catch (error) {
    console.error("Chemistry evaluation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chemistry evaluation failed" },
      { status: 500 }
    );
  }
}
