// Shared helper to call OpenAI directly from Edge Functions.
// Runtime AI provider for the application = OpenAI only.
// The key is read from Deno.env and never exposed to the frontend.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export type OpenAIOptions = {
  system?: string;
  user: string;
  json?: boolean;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
};

export type OpenAIResult = {
  ok: boolean;
  provider: 'openai';
  model: string;
  text?: string;
  parsed?: unknown;
  error?: string;
  status?: number;
  model_unavailable?: boolean;
};

export function hasOpenAIKey(): boolean {
  return !!Deno.env.get('OPENAI_API_KEY');
}

export function defaultOpenAIModel(): string {
  return Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
}

function isReasoningModel(model: string): boolean {
  // o-series / gpt-5 reasoning families typically accept `reasoning_effort`
  return /^o\d/.test(model) || /^gpt-5/.test(model);
}

export async function callOpenAI(opts: OpenAIOptions): Promise<OpenAIResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  const model = (opts.model && opts.model.trim()) || defaultOpenAIModel();
  if (!key) {
    return { ok: false, provider: 'openai', model, error: 'OPENAI_API_KEY missing' };
  }
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.user });

    const body: Record<string, unknown> = { model, messages };
    if (typeof opts.temperature === 'number') body.temperature = opts.temperature;
    if (typeof opts.maxOutputTokens === 'number') body.max_completion_tokens = opts.maxOutputTokens;
    if (opts.reasoningEffort && isReasoningModel(model)) body.reasoning_effort = opts.reasoningEffort;
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      const lower = text.toLowerCase();
      const model_unavailable =
        res.status === 404 ||
        lower.includes('model_not_found') ||
        lower.includes('does not exist') ||
        lower.includes('do not have access');
      return {
        ok: false,
        provider: 'openai',
        model,
        status: res.status,
        model_unavailable,
        error: `openai ${res.status}: ${text.slice(0, 400)}`,
      };
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    let parsed: unknown = undefined;
    if (opts.json && text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
      }
    }
    return { ok: true, provider: 'openai', model, text, parsed };
  } catch (e) {
    return {
      ok: false,
      provider: 'openai',
      model,
      error: e instanceof Error ? e.message : 'fetch_failed',
    };
  }
}
