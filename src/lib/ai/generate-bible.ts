import Anthropic from "@anthropic-ai/sdk";

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CharacterBible {
  role: string;
  archetype: string;
  age: string;
  essence: string;
  wound: string;
  desire: string;
  fear: string;
  notable_traits: string[];
  visual_description: string;
  voice: string;
}

export interface LocationBible {
  setting: string;
  period: string;
  tone: string;
  meaning_in_story: string;
  visual_description: string;
  atmosphere: string;
}

const CHARACTER_BIBLE_PROMPT = `You are a world-class character designer for film and television. Given a character description extracted from a script, generate a detailed character bible.

Return a JSON object with this exact shape:
{
  "role": "protagonist / antagonist / supporting / etc.",
  "archetype": "the core archetypal pattern (e.g. The Mentor, The Outlaw)",
  "age": "estimated age or age range",
  "essence": "one sentence capturing who this person IS at their core",
  "wound": "the deep hurt that drives their behavior",
  "desire": "what they consciously want",
  "fear": "what they're most afraid of (often connected to wound)",
  "notable_traits": ["3-5 distinctive behavioral or personality traits"],
  "visual_description": "how this person looks — face, build, carriage, energy. Be specific enough to generate an image.",
  "voice": "how they speak — cadence, vocabulary, what they avoid saying"
}

Be specific, not generic. Every field should feel like it could only belong to THIS character. The visual_description should be detailed enough for image generation — include ethnicity, build, distinguishing features, default expression, energy.

Return ONLY valid JSON.`;

const LOCATION_BIBLE_PROMPT = `You are a world-class production designer for film and television. Given a location description extracted from a script, generate a detailed location bible.

Return a JSON object with this exact shape:
{
  "setting": "specific type of place (e.g. 'abandoned industrial warehouse converted to illegal lab')",
  "period": "time period or era feel",
  "tone": "emotional/visual tone (e.g. 'clinical dread', 'faded grandeur')",
  "meaning_in_story": "what this place represents thematically",
  "visual_description": "detailed visual — lighting, materials, colors, key props, atmosphere. Specific enough to generate an image.",
  "atmosphere": "what it FEELS like to be in this space"
}

Be specific and cinematic. The visual_description should be detailed enough for image generation.

Return ONLY valid JSON.`;

export async function generateCharacterBible(
  name: string,
  description: string,
  scriptContext: string
): Promise<CharacterBible> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Character: ${name}\nDescription: ${description}\n\nScript context:\n${scriptContext}`,
      },
    ],
    system: CHARACTER_BIBLE_PROMPT,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  // Strip any markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as CharacterBible;
}

export async function generateLocationBible(
  name: string,
  description: string,
  scriptContext: string
): Promise<LocationBible> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Location: ${name}\nDescription: ${description}\n\nScript context:\n${scriptContext}`,
      },
    ],
    system: LOCATION_BIBLE_PROMPT,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as LocationBible;
}
