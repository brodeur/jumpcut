import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );
}

/**
 * POST /api/adapt
 *
 * Reads the evaluation results for a generation and produces targeted
 * mutation suggestions to improve fitness in the next breeding cycle.
 *
 * Input: { generationId: string }
 * Output: { mutations: string[], adaptedPrompt: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { generationId } = await req.json();
    if (!generationId) {
      return NextResponse.json({ error: "generationId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get the generation
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (genError || !gen) throw genError || new Error("Generation not found");

    // Get all reactions for this generation
    const { data: reactions } = await supabase
      .from("audience_reactions")
      .select("*")
      .eq("generation_id", generationId);

    if (!reactions || reactions.length === 0) {
      return NextResponse.json({ error: "No evaluations found for this generation" }, { status: 400 });
    }

    // Get character/location bible for context
    let bibleContext = "";
    if (gen.object_type === "character_face" || gen.object_type === "character_body") {
      const { data: char } = await supabase
        .from("characters")
        .select("name, bible")
        .eq("id", gen.object_id)
        .single();
      if (char) {
        bibleContext = `Character: ${char.name}\nBible: ${JSON.stringify(char.bible)}`;
      }
    }

    // Build the evaluation summary for the adaptation agent
    const evalSummary = reactions
      .filter((r) => r.segment !== "score_card" && r.segment !== "neural")
      .map((r) => {
        const rxn = r.reaction as Record<string, unknown>;
        return `${r.segment}: score=${rxn.score}/10 — ${rxn.key_observation || rxn.rationale || ""}`;
      })
      .join("\n");

    const scoreCard = reactions.find((r) => r.segment === "score_card");
    const scSummary = scoreCard
      ? `Score Card: Bible Match=${(scoreCard.reaction as Record<string, unknown>).bible_match}, Audience=${(scoreCard.reaction as Record<string, unknown>).audience}, Memorability=${(scoreCard.reaction as Record<string, unknown>).memorability}, Archetype=${(scoreCard.reaction as Record<string, unknown>).archetype}, Overall=${(scoreCard.reaction as Record<string, unknown>).overall}`
      : "";

    // Ask the Adaptation Agent to suggest mutations
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `You are the Adaptation Agent in a Synthetic Character Evolution system. You analyze evaluation results from 10 specialized agents and suggest specific, targeted visual mutations to improve the character's fitness score in the next generation.

Your mutations must be:
- Specific and actionable (not "make it better" but "tighten the jawline and add asymmetry to the left brow")
- Grounded in the evaluation feedback (address the weakest scores)
- Physical/visual in nature (things an image generation model can act on)
- Preserving what works (don't change high-scoring traits)

Return a JSON object:
{
  "mutations": ["mutation 1", "mutation 2", "mutation 3", "mutation 4", "mutation 5"],
  "adapted_prompt": "The full revised image generation prompt incorporating all mutations. This should be a complete, standalone prompt ready to send to the image model.",
  "strategy": "1-2 sentences explaining the overall adaptation strategy"
}
Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Original prompt: ${gen.prompt}

${bibleContext}

${scSummary}

Agent evaluations:
${evalSummary}

Based on these evaluations, suggest 5 specific visual mutations to improve this character's fitness, and produce an adapted prompt that incorporates them.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Adaptation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Adaptation failed" },
      { status: 500 }
    );
  }
}
