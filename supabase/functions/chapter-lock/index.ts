import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { chapter_id, action, reason } = await req.json();
    if (!chapter_id || !['lock', 'reopen'].includes(action)) {
      return json({ error: 'chapter_id and action (lock|reopen) required' }, 400);
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const locked = action === 'lock';
    const patch: any = {
      locked,
      production_status: locked ? 'locked' : 'reopened',
    };
    const { error } = await supabase.from('chapters').update(patch).eq('id', chapter_id);
    if (error) return json({ error: error.message }, 500);

    await supabase.from('production_events').insert({
      event_type: locked ? 'chapter_locked' : 'chapter_reopened',
      object_type: 'chapter',
      object_id: chapter_id,
      event_summary: reason ?? '',
      new_status: locked ? 'locked' : 'reopened',
    });

    return json({ ok: true, locked });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
