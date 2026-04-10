import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
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

    // Get the generation
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (genError || !gen) throw genError || new Error("Generation not found");

    if (star) {
      // For face and body: single star only (unstar previous)
      // For wardrobe: allow multiple stars (different outfits for different scenes)
      if (gen.object_type !== "wardrobe") {
        await supabase
          .from("generations")
          .update({ starred: false })
          .eq("object_id", gen.object_id)
          .eq("object_type", gen.object_type)
          .eq("starred", true);
      }

      // Star the selected one
      await supabase
        .from("generations")
        .update({ starred: true })
        .eq("id", generationId);

      // FALSE NEGATIVE DETECTION
      // Check if this generation scored significantly below the population average
      let falseNegative: { detected: boolean; suggestion?: string } = { detected: false };

      const { data: scoreCardRxn } = await supabase
        .from("audience_reactions")
        .select("reaction")
        .eq("generation_id", generationId)
        .eq("segment", "score_card")
        .single();

      if (scoreCardRxn) {
        const starredOverall = Number((scoreCardRxn.reaction as Record<string, unknown>).overall ?? 0);

        // Get all score cards for this object+type to compute population average
        const { data: allGens } = await supabase
          .from("generations")
          .select("id")
          .eq("object_id", gen.object_id)
          .eq("object_type", gen.object_type);

        if (allGens && allGens.length > 1) {
          const allScores: number[] = [];
          for (const g of allGens) {
            const { data: sc } = await supabase
              .from("audience_reactions")
              .select("reaction")
              .eq("generation_id", g.id)
              .eq("segment", "score_card")
              .single();
            if (sc) {
              allScores.push(Number((sc.reaction as Record<string, unknown>).overall ?? 0));
            }
          }

          if (allScores.length > 1) {
            const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
            const gap = avg - starredOverall;

            // If starred generation is >1.5 points below average, it's a false negative
            if (gap > 1.5) {
              console.log(`[star] False negative detected: starred=${starredOverall.toFixed(1)}, avg=${avg.toFixed(1)}, gap=${gap.toFixed(1)}`);

              // Ask Claude to suggest bible updates
              try {
                const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

                // Get the character bible
                let bibleText = "";
                if (gen.object_type === "character_face" || gen.object_type === "character_body") {
                  const { data: char } = await supabase
                    .from("characters")
                    .select("name, bible")
                    .eq("id", gen.object_id)
                    .single();
                  if (char) bibleText = `Character: ${char.name}\nBible: ${JSON.stringify(char.bible)}`;
                }

                // Get the agent rationales for this generation
                const { data: agentRxns } = await supabase
                  .from("audience_reactions")
                  .select("segment, reaction")
                  .eq("generation_id", generationId)
                  .neq("segment", "score_card")
                  .neq("segment", "neural");

                const lowScoreAgents = (agentRxns || [])
                  .filter((r) => Number((r.reaction as Record<string, unknown>).score ?? 10) < 5)
                  .map((r) => `${r.segment}: ${(r.reaction as Record<string, unknown>).key_observation || (r.reaction as Record<string, unknown>).rationale}`)
                  .join("\n");

                const resp = await anthropic.messages.create({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 800,
                  system: `You are a Bible Repair Agent. A human chose a character image that scored below average in automated evaluation. This means the evaluation system is missing something the human sees. Your job is to figure out WHAT the human sees that the Bible doesn't capture, and suggest specific updates to the Character Bible that would make future evaluations align with the human's judgment.

Return a JSON object:
{
  "diagnosis": "What quality does this image have that the Bible doesn't describe?",
  "bible_updates": ["Specific addition or change to the Bible, e.g. 'Add to notable_traits: permanently dilated left eye suggesting childhood trauma'"],
  "confidence": <0-10 how confident you are in this diagnosis>
}
Return ONLY valid JSON.`,
                  messages: [{
                    role: "user",
                    content: `The human starred this image (overall score: ${starredOverall.toFixed(1)}) over others that scored higher (avg: ${avg.toFixed(1)}).

${bibleText}

Image prompt: ${gen.prompt}
Image URL: ${gen.cloud_url}

Agents that scored this LOW:
${lowScoreAgents || "(none scored below 5)"}`,
                  }],
                });

                const text = resp.content[0].type === "text" ? resp.content[0].text : "{}";
                const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                const suggestion = JSON.parse(cleaned);

                falseNegative = {
                  detected: true,
                  suggestion: JSON.stringify(suggestion),
                };
              } catch (err) {
                console.error("Bible repair suggestion failed:", err);
                falseNegative = { detected: true };
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, falseNegative });
    } else {
      // Unstar
      await supabase
        .from("generations")
        .update({ starred: false })
        .eq("id", generationId);

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Star error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Star failed" },
      { status: 500 }
    );
  }
}
