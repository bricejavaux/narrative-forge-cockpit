import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    const tome_id = url.searchParams.get('tome_id');

    const [chRes, plannedRes, observedRes, lockedRes, rewRes, expRes, canonRes] = await Promise.all([
      supabase.from('chapters').select('id,locked,production_status').maybeAlt(),
      supabase.from('beats').select('id,validation_status,beat_type').eq('beat_type', 'planned'),
      supabase.from('beats').select('id', { count: 'exact', head: true }).eq('beat_type', 'observed'),
      supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('locked', true),
      supabase.from('rewrite_tasks').select('id', { count: 'exact', head: true }),
      supabase.from('exports').select('id', { count: 'exact', head: true }),
      supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
    ].map((p: any) => p.maybeAlt ? supabase.from('chapters').select('id,locked,production_status') : p));

    const chapters = chRes.data ?? [];
    const planned = (plannedRes.data ?? []) as any[];
    const validated = planned.filter((b) => b.validation_status === 'validated').length;

    return json({
      tome_id,
      counts: {
        canon: canonRes.count ?? 0,
        chapters: chapters.length,
        planned_beats: planned.length,
        validated_beats: validated,
        observed_beats: observedRes.count ?? 0,
        locked_chapters: lockedRes.count ?? 0,
        rewrite_tasks: rewRes.count ?? 0,
        exports: expRes.count ?? 0,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
