import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedCharacter {
  name: string;
  description: string;
  scenes: string[];
}

export interface ExtractedLocation {
  name: string;
  type: string; // INT/EXT
  description: string;
}

export interface ExtractedScene {
  name: string;
  description: string;
  characters: string[];
  location: string;
  order: number;
}

export interface ScriptExtraction {
  title: string;
  characters: ExtractedCharacter[];
  locations: ExtractedLocation[];
  scenes: ExtractedScene[];
  summary: string;
}

const EXTRACTION_PROMPT = `You are a professional script reader. Analyze the following script and extract structured data.

Return a JSON object with this exact shape:
{
  "title": "best guess at project/script title",
  "summary": "2-3 sentence summary of the story",
  "characters": [
    {
      "name": "CHARACTER NAME",
      "description": "Brief description — role, age if mentioned, key traits",
      "scenes": ["scene names this character appears in"]
    }
  ],
  "locations": [
    {
      "name": "LOCATION NAME",
      "type": "INT or EXT",
      "description": "Brief description of the setting"
    }
  ],
  "scenes": [
    {
      "name": "Scene heading or short label",
      "description": "What happens in this scene (2-3 sentences)",
      "characters": ["names of characters present"],
      "location": "location name",
      "order": 1
    }
  ]
}

Rules:
- Extract ALL named characters, even minor ones
- Extract ALL distinct locations
- Scenes should be in script order
- Character names should be consistent (pick one canonical name per character)
- Location names should match scene headings where possible
- Return ONLY valid JSON, no markdown wrapping`;

// Rough token estimate: ~4 chars per token
const CHARS_PER_TOKEN = 4;
const MAX_CHUNK_TOKENS = 25000; // Leave room for system prompt + response
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;

/** Split script at scene headings (lines starting with INT. or EXT.) near the size limit */
function chunkScript(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_CHARS) {
      chunks.push(remaining);
      break;
    }

    // Find the last scene heading before the limit
    const searchRegion = remaining.slice(0, MAX_CHUNK_CHARS);
    const lastSceneBreak = Math.max(
      searchRegion.lastIndexOf("\nINT."),
      searchRegion.lastIndexOf("\nEXT."),
      searchRegion.lastIndexOf("\nINT "),
      searchRegion.lastIndexOf("\nEXT "),
    );

    // If no scene break found, split at last newline
    const splitAt = lastSceneBreak > 0
      ? lastSceneBreak
      : searchRegion.lastIndexOf("\n") || MAX_CHUNK_CHARS;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  return chunks;
}

/** Merge multiple extraction results, deduplicating by name */
function mergeExtractions(results: ScriptExtraction[]): ScriptExtraction {
  if (results.length === 1) return results[0];

  const charMap = new Map<string, ExtractedCharacter>();
  const locMap = new Map<string, ExtractedLocation>();
  const allScenes: ExtractedScene[] = [];
  let title = "";
  const summaries: string[] = [];

  let sceneOrder = 0;
  for (const r of results) {
    if (!title && r.title) title = r.title;
    if (r.summary) summaries.push(r.summary);

    for (const c of r.characters) {
      const key = c.name.toUpperCase();
      if (charMap.has(key)) {
        // Merge scene lists
        const existing = charMap.get(key)!;
        existing.scenes = Array.from(new Set([...existing.scenes, ...c.scenes]));
        // Use longer description
        if (c.description.length > existing.description.length) {
          existing.description = c.description;
        }
      } else {
        charMap.set(key, { ...c });
      }
    }

    for (const l of r.locations) {
      const key = l.name.toUpperCase();
      if (!locMap.has(key)) {
        locMap.set(key, l);
      }
    }

    for (const s of r.scenes) {
      sceneOrder++;
      allScenes.push({ ...s, order: sceneOrder });
    }
  }

  return {
    title,
    summary: summaries[0] || "",
    characters: Array.from(charMap.values()),
    locations: Array.from(locMap.values()),
    scenes: allScenes,
  };
}

export async function extractScript(
  scriptText: string
): Promise<ScriptExtraction> {
  const chunks = chunkScript(scriptText);

  console.log(`[extract] Script: ${scriptText.length} chars, ${chunks.length} chunk(s)`);

  // Process chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map(async (chunk, i) => {
      const chunkLabel = chunks.length > 1
        ? `(Part ${i + 1} of ${chunks.length} — extract what you find in this section)`
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: `${chunkLabel}\n\n${chunk}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 8000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`No response from GPT-4o for chunk ${i + 1}`);

      return JSON.parse(content) as ScriptExtraction;
    })
  );

  return mergeExtractions(chunkResults);
}
