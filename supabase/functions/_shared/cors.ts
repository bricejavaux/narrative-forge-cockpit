export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function hasOpenAI(): boolean {
  return !!Deno.env.get('OPENAI_API_KEY');
}

export function hasLovableAI(): boolean {
  return !!Deno.env.get('LOVABLE_API_KEY');
}

export function hasOneDrive(): boolean {
  return !!Deno.env.get('LOVABLE_API_KEY') && !!Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');
}
