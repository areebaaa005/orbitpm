import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_INPUT_CHARS = 6000; // keep prompts small — cheaper, faster, less to leak

export async function generateContent(prompt: string): Promise<string> {
  if (!env.geminiApiKey) {
    throw ApiError.badRequest(
      'AI_NOT_CONFIGURED',
      'AI features are not available: no Gemini API key is configured'
    );
  }

  const trimmedPrompt = prompt.slice(0, MAX_INPUT_CHARS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: trimmedPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw ApiError.internal(`AI provider error (${res.status}): ${errBody.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw ApiError.internal('AI provider returned an empty response');
    }
    return text as string;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw ApiError.internal('AI request timed out — please try again');
    }
    if (err instanceof ApiError) throw err;
    throw ApiError.internal('AI request failed');
  } finally {
    clearTimeout(timeout);
  }
}

/** Strips markdown code fences the model sometimes wraps JSON in. */
export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw ApiError.internal('AI returned a response that could not be parsed');
  }
}
