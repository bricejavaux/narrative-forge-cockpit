// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const DEFAULT_AGENTS = [
  {
    external_id: 'extraction_canon',
    name: 'Extraction Canon',
    category: 'extraction',
    objective: "Extraire les objets canon (lore, règles, exceptions) depuis les fichiers source.",
    description: "Lit un fichier source OneDrive et propose des objets canon structurés. Aucune écriture sans validation humaine.",
    default_model: 'gpt-4.1-mini',
    selected_model: 'gpt-4.1-mini',
    quality_profile: 'balanced',
    permission_level: 'suggest_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'high',
    simulated_cost: 'low',
    status: 'live_test_available',
    system_prompt:
      "Tu extrais des objets canon. Retourne STRICTEMENT un JSON {canon_objects:[{title,category,summary,description,exceptions,criticality,rigidity}]}.",
    operating_script: [
      { step: 'load_source', detail: 'Charge le fichier OneDrive et son texte' },
      { step: 'extract_canon', detail: 'Appelle OpenAI pour extraire les objets canon' },
      { step: 'propose', detail: 'Crée des propositions import_job_items (pas d\'écriture directe)' },
    ],
    model_recommendations: { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' },
    bindings: [{ index_name: 'world_index', corpus_name: 'world', required: false }],
  },
  {
    external_id: 'extraction_personnages',
    name: 'Extraction Personnages',
    category: 'extraction',
    objective: 'Extraire les fiches personnages depuis personnages.txt.',
    description: 'Propose des personnages structurés à valider avant écriture.',
    default_model: 'gpt-4.1-mini',
    selected_model: 'gpt-4.1-mini',
    quality_profile: 'balanced',
    permission_level: 'suggest_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'high',
    simulated_cost: 'low',
    status: 'live_test_available',
    system_prompt:
      "Tu extrais des personnages. Retourne JSON {characters:[{name,role,function,apparent_goal,real_goal,flaw,secret,forbidden,emotional_trajectory,breaking_point}]}.",
    operating_script: [
      { step: 'load_source', detail: 'Charge personnages.txt' },
      { step: 'extract_characters', detail: 'OpenAI structure les fiches' },
      { step: 'propose', detail: 'Propositions à valider' },
    ],
    model_recommendations: { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' },
    bindings: [{ index_name: 'character_index', corpus_name: 'characters', required: false }],
  },
  {
    external_id: 'audit_tome',
    name: 'Audit Tome',
    category: 'audit',
    objective: 'Auditer la cohérence globale du tome (canon, arcs, personnages, beats).',
    description: 'Diagnostic complet, propose findings et recommandations. Aucune réécriture autonome.',
    default_model: 'gpt-4.1',
    selected_model: 'gpt-4.1',
    quality_profile: 'premium',
    permission_level: 'audit_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'high',
    simulated_cost: 'medium',
    status: 'live_test_available',
    system_prompt:
      "Tu audites un tome. Retourne JSON {summary, findings:[{title,severity,note}], recommendations:[], rewrite_tasks:[], scores:{}, warnings:[]}.",
    operating_script: [
      { step: 'load_context', detail: 'Canon + Personnages + Arcs + Chapitres' },
      { step: 'retrieve', detail: 'Si pgvector actif: top_k chunks pertinents par index lié' },
      { step: 'diagnostic', detail: 'OpenAI génère findings + scores' },
      { step: 'propose_tasks', detail: 'Crée rewrite_tasks (validation humaine requise)' },
    ],
    model_recommendations: { balanced: 'gpt-4.1-mini', premium: 'gpt-4.1', reasoning: 'o4-mini' },
    bindings: [
      { index_name: 'world_index', corpus_name: 'world', required: false },
      { index_name: 'character_index', corpus_name: 'characters', required: false },
      { index_name: 'draft_index', corpus_name: 'drafts', required: false },
    ],
  },
  {
    external_id: 'verification_science',
    name: 'Vérification Science',
    category: 'verification',
    objective: 'Vérifier la cohérence scientifique via science_portals.',
    description: 'Recherche dans science_index (pgvector) et propose corrections.',
    default_model: 'gpt-4.1-mini',
    selected_model: 'gpt-4.1-mini',
    quality_profile: 'balanced',
    permission_level: 'suggest_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'medium',
    simulated_cost: 'low',
    status: 'live_test_available',
    system_prompt:
      "Tu vérifies la cohérence scientifique. Cite tes sources science_portals. JSON {findings:[], recommendations:[], warnings:[]}.",
    operating_script: [
      { step: 'load_target_text', detail: 'Charge le passage à vérifier' },
      { step: 'retrieve_science', detail: 'top_k chunks de science_index' },
      { step: 'compare', detail: 'OpenAI compare et signale écarts' },
    ],
    model_recommendations: { fast: 'gpt-4.1-mini', premium: 'gpt-4.1', reasoning: 'o4-mini' },
    bindings: [{ index_name: 'science_index', corpus_name: 'science_portals', required: true }],
  },
  {
    external_id: 'suggestion_reecriture',
    name: 'Suggestion de réécriture',
    category: 'rewrite',
    objective: 'Proposer des réécritures ciblées (jamais appliquées sans validation).',
    description: 'Génère une proposition de réécriture (rewrite_tasks).',
    default_model: 'gpt-4.1',
    selected_model: 'gpt-4.1',
    quality_profile: 'premium',
    permission_level: 'suggest_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'high',
    simulated_cost: 'medium',
    status: 'live_test_available',
    system_prompt:
      "Tu proposes une réécriture courte. JSON {proposal, diff_notes, warnings}. Pas d'application directe.",
    operating_script: [
      { step: 'load_target', detail: 'Texte cible + instruction' },
      { step: 'retrieve_style', detail: 'Style index si actif (privé)' },
      { step: 'propose', detail: 'Crée une rewrite_task pending' },
    ],
    model_recommendations: { balanced: 'gpt-4.1-mini', premium: 'gpt-4.1', reasoning: 'o4-mini' },
    bindings: [{ index_name: 'style_index', corpus_name: 'follett', required: false }],
  },
  {
    external_id: 'analyse_impact_canon',
    name: 'Analyse d\'impact Canon',
    category: 'impact',
    objective: 'Analyser l\'impact d\'une modification canon sur chapitres/personnages/arcs.',
    description: 'Propose des modifications structurelles (jamais appliquées automatiquement).',
    default_model: 'gpt-4.1-mini',
    selected_model: 'gpt-4.1-mini',
    quality_profile: 'balanced',
    permission_level: 'suggest_only',
    persistence_status: 'suggestions_only',
    vector_context_status: 'pending_pgvector',
    rewrite_rights: false,
    criticality: 'high',
    simulated_cost: 'low',
    status: 'live_test_available',
    system_prompt:
      "Tu analyses l'impact d'un changement canon. JSON {impacts:[{impact_type,severity,affected_object_type,affected_object_id,proposed_action,proposed_payload}]}.",
    operating_script: [
      { step: 'load_canon_change', detail: 'Diff canon avant/après' },
      { step: 'scan_dependencies', detail: 'Chapitres, personnages, arcs, beats' },
      { step: 'propose_impacts', detail: 'Crée impact_analysis rows pending' },
    ],
    model_recommendations: { balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' },
    bindings: [
      { index_name: 'world_index', corpus_name: 'world', required: false },
      { index_name: 'character_index', corpus_name: 'characters', required: false },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const created: string[] = [];
    const skipped: string[] = [];

    for (const tpl of DEFAULT_AGENTS) {
      // upsert by external_id
      const { data: existing } = await supa.from('agents').select('id').eq('external_id', tpl.external_id).maybeSingle();
      let agentId = existing?.id;
      if (!agentId) {
        const { data: ins, error: insErr } = await supa
          .from('agents')
          .insert({
            external_id: tpl.external_id,
            name: tpl.name,
            category: tpl.category,
            objective: tpl.objective,
            description: tpl.description,
            default_model: tpl.default_model,
            selected_model: tpl.selected_model,
            quality_profile: tpl.quality_profile,
            permission_level: tpl.permission_level,
            persistence_status: tpl.persistence_status,
            vector_context_status: tpl.vector_context_status,
            rewrite_rights: tpl.rewrite_rights,
            criticality: tpl.criticality,
            simulated_cost: tpl.simulated_cost,
            status: tpl.status,
            is_active: true,
          })
          .select('id')
          .single();
        if (insErr) { skipped.push(`${tpl.external_id}:${insErr.message}`); continue; }
        agentId = ins.id;
        created.push(tpl.external_id);
      } else {
        skipped.push(tpl.external_id);
      }

      // ensure at least one current version
      const { data: anyVersion } = await supa.from('agent_versions').select('id').eq('agent_id', agentId).limit(1).maybeSingle();
      if (!anyVersion) {
        await supa.from('agent_versions').insert({
          agent_id: agentId,
          version_number: 1,
          objective: tpl.objective,
          system_prompt: tpl.system_prompt,
          operating_script: tpl.operating_script,
          inputs_schema: {},
          outputs_schema: {},
          model_recommendations: tpl.model_recommendations,
          index_bindings: tpl.bindings,
          parameters: {},
          permission_policy: { permission_level: tpl.permission_level, rewrite_rights: tpl.rewrite_rights },
          created_by: 'bootstrap',
          change_reason: 'initial seed',
          is_current: true,
        });
      }

      // bindings
      for (const b of tpl.bindings) {
        await supa.from('agent_index_bindings').upsert(
          {
            agent_id: agentId,
            index_name: b.index_name,
            corpus_name: b.corpus_name,
            required: b.required,
            top_k: 8,
            similarity_threshold: 0.72,
            status: 'pending_pgvector',
          },
          { onConflict: 'agent_id,index_name' },
        );
      }
    }

    return json({ ok: true, created, skipped, total: DEFAULT_AGENTS.length });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
