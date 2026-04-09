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

export async function extractScript(
  scriptText: string
): Promise<ScriptExtraction> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: scriptText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from GPT-4o");

  return JSON.parse(content) as ScriptExtraction;
}
