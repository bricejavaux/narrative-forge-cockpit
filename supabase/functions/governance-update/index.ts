// deno-lint-ignore-file
// Governance-controlled write path. Frontend cannot trust UPDATE RLS policies
// for validation actions, so this Edge Function applies human-approved patches
// using the service role with traceability.
// Phase 2B: extended to chapters and beats.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

type TargetTable = 'canon_objects' | 'characters' | 'chapters' | 'beats';
type Action =
  | 'mark_validated'
  | 'mark_reviewed'
  | 'mark_rejected'
  | 'mark_locked'
  | 'mark_index_refresh_required'
  | 'apply_note_patch';

const ALLOWED_TABLES: TargetTable[] = ['canon_objects', 'characters', 'chapters', 'beats'];

const PATCH_FIELDS: Record<TargetTable, Set<string>> = {
  canon_objects: new Set(['summary', 'description', 'exceptions', 'criticality', 'rigidity', 'index_associated', 'source_reference']),
  characters: new Set(['role', 'function', 'apparent_goal', 'real_goal', 'flaw', 'secret', 'forbidden', 'emotional_trajectory', 'breaking_point']),
  chapters: new Set(['title', 'scale', 'main_arc', 'cost_type', 'technical_detail', 'phrase_couteau']),
  beats: new Set(['title', 'objective', 'narrative_function', 'decision_made', 'consequence', 'revelation', 'payoff', 'required_detail']),
};

const ALLOWED_ACTIONS_BY_TABLE: Record<TargetTable, Action[]> = {
  canon_objects: ['mark_validated', 'mark_reviewed', 'mark_index_refresh_required', 'apply_note_patch'],
  characters: ['mark_validated', 'mark_reviewed', 'apply_note_patch'],
  chapters: ['mark_validated', 'mark_reviewed', 'mark_locked', 'mark_index_refresh_required', 'apply_note_patch'],
  beats: ['mark_validated', 'mark_reviewed', 'mark_rejected', 'apply_note_patch'],
};

function sb() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizePatch(table: TargetTable, patch: Record<string, any> | undefined): Record<string, any> {
  if (!patch || typeof patch !== 'object') return {};
  const allowed = PATCH_FIELDS[table];
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
  try {
    await client.from('production_events').insert({
      event_type: `governance_${payload.action}`,
      object_type: payload.target_table,
      event_summary: `${payload.action} on ${payload.target_table} x${payload.updated_count ?? 0}`,
      metadata: payload,
    });
  } catch { /* events optional */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { target_table, record_ids, action, patch, note_context } = body ?? {};

    if (!ALLOWED_TABLES.includes(target_table)) return json({ error: 'invalid target_table' }, 400);
    if (!Array.isArray(record_ids) || record_ids.length === 0) return json({ error: 'record_ids required' }, 400);
    const allowedForTable = ALLOWED_ACTIONS_BY_TABLE[target_table as TargetTable];
    if (!allowedForTable.includes(action)) {
      return json({ error: `action '${action}' not allowed for ${target_table}` }, 400);
    }

    const client = sb();
    const now = new Date().toISOString();
    let basePatch: Record<string, any> = { updated_at: now };
    const hasNeedsReview = target_table === 'canon_objects' || target_table === 'characters';

    if (action === 'mark_validated') {
      basePatch = { ...basePatch, validation_status: 'validated' };
      if (hasNeedsReview) basePatch.needs_review = false;
    } else if (action === 'mark_reviewed') {
      if (hasNeedsReview) basePatch.needs_review = false;
      else basePatch.validation_status = 'reviewed';
    } else if (action === 'mark_rejected') {
      basePatch = { ...basePatch, validation_status: 'rejected' };
    } else if (action === 'mark_locked') {
      basePatch = { ...basePatch, locked: true };
    } else if (action === 'mark_index_refresh_required') {
      basePatch = { ...basePatch, needs_index_refresh: true };
    }

    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    let sample: any = null;

    if (action === 'apply_note_patch') {
      const cleanPatch = sanitizePatch(target_table as TargetTable, patch);
      for (const id of record_ids) {
        try {
          const { data: cur, error: readErr } = await client.from(target_table).select('metadata').eq('id', id).maybeSingle();
          if (readErr) { failed.push({ id, error: readErr.message || 'read failed' }); continue; }
          const meta = (cur?.metadata && typeof cur.metadata === 'object') ? cur.metadata : {};
          const nextMeta = {
            ...meta,
            last_note_patch: { applied_at: now, patch: cleanPatch, note_context: note_context ?? null },
          };
          const finalPatch: Record<string, any> = { ...basePatch, ...cleanPatch, metadata: nextMeta };
          if (hasNeedsReview) finalPatch.needs_review = true;
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
