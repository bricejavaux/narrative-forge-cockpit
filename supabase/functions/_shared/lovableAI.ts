// Shared helper to call the Lovable AI Gateway (OpenAI-compatible chat completions).
// Uses LOVABLE_API_KEY — no user-supplied OpenAI key required.

const ENDPOINT = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AICallOptions = {
  model?: string;
  messages: ChatMessage[];
  json?: boolean;
  temperature?: number;
};

export async function callLovableAI(opts: AICallOptions): Promise<{
  ok: boolean;
  text?: string;
  parsed?: unknown;
  error?: string;
  status?: number;
  model: string;
}> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  const model = opts.model ?? 'google/gemini-2.5-flash';
  if (!key) return { ok: false, error: 'LOVABLE_API_KEY missing', model };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `gateway ${res.status}: ${body.slice(0, 400)}`, status: res.status, model };
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
    return { ok: true, text, parsed, model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch_failed', model };
  }
}
