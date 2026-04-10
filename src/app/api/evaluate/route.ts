import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { EVAL_AGENTS, computeScoreCard } from "@/lib/ai/eval-agents";

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { generationId } = await req.json();
    if (!generationId) {
      return NextResponse.json(
        { error: "generationId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get generation + context
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (genError || !gen) throw genError || new Error("Generation not found");

    // Build rich context from bible
    let contextText = `Object type: ${gen.object_type}\nPrompt: ${gen.prompt}`;

    if (gen.object_type === "character_face" || gen.object_type === "character_body") {
      const { data: char } = await supabase
        .from("characters")
        .select("name, bible")
        .eq("id", gen.object_id)
        .single();
      if (char) {
        contextText += `\nCharacter: ${char.name}\nCharacter Bible: ${JSON.stringify(char.bible)}`;
      }
    } else if (gen.object_type === "location") {
      const { data: loc } = await supabase
        .from("locations")
        .select("name, bible")
        .eq("id", gen.object_id)
        .single();
      if (loc) {
        contextText += `\nLocation: ${loc.name}\nLocation Bible: ${JSON.stringify(loc.bible)}`;
      }
    } else if (gen.object_type === "scene") {
      const { data: scene } = await supabase
        .from("scenes")
        .select("name, description")
        .eq("id", gen.object_id)
        .single();
      if (scene) {
        contextText += `\nScene: ${scene.name}\nDescription: ${scene.description}`;
      }
    }

    const imageRef = gen.cloud_url
      ? `Image URL: ${gen.cloud_url}`
      : "(no image available — evaluate based on description)";

    // Run 10 evaluation agents in batches of 5 to avoid rate limits
    const agentResults: Array<{ agentId: string; score: number; rationale: string; key_observation: string }> = [];

    for (let batch = 0; batch < EVAL_AGENTS.length; batch += 5) {
      const batchAgents = EVAL_AGENTS.slice(batch, batch + 5);

      const batchResults = await Promise.all(
        batchAgents.map(async (agent) => {
          try {
            const response = await getAnthropic().messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 500,
              system: agent.systemPrompt,
              messages: [
                {
                  role: "user",
                  content: `Evaluate this generated character/asset:\n\n${contextText}\n\n${imageRef}`,
                },
              ],
            });

            const text = response.content[0].type === "text" ? response.content[0].text : "{}";
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);

            return {
              agentId: agent.id,
              score: Number(parsed.score ?? 5),
              rationale: String(parsed.rationale ?? ""),
              key_observation: String(parsed.key_observation ?? ""),
            };
          } catch (err) {
            console.error(`Agent ${agent.id} failed:`, err);
            return { agentId: agent.id, score: 5, rationale: "Evaluation failed", key_observation: "" };
          }
        })
      );

      agentResults.push(...batchResults);
    }

    // Compute score card
    const agentScores: Record<string, number> = {};
    for (const r of agentResults) {
      agentScores[r.agentId] = r.score;
    }
    const scoreCard = computeScoreCard(agentScores);

    // Save each agent result as an audience_reaction
    for (const r of agentResults) {
      const { error } = await supabase.from("audience_reactions").upsert(
        {
          generation_id: generationId,
          segment: r.agentId,
          reaction: {
            score: r.score,
            rationale: r.rationale,
            key_observation: r.key_observation,
            agent_vector: EVAL_AGENTS.find((a) => a.id === r.agentId)?.vector,
          },
          demographic_profile: {
            agent_name: EVAL_AGENTS.find((a) => a.id === r.agentId)?.name,
            vector: EVAL_AGENTS.find((a) => a.id === r.agentId)?.vector,
          },
        },
        { onConflict: "generation_id,segment" }
      );
      if (error) console.error(`Save error for ${r.agentId}:`, error);
    }

    // Save the aggregate score card as a special "score_card" reaction
    await supabase.from("audience_reactions").upsert(
      {
        generation_id: generationId,
        segment: "score_card",
        reaction: scoreCard,
        demographic_profile: { type: "aggregate", agent_count: agentResults.length },
      },
      { onConflict: "generation_id,segment" }
    );

    // TRIBE v2 neural evaluation — fire and forget
    const tribeUrl = process.env.TRIBE_API_URL;
    if (tribeUrl && gen.cloud_url) {
      (async () => {
        try {
          const resp = await fetch(tribeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: gen.cloud_url }),
            signal: AbortSignal.timeout(170000),
          });

          if (!resp.ok) { console.error("TRIBE error:", resp.status); return; }

          const tribeResult = await resp.json();
          const neuralReaction = {
            ...tribeResult.scores,
            overall_engagement: tribeResult.overall_engagement,
            score: tribeResult.overall_engagement,
            rationale: `Neural prediction based on predicted fMRI brain activation patterns.`,
            key_observation: `Emotional arousal: ${tribeResult.scores.emotional_arousal}/10, Reward anticipation: ${tribeResult.scores.reward_anticipation}/10`,
          };

          const { createClient: createSB } = await import("@supabase/supabase-js");
          const sb = createSB(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
          await sb.from("audience_reactions").upsert(
            { generation_id: generationId, segment: "neural", reaction: neuralReaction, demographic_profile: { type: "tribe_v2" } },
            { onConflict: "generation_id,segment" }
          );
          console.log(`[TRIBE] Neural saved for ${generationId}`);
        } catch (err) {
          console.error("TRIBE fire-and-forget failed:", err);
        }
      })();
    }

    return NextResponse.json({
      scoreCard,
      agents: agentResults,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}
