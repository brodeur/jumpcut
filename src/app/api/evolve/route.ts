import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );
}

/**
 * POST /api/evolve
 *
 * Autonomous Synthetic Character Evolution.
 * Runs the full loop: Generate → Evaluate → Score → Adapt → Breed → Select → Repeat
 *
 * Input: {
 *   projectId: string,
 *   objectId: string,
 *   objectType: string,
 *   seedPrompt: string,
 *   style?: string,
 *   iterations?: number (default 3),
 *   speciesPerGen?: number (default 2),
 * }
 *
 * Returns immediately with { runId }. Progress tracked in evolution_runs table.
 * The actual evolution runs in the background.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      projectId,
      objectId,
      objectType,
      seedPrompt,
      style = "35mm film",
      iterations = 3,
      speciesPerGen = 2,
    } = await req.json();

    if (!projectId || !objectId || !objectType || !seedPrompt) {
      return NextResponse.json(
        { error: "projectId, objectId, objectType, and seedPrompt are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Create the evolution run record
    const { data: run, error: runError } = await supabase
      .from("evolution_runs")
      .insert({
        project_id: projectId,
        object_id: objectId,
        object_type: objectType,
        status: "running",
        total_iterations: iterations,
        current_iteration: 0,
        surviving_ids: [],
        iteration_log: [],
      })
      .select()
      .single();

    if (runError) throw runError;

    // Return immediately — evolution runs in the background
    const runId = run.id;

    // Fire the evolution loop asynchronously
    runEvolution({
      runId,
      projectId,
      objectId,
      objectType,
      seedPrompt,
      style,
      iterations,
      speciesPerGen,
    }).catch((err) => {
      console.error(`[evolve] Run ${runId} failed:`, err);
      getSupabase()
        .from("evolution_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId)
        .then();
    });

    return NextResponse.json({ runId, status: "started", iterations });
  } catch (error) {
    console.error("Evolution start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start evolution" },
      { status: 500 }
    );
  }
}

// GET /api/evolve?runId=xxx — check status
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("evolution_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ---- The actual evolution loop ----

interface EvolutionParams {
  runId: string;
  projectId: string;
  objectId: string;
  objectType: string;
  seedPrompt: string;
  style: string;
  iterations: number;
  speciesPerGen: number;
}

async function runEvolution(params: EvolutionParams) {
  const { runId, objectId, objectType, seedPrompt, style, iterations, speciesPerGen } = params;
  const supabase = getSupabase();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";

  let currentPrompt = seedPrompt;
  let survivingIds: string[] = [];
  const iterationLog: Array<Record<string, unknown>> = [];

  console.log(`[evolve] Starting run ${runId}: ${iterations} iterations, ${speciesPerGen} species/gen`);

  for (let i = 0; i < iterations; i++) {
    console.log(`[evolve] Run ${runId} — Iteration ${i + 1}/${iterations}`);

    // Update progress
    await supabase
      .from("evolution_runs")
      .update({ current_iteration: i + 1 })
      .eq("id", runId);

    // Step 1: GENERATE — create species
    const genRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectId,
        objectType,
        prompt: currentPrompt,
        style,
        count: speciesPerGen,
        conditioningRefs: survivingIds,
      }),
    });

    if (!genRes.ok) {
      console.error(`[evolve] Generate failed at iteration ${i + 1}`);
      break;
    }

    const genData = await genRes.json();
    const genIds: string[] = genData.generations.map((g: { id: string }) => g.id);
    console.log(`[evolve] Generated ${genIds.length} species`);

    // Step 2: EVALUATE — score all species
    await Promise.all(
      genIds.map((gid) =>
        fetch(`${baseUrl}/api/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: gid }),
        })
      )
    );

    // Wait a moment for scores to settle
    await new Promise((r) => setTimeout(r, 2000));

    // Step 3: SCORE — read score cards and rank
    const scores: Array<{ id: string; overall: number }> = [];
    for (const gid of genIds) {
      const { data: rxns } = await supabase
        .from("audience_reactions")
        .select("reaction")
        .eq("generation_id", gid)
        .eq("segment", "score_card")
        .single();

      const overall = rxns ? Number((rxns.reaction as Record<string, unknown>).overall ?? 0) : 0;
      scores.push({ id: gid, overall });
    }

    // Include previous survivors for comparison
    for (const sid of survivingIds) {
      const { data: rxns } = await supabase
        .from("audience_reactions")
        .select("reaction")
        .eq("generation_id", sid)
        .eq("segment", "score_card")
        .single();

      const overall = rxns ? Number((rxns.reaction as Record<string, unknown>).overall ?? 0) : 0;
      scores.push({ id: sid, overall });
    }

    // Step 4: SELECT — keep top 2
    scores.sort((a, b) => b.overall - a.overall);
    survivingIds = scores.slice(0, 2).map((s) => s.id);

    console.log(`[evolve] Scores:`, scores.map((s) => `${s.id.slice(0, 8)}=${s.overall}`).join(", "));
    console.log(`[evolve] Survivors: ${survivingIds.map((s) => s.slice(0, 8)).join(", ")}`);

    // Log this iteration
    iterationLog.push({
      iteration: i + 1,
      generated: genIds,
      scores: scores.map((s) => ({ id: s.id, overall: s.overall })),
      survivors: survivingIds,
    });

    // Update run with current survivors
    await supabase
      .from("evolution_runs")
      .update({
        surviving_ids: survivingIds,
        iteration_log: iterationLog,
      })
      .eq("id", runId);

    // Step 5: ADAPT — get mutation suggestions from best survivor for next round
    if (i < iterations - 1) {
      try {
        const adaptRes = await fetch(`${baseUrl}/api/adapt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: survivingIds[0] }),
        });

        if (adaptRes.ok) {
          const adaptData = await adaptRes.json();
          currentPrompt = adaptData.adapted_prompt || currentPrompt;
          console.log(`[evolve] Adapted prompt for next gen: ${adaptData.strategy || "no strategy"}`);
        }
      } catch {
        console.log(`[evolve] Adaptation failed, keeping current prompt`);
      }
    }
  }

  // Mark complete
  await supabase
    .from("evolution_runs")
    .update({
      status: "complete",
      surviving_ids: survivingIds,
      iteration_log: iterationLog,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  console.log(`[evolve] Run ${runId} complete. Survivors: ${survivingIds.join(", ")}`);
}
