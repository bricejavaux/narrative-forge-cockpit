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
};

export type OpenAIResult = {
  ok: boolean;
  provider: 'openai';
  model: string;
  text?: string;
  parsed?: unknown;
  error?: string;
  status?: number;
};

export function hasOpenAIKey(): boolean {
  return !!Deno.env.get('OPENAI_API_KEY');
}

export function defaultOpenAIModel(): string {
  return Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
}

export async function callOpenAI(opts: OpenAIOptions): Promise<OpenAIResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  const model = opts.model ?? defaultOpenAIModel();
  if (!key) {
    return { ok: false, provider: 'openai', model, error: 'OPENAI_API_KEY missing' };
  }
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.user });

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        provider: 'openai',
        model,
        status: res.status,
        error: `openai ${res.status}: ${body.slice(0, 400)}`,
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
          try {
            parsed = JSON.parse(m[0]);
          } catch {
            // ignore
          }
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
