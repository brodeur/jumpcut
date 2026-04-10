import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, context, mode } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      mode === "in-context"
        ? `You are an AI assistant embedded in JUMP//CUT, an Integrated Filmmaking Environment. The user has selected a specific object on the canvas. Here is the full context for this object:\n\n${context}\n\nAnswer questions about this specific object. Be concise and actionable. If the user asks about audience reactions or generation suggestions, frame your answers in terms of what would improve the creative output.`
        : `You are an AI assistant embedded in JUMP//CUT, an Integrated Filmmaking Environment. You have access to the full project context:\n\n${context}\n\nAnswer questions about the entire project. You can compare characters, analyze audience reactions across the project, identify structural patterns, and suggest improvements. Be concise and specific.`;

    const stream = await getAnthropic().messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
