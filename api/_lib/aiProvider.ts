export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiProviderErrorKind = "rate_limited" | "blocked" | "provider_error";

export class AiProviderError extends Error {
  readonly kind: AiProviderErrorKind;

  constructor(message: string, kind: AiProviderErrorKind) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
  }
}

const FLASH_LITE = "gemini-3.5-flash-lite";
const FLASH = "gemini-3.5-flash";

/**
 * Each kind of AI call the app makes, with its own model setting, so a cheap, frequent call (a
 * Persona's reply) and a rare, important one (a Feedback Summary) can use different models
 * without a code change. Hints, transcription and Insights have no endpoint yet; their settings
 * exist so those endpoints only have to name their job.
 *
 * Keep in step with `.env.example`, which documents each setting and its default.
 */
const JOB_MODEL_SETTINGS = {
  conversation: { envVar: "AI_MODEL_CONVERSATION", defaultModel: FLASH_LITE },
  hint: { envVar: "AI_MODEL_HINT", defaultModel: FLASH_LITE },
  written_reply_verdict: { envVar: "AI_MODEL_WRITTEN_REPLY_VERDICT", defaultModel: FLASH_LITE },
  transcription: { envVar: "AI_MODEL_TRANSCRIPTION", defaultModel: FLASH_LITE },
  feedback_summary: { envVar: "AI_MODEL_FEEDBACK_SUMMARY", defaultModel: FLASH },
  insight: { envVar: "AI_MODEL_INSIGHT", defaultModel: FLASH },
} satisfies Record<string, { envVar: string; defaultModel: string }>;

export type AiJob = keyof typeof JOB_MODEL_SETTINGS;

/** An env var's trimmed value, or `undefined` when it's unset or blank (as `NAME=` leaves it). */
function readSetting(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * The job's own setting wins; unset, the shared `AI_MODEL` applies, so a deployment that only
 * sets `AI_MODEL` keeps using that one model everywhere; with neither, the job's default.
 */
function modelForJob(job: AiJob): string {
  const { envVar, defaultModel } = JOB_MODEL_SETTINGS[job];
  return readSetting(envVar) ?? readSetting("AI_MODEL") ?? defaultModel;
}

export async function callAiProvider(messages: ChatMessage[], job: AiJob): Promise<{ content: string }> {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  if (provider !== "gemini") {
    throw new AiProviderError(`Unsupported AI_PROVIDER "${provider}".`, "provider_error");
  }

  return callGemini(messages, modelForJob(job));
}

async function callGemini(messages: ChatMessage[], model: string): Promise<{ content: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError("The server is not configured with an AI provider API key.", "provider_error");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "(Begin the conversation in character.)" }] });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {}),
      }),
    });
  } catch {
    throw new AiProviderError("Failed to reach the AI provider.", "provider_error");
  }

  if (response.status === 429) {
    throw new AiProviderError("The AI provider rate limit was hit.", "rate_limited");
  }

  if (!response.ok) {
    throw new AiProviderError(`The AI provider responded with status ${response.status}.`, "provider_error");
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };

  // Gemini can answer with HTTP 200 and still have nothing usable: its own safety filter can
  // block the whole prompt (promptFeedback.blockReason) or just the reply (finishReason
  // "SAFETY"), and either way there's no content to read. That's a different situation for the
  // user than a malformed or empty reply, so it gets its own error kind and message.
  const isBlocked =
    data.promptFeedback?.blockReason !== undefined || data.candidates?.[0]?.finishReason === "SAFETY";
  if (isBlocked) {
    throw new AiProviderError(
      "The AI can't respond to that message. Try rephrasing it, or end the conversation to see your feedback so far.",
      "blocked",
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new AiProviderError(
      "The AI didn't send back a reply that time. Try again, or end the conversation to see your feedback so far.",
      "provider_error",
    );
  }

  return { content: text };
}
