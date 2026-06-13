# Patch fonctionnel majeur — plan d'exécution

Patch volumineux mais cadré. Aucune refonte UI, aucun dummy réintroduit, validation humaine conservée. Je propose ce découpage en 6 batches livrables séparément, dans cet ordre. Dis-moi simplement "go batch 1" (ou tous) et j'exécute.

## Batch 1 — Socle pgvector (Parties 1 + 2)

Migration Supabase idempotente :
- `create extension if not exists vector`
- Compléter `vector_chunks` avec colonnes manquantes (`corpus`, `chunk_ordinal`, `chunk_hash`, `embedding_model`, `updated_at`) + contrainte unique `(corpus, source_path, chunk_hash)` + CHECK non-vide.
- Index btree (corpus, index_name, source_package_id) + index vectoriel `vector_chunks_embedding_idx` (hnsw si dispo, sinon ivfflat).
- RPC `match_vector_chunks(query_embedding, match_index_name, match_corpus, match_count, min_similarity)` retournant le schéma demandé (remplace la version actuelle qui n'a pas la signature corpus/min_similarity).
- RLS : lecture authenticated/anon contrôlée, écriture service_role only.

Edge functions :
- `vector-ingest-package` : enrichir l'existant avec hashing stable, dry_run réel, blocage explicite `follett` et `sf_portals_fiction` (erreur 403 doctrine), log dans `import_jobs`.
- `vector-search` : aligner sur nouvelle signature RPC (corpus + min_similarity), forcer `text-embedding-3-small`.
- `connection-status` : retourner le bloc `pgvector` complet (extension_ready, table_ready, rpc_ready, embedding_count_total, embedding_count_by_index, default_embedding_model, status).

## Batch 2 — UI Indexes (Partie 3)

Refondre `IndexesPage.tsx` (composant existant uniquement) :
- Header readiness pgvector (4 badges + compteurs).
- Bloc `science_portals` : statut + Ingest + Dry run + zone test recherche sémantique (input query, top_k, résultats lisibles).
- Bloc `follett` et `sf_portals_fiction` : carte "ingestion désactivée — droits/usage non validés", pas de bouton actif.
- Nettoyage du wording obsolète.

## Batch 3 — Agents spécialisés (Parties 4 + 5)

Migration : ajout colonnes manquantes sur `agents` si besoin (`slug`, `category`, `objective`, `recommended_models`, `operating_script`, `index_bindings`, `output_schema`, `requires_openai`, `requires_pgvector`, `version`).

Edge function `agents-bootstrap` étendue : upsert idempotent des 11 agents spécialisés (beat_planner, chapter_writer, audit_planned_beats, audit_chapter_vs_beats, extract_observed_beats, canon_consistency, character_consistency, style_pass, science_density, rewrite_planner, meta_tome_audit). **Champs personnalisés (selected_model, system_prompt édité) préservés** — merge sur champs manquants uniquement, confirmation requise pour overwrite.

`PersistedAgentsPanel.tsx` : afficher catégorie, objectif, modèles recommandés, index bindings + statut pgvector par index, bouton "Tester agent" qui appelle `run-execute` et renvoie run_id/modèle/vector_context_used + lien Runs. Désactivation si requires_pgvector et pgvector non live.

## Batch 4 — Run engine + Runs page (Parties 6 + 7)

`run-execute` consolidé :
- Charge agent par slug, calcule `effective_model` selon la cascade demandée.
- Charge contexte Supabase selon `target_type` (chapter/beat/character/canon_object).
- Si `use_vector_context` : itère `agent.index_bindings`, appelle `vector-search` par binding, agrège `retrieved_chunks_count`.
- Appel OpenAI, validation JSON best-effort vs `output_schema`.
- Persiste `runs` (avec `effective_model`, `vector_context_used`, `retrieved_chunks_count`), `run_outputs`, `audit_findings` si présents, `rewrite_tasks` en `pending_review` si présents — jamais d'application auto.
- Erreur → status failed + stage explicite, pas de fail silencieux.

`RunsPage.tsx` : colonnes manquantes (modèle, vector_context_used, chunks count, duration). Détail run : contexte cible, chunks retrieved, JSON output repliable, findings + boutons "Créer commande corrective" / "Accepter" / "Marquer traité". Deep-link `?run_id=` déjà présent — vérifier qu'il ouvre le détail.

## Batch 5 — Génération de chapitre (Parties 8 + 9 + 10)

Edge function `chapter-generate` réécrite :
- Préconditions : chapter existe, beats prévus tous `validation_status=validated`, canon/characters accessibles, OpenAI live, pgvector OK si bindings required.
- Charge contexte vectoriel via bindings de `agent_chapter_writer`.
- Prompt strict (pas de méta, pas de plan apparent).
- Sauvegarde : crée `chapter_versions` avant overwrite de `chapters.full_text`, met `production_status=draft_generated`.
- Crée run + run_output liés.

`ProductionPage.tsx` / `ProductionBeatsWorkshop` :
- Bouton "Générer chapitre" après beats validés (désactivé sinon, prérequis affichés).
- Barre d'avancement (étapes contexte → vector → OpenAI → save → run).
- Après génération : extrait + boutons "Ouvrir chapitre", "Voir run", "Extraire beats observés", "Auditer chapitre vs beats" — aucun déclenchement automatique.
- Zone "Chapitre généré" : full_text editable, word count, dernier modèle, dernier run_id, statut étendu, lock/unlock conditionnel (full_text + observed extracted OU audit ignoré explicite + 0 finding critique + validation humaine).

Architecture Tome : confirmer read-only (pas de bouton génération/persistance beats), ajouter "Ouvrir dans Production".

## Batch 6 — Diagnostics governance (Partie 11)

`DiagnosticsPage.tsx` : déjà partiellement en place. Compléter pour que chaque recommandation live produise une carte avec 3 actions (Créer commande corrective → `rewrite_tasks` pending_review + source=diagnostic + source_run_id ; Accepter sans action ; Ignorer). Aucune application directe au canon/personnages/chapitre.

## Contraintes appliquées partout

- Aucun "live" sans capacité réellement opérationnelle (status calculé depuis `connection-status`).
- Pas de masquage d'erreur, pas de pending vague à la place d'un blocked.
- Aucune écriture sensible côté frontend, tout via Edge Functions.
- `follett` et `sf_portals_fiction` bloqués au niveau ingest function + UI.

## Acceptance tests (Partie 12)

Tests A-E joués manuellement après chaque batch concerné. Je documente les résultats attendus dans `.lovable/plan.md` au fil de l'eau.

---

**Validation demandée** : confirme "go all" pour exécution séquentielle des 6 batches, ou "go batch N" pour livraison incrémentale. Je recommande l'incrémental : batch 1 d'abord (socle pgvector) pour valider que la couche basse fonctionne avant d'enchaîner.
