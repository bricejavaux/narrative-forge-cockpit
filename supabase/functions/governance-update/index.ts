// deno-lint-ignore-file
// Governance-controlled write path. Frontend cannot trust UPDATE RLS policies
// for validation actions, so this Edge Function applies human-approved patches
// using the service role with traceability.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

type TargetTable = 'canon_objects' | 'characters';
type Action = 'mark_validated' | 'mark_reviewed' | 'mark_index_refresh_required' | 'apply_note_patch';

const ALLOWED_TABLES: TargetTable[] = ['canon_objects', 'characters'];

const CANON_PATCH_FIELDS = new Set([
  'summary', 'description', 'exceptions', 'criticality', 'rigidity', 'index_associated', 'source_reference',
]);
const CHAR_PATCH_FIELDS = new Set([
  'role', 'function', 'apparent_goal', 'real_goal', 'flaw', 'secret', 'forbidden',
  'emotional_trajectory', 'breaking_point',
]);

function sb() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizePatch(table: TargetTable, patch: Record<string, any> | undefined): Record<string, any> {
  if (!patch || typeof patch !== 'object') return {};
  const allowed = table === 'canon_objects' ? CANON_PATCH_FIELDS : CHAR_PATCH_FIELDS;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

async function tryLog(client: ReturnType<typeof sb>, payload: Record<string, any>) {
  try {
    await client.from('logs').insert({
      level: 'info', source: 'governance-update', message: 'governance-update applied', payload,
    });
  } catch { /* logs table optional */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { target_table, record_ids, action, patch, note_context } = body ?? {};

    if (!ALLOWED_TABLES.includes(target_table)) return json({ error: 'invalid target_table' }, 400);
    if (!Array.isArray(record_ids) || record_ids.length === 0) return json({ error: 'record_ids required' }, 400);
    if (!['mark_validated', 'mark_reviewed', 'mark_index_refresh_required', 'apply_note_patch'].includes(action)) {
      return json({ error: 'invalid action' }, 400);
    }
    if (action === 'mark_index_refresh_required' && target_table !== 'canon_objects') {
      return json({ error: 'mark_index_refresh_required only valid for canon_objects' }, 400);
    }

    const client = sb();
    const now = new Date().toISOString();
    let basePatch: Record<string, any> = { updated_at: now };

    if (action === 'mark_validated') {
      basePatch = { ...basePatch, validation_status: 'validated', needs_review: false };
    } else if (action === 'mark_reviewed') {
      basePatch = { ...basePatch, needs_review: false };
    } else if (action === 'mark_index_refresh_required') {
      basePatch = { ...basePatch, needs_index_refresh: true };
    }

    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    let sample: any = null;

    if (action === 'apply_note_patch') {
      const cleanPatch = sanitizePatch(target_table, patch);
      for (const id of record_ids) {
        try {
          const { data: cur, error: readErr } = await client.from(target_table).select('metadata').eq('id', id).maybeSingle();
          if (readErr) { failed.push({ id, error: readErr.message || 'read failed' }); continue; }
          const meta = (cur?.metadata && typeof cur.metadata === 'object') ? cur.metadata : {};
          const nextMeta = {
            ...meta,
            last_note_patch: { applied_at: now, patch: cleanPatch, note_context: note_context ?? null },
          };
          const finalPatch: Record<string, any> = { ...basePatch, ...cleanPatch, metadata: nextMeta, needs_review: true };
          const { data, error } = await client.from(target_table).update(finalPatch).eq('id', id).select('id').maybeSingle();
          if (error) failed.push({ id, error: error.message });
          else if (data) { updated.push(id); if (!sample) sample = { id, patch: cleanPatch }; }
        } catch (e) {
          failed.push({ id, error: e instanceof Error ? e.message : 'unknown' });
        }
      }
    } else {
      const { data, error } = await client.from(target_table).update(basePatch).in('id', record_ids).select('id');
      if (error) {
        return json({ mode: 'live', action, target_table, updated: 0, failed: record_ids.length, errors: [error.message], sample: null }, 200);
      }
      for (const r of (data ?? [])) updated.push((r as any).id);
      sample = (data ?? []).slice(0, 3);
    }

    await tryLog(client, { action, target_table, record_ids, patch, updated_count: updated.length, failed_count: failed.length });

    return json({
      mode: 'live', action, target_table,
      updated: updated.length, failed: failed.length,
      updated_ids: updated, errors: failed, sample,
    }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
