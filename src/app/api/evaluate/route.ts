import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SEGMENTS = ["converter", "evangelist", "skeptic", "genre_native"] as const;

const PERSONA_PROMPTS: Record<string, string> = {
  converter: `You are a mainstream viewer who doesn't normally watch this genre. You're female, 25-40, watch maybe 4 films a year (mostly drama/thriller). You value authenticity and emotional truth over spectacle. You're skeptical before you're warm. Evaluate honestly — negative reactions are as valuable as positive ones. Be specific, not generic.`,
  evangelist: `You are a passionate viewer who will tell 10 people if something hits. You're 18-35, highly online, the person who makes things go viral. You measure enthusiasm, not just enjoyment. You're looking for THE moment — the specific thing you'd describe to someone to get them to watch. Be specific about what works AND what doesn't.`,
  skeptic: `You are a highly resistant viewer. You look for reasons to disengage. You catch logic failures, pacing problems, derivative choices, and false notes. Your social agreeableness is LOW. If something doesn't work, say so directly and specifically. Do not soften criticism. Negative reactions are as valuable as positive ones.`,
  genre_native: `You are a genre expert who knows the conventions deeply. You validate whether genre contracts are honored while catching derivative choices. You appreciate innovation within genre constraints. You can tell the difference between a trope used well and one used lazily.`,
};

const EVALUATION_SCHEMA = `Respond with a JSON object with these exact fields:
{
  "instant_reaction": "your immediate, unfiltered gut reaction in 1-2 sentences",
  "trust_score": <0-10 integer — how much do you trust/believe in this character or world>,
  "distinctiveness": <0-10 integer — how original/unique vs generic>,
  "character_truth": "does this feel like a real person or a type? be specific",
  "would_watch": <true/false — would you keep watching based on this>,
  "compulsion_score": <0-10 integer — how urgently do you need to see what happens next>,
  "anticipation_load": <0-10 integer — how strong is the anticipatory pull>,
  "cost_felt": "what has the character lost or risked to get here",
  "evangelist_moment": "a specific moment you'd describe to get someone to watch, or null"
}
Return ONLY valid JSON.`;

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

    // Get object context (character/location bible)
    let contextText = `Object type: ${gen.object_type}\nPrompt: ${gen.prompt}`;

    if (gen.object_type === "character_face" || gen.object_type === "character_body") {
      const { data: char } = await supabase
        .from("characters")
        .select("name, bible")
        .eq("id", gen.object_id)
        .single();
      if (char) {
        contextText += `\nCharacter: ${char.name}\nBible: ${JSON.stringify(char.bible)}`;
      }
    } else if (gen.object_type === "location") {
      const { data: loc } = await supabase
        .from("locations")
        .select("name, bible")
        .eq("id", gen.object_id)
        .single();
      if (loc) {
        contextText += `\nLocation: ${loc.name}\nBible: ${JSON.stringify(loc.bible)}`;
      }
    }

    // Fan out to all 4 segments in parallel
    const evaluationPromises = SEGMENTS.map(async (segment) => {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `${PERSONA_PROMPTS[segment]}\n\n${EVALUATION_SCHEMA}`,
        messages: [
          {
            role: "user",
            content: `Evaluate this generated asset:\n\n${contextText}\n\nImage URL: ${gen.cloud_url || "(no image available — evaluate based on description)"}`,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "{}";
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const reaction = JSON.parse(cleaned);

      // Save to audience_reactions
      const { error } = await supabase.from("audience_reactions").upsert(
        {
          generation_id: generationId,
          segment,
          reaction,
          demographic_profile: { segment },
        },
        { onConflict: "generation_id,segment" }
      );

      if (error) throw error;
      return { segment, reaction };
    });

    const reactions = await Promise.all(evaluationPromises);

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}
