# Agents + Runs — strict implementation iteration

Goal: Agents = configure, Runs = execute/trace, Production = produce. No dummy data in Production Test. Every live agent execution goes through `run-execute`.

## 1. Inventory & checks (read-only first)

Before writing, verify the actual shapes of the persistence layer to avoid pretending things work:

- `supabase--read_query` on `information_schema.columns` for: `runs`, `run_outputs`, `audit_findings`, `rewrite_tasks`, `agents`, `agent_versions`, `agent_index_bindings`. Compare to section 13 of the brief; any missing column → migration in step 7.
- `supabase--read_query` on `pg_policies` for those same tables, confirm `authenticated` can `SELECT` (RunsPage reads them directly).
- Read `supabase/functions/agents-bootstrap/index.ts` to see what registry it currently seeds. Extend (idempotent upsert on `external_id`) to the 22 agents in section 3.
- Read `src/components/shared/PersistedAgentsPanel.tsx`, `src/pages/RunsPage.tsx`, `src/lib/openaiModels.ts` to align selectors and model lists.

## 2. AgentsPage — drop dummy operational path

- Remove `import { agents } from '@/data/dummyData'` and the entire local cards/detail block that consumes it.
- In Production Test, render only `<PersistedAgentsPanel />` as the operational catalogue.
- In Demo Mode (explicit), keep the legacy block but wrap it with a clear "Demo only — not used in Production Test" banner. Implementation: extract that JSX to `AgentsDemoCatalogue.tsx` and render it only when `isDemoMode()` is true.
- Empty state inside `PersistedAgentsPanel`: "Agent registry empty" + button "Initialiser les agents par défaut" → calls `agentsService.bootstrap()` then refetches.

## 3. agents-bootstrap — full 22-agent registry

Idempotent upsert by `external_id` for the 22 agents listed in section 3 of the brief, grouped by category (`extraction | generation | audit | diagnostic | rewrite | style | export`), with normalized `status` (`active | future`) and `criticality`. For each agent, upsert one current `agent_versions` row (`is_current = true`, `change_reason = 'initial bootstrap'`) and the relevant `agent_index_bindings` rows (e.g. world/character/arc/science/style/draft).

Future agents (chapter_draft, observed_beats, chapter_vs_beats, targeted_rewrite, style_polish, meta_tome_audit, export_preparation) are inserted with `status = 'future'` and `is_active = false` so `classifyAgentTestability` returns `future_disabled`.

## 4. Agent Studio cockpit upgrades (inside `PersistedAgentsPanel`)

- Header summary: total / active / testable_now / blocked / future_disabled / source=Supabase / OpenAI readiness.
- Filters: category, status, testability, requires_pgvector, can_run_now.
- Card: name, category, status, testability badge (from `classifyAgentTestability`), selected_model, recommended_model, permission_level, persistence_status, vector_context_status, last_run status.
- Detail panel sections: Identity / Purpose / Runtime (selected_model dropdown + temperature/max_tokens/reasoning_effort) / Script (system_prompt, operating_script, inputs_schema, outputs_schema — change_reason mandatory) / Dependencies / Governance / Version history (list, compare via side-by-side JSON, restore) / Test–Run (Test agent, Run on target, Open last run).
- Saving a script change calls `agentsService.saveVersion(agent_id, patch, change_reason)` — already exists.
- Test/Run buttons call `supabase.functions.invoke('run-execute', { run_type: 'run_selected_agent', agent_id, target_type, target_id, model })`. Never call `openai-agent-run` from this UI.

## 5. agentTestability — extend context

Wire real Supabase counts inside `PersistedAgentsPanel` once: chapters / canon_objects / characters / planned-beats / validated-beats / chapters with full_text. Pass to `classifyAgentTestability` along with `openaiReady` and `pgvectorActive`. Add `ready_for_production_workflow` status and `warnings[]` (e.g. science_index recommended). Return value already drives label + blockers.

## 6. RunsPage — technical trace layer

Already calls `run-execute`. Tighten:

- Top: tabs running / completed / failed / cancelled with counts.
- New-run form: run_type selector grouped (Available now / Future disabled) — disabled rows show reason from `FUTURE_RUN_TYPES`.
- Execution console for the active run: status, started_at, finished_at, duration, provider, model, error_message.
- Outputs panel: summary, findings list (severity badge, recommendation), rewrite_tasks list (pending), raw JSON in collapsible.
- Governance actions on findings: Accept / Create rewrite task / Mark acceptable / Ignore with reason → updates `audit_findings.status` and optionally inserts a `rewrite_tasks` row (status `pending`, `requires_validation = true`). On rewrite tasks: Edit / Reject / Mark resolved.

## 7. Schema/RLS migration (only if section 1 finds gaps)

If `runs` lacks `run_type | agent_version_id | provider | error_message`, or `audit_findings` lacks proper status enum, add a migration adding the missing columns with safe defaults. Keep existing permissive `authenticated USING(true)` policies (per security memory). If any SELECT policy is missing for `audit_findings` / `rewrite_tasks` / `run_outputs`, add it.

## 8. run-execute hardening

- Accept `agent_version_id` and persist it on the `runs` row.
- On failure, write `error_message` and a `run_outputs` row of `kind = 'error'` with `{ where, hint }` so the UI can show the exact failing function/table.
- Reject unknown `run_type` with explicit message (already done).

## 9. Production ↔ Runs link

`ProductionBeatsWorkshop` "Auditer les beats prévus du chapitre" already calls an agent path; switch it to `supabase.functions.invoke('run-execute', { run_type: 'audit_planned_beats', agent_id: <resolved external_id 'agent_audit_planned_beats'>, target_type: 'chapter', target_id })`. Show resulting findings inline + link "Voir dans Runs → /runs?run_id=…".

## 10. Cleanup pass

- `rg openaiService.runAgent` and `rg openai-agent-run` across `src/` — replace any operational UI call by `run-execute`. Keep `openaiService.runAgent` exported for an explicit "Low-level debug" toggle inside Runs only, labelled "Low-level debug only — not persisted."
- Remove "stubbed orchestration", "vector context pending" pseudo-status pills from operational panels (they remain only inside the Demo catalogue).

## 11. Acceptance verification

After implementation, run section 20's tests by checking:
- `PersistedAgentsPanel` empty-state → bootstrap → 22 rows visible.
- Save new version + restore: read `agent_versions` ordering.
- `Test agent` creates a `runs` row visible in `RunsPage`.
- Production audit creates a `runs` row visible in `RunsPage`.
- `rg` shows no operational UI path importing `openaiService.runAgent` outside the labelled debug component.

## Technical notes

- Model dropdown list lives in `src/lib/openaiModels.ts`. Add any missing IDs from section 7 (`gpt-5`, `gpt-5.4`, `gpt-5.5`, `o4-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`) with `availability: 'configurable'` for unverified ones so the "Disponibilité non garantie" hint shows automatically.
- `classifyAgentTestability` already returns blockers + next_action. Just thread real counts.
- Version compare can be a minimal two-column JSON diff (stringified) — no third-party diff lib.

## What is explicitly NOT in scope

- pgvector wiring
- chapter full-text generation
- autonomous rewrite
- any new top-level page
- moving Production actions to Runs
- new mock/demo data

Output of each phase is verified against acceptance tests before moving on.
