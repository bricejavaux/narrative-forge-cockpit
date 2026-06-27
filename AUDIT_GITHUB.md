# Audit GitHub — narrative-forge-cockpit

Date d'audit : 2026-06-27  
Mode : lecture seule, sans action distante  
Référentiel : état local courant de la branche `main`, avec modifications non commitées prises en compte

## Verdict

**NO-GO** pour un test utilisateur réel avec données sensibles ou production narrative.

Les raisons bloquantes sont :

- écritures Supabase Edge Functions via service-role sans contrôle d'autorisation applicatif démontré ;
- politiques RLS ouvrant en lecture anonyme des données narratives et traces de production ;
- garde-fous incomplets autour du verrouillage, du versionnement et de la traçabilité `rewrite_tasks`.

## Périmètre audité

- Application React / TypeScript / Vite.
- Services frontend `src/services`.
- Pages et composants critiques : Production, Runs, Agents, Indexes, Audio, Canon, Characters, Exports.
- Edge Functions Supabase.
- Migrations Supabase, RLS, pgvector, tables de runs et production.
- Tests et scripts locaux déclarés dans `package.json`.

État Git observé :

- branche active : `main`;
- `main` disponible localement ;
- modifications non commitées : suppression locale de `github-code-audit-kit/*`, ajout non suivi de `.lovable/*`.

## Contrôles exécutés

| Contrôle | Résultat | Détail |
|---|---:|---|
| `npm run test -- --run` | OK | 3 fichiers, 10 tests passés |
| `npx tsc -p tsconfig.json --noEmit` | OK | aucune erreur TypeScript |
| `git diff --check` | OK | aucun whitespace error |
| `npm run lint` | ÉCHEC | 301 problèmes, 282 erreurs, 19 warnings |
| `npm run build` | Non exécuté | `vite build` écrit normalement des artefacts locaux (`dist`), incompatible avec le mode strict lecture seule |

## Constats

### [P0] Edge Functions d'écriture appelables sans contrôle d'autorisation applicatif

Preuve : `src/integrations/supabase/client.ts:5-11` utilise une clé publishable côté client ; `supabase/functions/connection-status/index.ts:160` déclare `auth_configured: false` ; `supabase/functions/governance-update/index.ts:74-87`, `supabase/functions/beats-persist/index.ts:10-25`, `supabase/functions/chapter-lock/index.ts:7-20` utilisent ensuite le service-role sans vérification d'acteur.  
Impact : un appelant disposant de la clé publique peut déclencher des écritures service-role : validation/rejet de beats, lock/reopen chapitre, persistance de beats, runs, imports ou indexation.  
Cause probable : le service-role contourne RLS sans garde JWT/rôle côté Edge Function.  
Correction : exiger un JWT utilisateur, refuser `anon`, vérifier rôle/ownership par action, journaliser `actor_id`.  
Test : appel anonyme à `chapter-lock`, `beats-persist` et `governance-update` doit retourner `401/403`; utilisateur autorisé doit réussir.  
Confiance : élevée.

### [P1] RLS expose en lecture anonyme les textes et traces de production

Preuve : `supabase/migrations/20260529214436_9309faa9-201a-4b8a-9f65-abac680086aa.sql:3-17` ouvre `chapters` à `anon` avec `USING (true)` ; `:7-25` fait pareil pour `beats` ; `supabase/migrations/20260613203526_cde092bb-7fb6-417c-ba98-92a64ec5d391.sql:4-31` ouvre `runs`, `run_outputs`, `audit_findings`, `rewrite_tasks`, `production_events`, `retrieval_logs` à `anon`.  
Impact : fuite possible du manuscrit, des prompts, sorties d'agent, diagnostics, tâches de réécriture et traces vectorielles.  
Cause probable : policies “Production Test” laissées ouvertes.  
Correction : supprimer `TO anon USING (true)`, limiter à `authenticated` et à un périmètre projet/rôle.  
Test : requête REST anonyme sur `chapters` et `run_outputs` doit être refusée ou vide ; utilisateur autorisé lit les lignes attendues.  
Confiance : élevée.

### [P1] Un chapitre verrouillé peut encore recevoir des modifications de beats

Preuve : `supabase/functions/beats-persist/index.ts:26-31` charge le chapitre sans lire `locked` ; `:110-115` met à jour/insère des beats ; `src/services/beatsService.ts:98-106` valide tous les beats via `governance-update` sans vérifier le verrou.  
Impact : un chapitre marqué verrouillé peut avoir ses entrées de génération altérées après verrouillage.  
Cause probable : le verrou est contrôlé dans `chapter-generate`, mais pas dans tous les chemins service-role.  
Correction : dans `beats-persist` et `governance-update`, refuser toute mutation de beats si le chapitre parent est `locked`.  
Test : verrouiller un chapitre puis appeler `beats-persist` ou `validateAllForChapter`; résultat attendu `409 locked`.  
Confiance : élevée.

### [P1] Le versionnement ne garantit pas la sauvegarde du texte remplacé

Preuve : `supabase/functions/chapter-generate/index.ts:17` lit `full_text` ; `:86-99` insère une nouvelle `chapter_versions` avec `ai.text` ; `:102` remplace `chapters.full_text`. Aucune version de l'ancien `full_text` n'est créée avant remplacement.  
Impact : un texte existant non déjà présent dans `chapter_versions` peut être perdu lors d'une génération.  
Cause probable : `chapter_versions` stocke la nouvelle version, pas le snapshot préalable.  
Correction : si `chapters.full_text` existe, insérer d'abord une version snapshot de l'état courant, puis écrire la nouvelle version.  
Test : créer un chapitre avec `full_text='ancienne version'`, générer, puis vérifier que `chapter_versions` contient l'ancien et le nouveau texte.  
Confiance : élevée.

### [P1] Les `rewrite_tasks` créées par un run ne sont pas reliées au run dans l'UI Runs

Preuve : `supabase/functions/run-execute/index.ts:186-199` insère les `rewrite_tasks` sans `metadata.run_id` ; `src/pages/RunsPage.tsx:124-129` n'affiche que les tâches dont `metadata.run_id` ou `metadata.source_finding_id` correspond.  
Impact : un run peut créer des tâches, mais la page Runs affiche “Aucune commande corrective créée depuis ce run”.  
Cause probable : contrat d'association non aligné entre backend et UI.  
Correction : ajouter `metadata: { run_id, source: 'run-execute' }` lors de l'insertion.  
Test : simuler un agent qui retourne `rewrite_tasks`; ouvrir le run; la tâche doit apparaître dans “Rewrite tasks liés”.  
Confiance : élevée.

## Suivi P1 après corrections locales

État vérifié sur le diff local depuis `HEAD` le 2026-06-27. Les fichiers concernés sont modifiés ou non suivis localement ; aucune validation distante Supabase n'a été effectuée.

### Correction incomplète — RLS anon

Correction observée : `supabase/migrations/20260627000000_fix_rls_remove_anon_read.sql` retire `anon` de `chapters`, `beats`, `runs`, `run_outputs`, `audit_findings`, `rewrite_tasks`, `production_events`, `production_units`, `production_validations` et `retrieval_logs`, puis recrée les policies en `TO authenticated`.

À corriger encore :

- la migration est non suivie Git (`?? supabase/migrations/20260627000000_fix_rls_remove_anon_read.sql`) et doit donc être ajoutée au prochain commit ;
- les policies restent `TO authenticated USING (true)` sans périmètre rôle/projet ;
- les lectures frontend directes avec clé publishable peuvent régresser si aucune session Supabase Auth n'existe réellement.

Test manquant :

- vérifier qu'un client anonyme ne peut plus lire `chapters`, `beats`, `run_outputs` et `rewrite_tasks` ;
- vérifier qu'un utilisateur authentifié autorisé peut encore charger Production et Runs.

### Correction validée — verrouillage des beats

Correction observée : `supabase/functions/beats-persist/index.ts` lit maintenant `locked` et retourne `409 chapter_locked`; `supabase/functions/governance-update/index.ts` bloque les mutations de `beats` si le chapitre parent est verrouillé.

À corriger encore : aucun blocage résiduel confirmé dans le code relu.

Test manquant :

- appeler `beats-persist` sur chapitre verrouillé et attendre `409`;
- appeler `governance-update` / `mark_validated` sur des beats d'un chapitre verrouillé et attendre `409`.

### Correction incomplète — versionnement avant remplacement

Correction observée : `supabase/functions/chapter-generate/index.ts` crée maintenant un snapshot de `chapters.full_text` avant d'insérer la nouvelle version et de remplacer `chapters.full_text`.

À corriger encore :

- l'insertion du snapshot n'est pas contrôlée ; si elle échoue, la génération continue et peut remplacer `chapters.full_text` sans sauvegarde préalable ;
- le test d'acceptation initial n'est pas couvert.

Correction minimale attendue :

- capturer l'erreur de l'insert snapshot et arrêter la génération si le snapshot échoue.

Test manquant :

- chapitre avec `full_text` existant : vérifier que l'ancien texte et le nouveau texte sont présents dans `chapter_versions` après génération ;
- simuler un échec d'insertion du snapshot et vérifier que `chapters.full_text` n'est pas remplacé.

### Correction validée — liaison `rewrite_tasks` aux runs

Correction observée : `supabase/functions/run-execute/index.ts` ajoute maintenant `metadata: { run_id, source: 'run-execute' }`, compatible avec le filtre de `src/pages/RunsPage.tsx`.

À corriger encore : aucun blocage résiduel confirmé dans le code relu.

Test manquant :

- simuler un agent qui retourne une `rewrite_task`, ouvrir le run dans Runs, vérifier que la tâche apparaît dans “Rewrite tasks liés”.

### [P2] L'UI annonce des capacités live/pending incohérentes

Preuve : `src/components/shared/QAActionRegistryPanel.tsx:91-93` marque “Persistance des runs (live)” comme `future` et “non implémentée”, alors que `supabase/functions/run-execute/index.ts:54-76` crée `runs` et `run_outputs` ; `src/components/shared/TestReadinessPanel.tsx:62` garde aussi `run_persistence` en `pending`.  
Impact : l'utilisateur ne sait pas si la persistance Runs est disponible ; décisions de test faussées.  
Cause probable : registres de capacité statiques non dérivés de `connection-status`.  
Correction : dériver l'état depuis `readiness.runs.pipeline_live` et `readiness.runs.run_execute_callable`.  
Test : avec tables accessibles, QA registry doit afficher `wired`; sans tables, `disabled` avec cause.  
Confiance : élevée.

### [P2] Audio affiche “Whisper live” sur preuve insuffisante

Preuve : `src/pages/AudioPage.tsx:93-99` marque `Upload Supabase Storage` live en dur et `Transcription Whisper` live si `openaiReady` ; `:119` affiche “Pipeline audio : capture + Whisper opérationnel”. Pourtant `supabase/functions/connection-status/index.ts:149-153` conditionne le pipeline à `audioBucket`, OpenAI et implémentation.  
Impact : capacité live annoncée sans preuve bucket/fonction/persistance.  
Cause probable : page Audio n'utilise pas `readiness.audio.pipeline_status`.  
Correction : baser les badges sur `readiness.audio.audio_bucket_exists`, `upload_available`, `openai_transcription_available`, `pipeline_status`.  
Test : OpenAI configuré mais bucket audio absent doit afficher `blocked`, pas `live`.  
Confiance : élevée.

### [P2] Couverture de tests insuffisante pour les flux critiques

Preuve : `src/test/production-flow-contract.test.ts:4-25` teste des objets inline, pas les services/fonctions ; `src/test/data-quality.test.ts:2-4` importe `dummyData`.  
Impact : les tests passent sans détecter les défauts de verrouillage, versionnement, RLS, liaison `rewrite_tasks` ou vérité “live”.  
Cause probable : tests de données démo plutôt que contrats métier.  
Correction : ajouter tests contractuels mockés pour `run-execute`, `chapter-generate`, `beats-persist`, statuts UI.  
Test : les cas de verrouillage, snapshot version, liaison run/task et statuts live doivent échouer avant correction puis passer.  
Confiance : élevée.

### [P2] Lint non conforme sur l'ensemble du dépôt

Preuve : `npm run lint` retourne 301 problèmes dont 282 erreurs ; exemples dans `src/components/production/ProductionBeatsWorkshop.tsx`, `src/services/supabaseService.ts`, `supabase/functions/run-execute/index.ts`, `tailwind.config.ts`.  
Impact : signal qualité dégradé ; les erreurs `any`, blocs vides et hooks incomplets masquent des bugs réels.  
Cause probable : dette TypeScript accumulée.  
Correction : traiter d'abord les fichiers de flux critique, puis ajuster les règles shadcn si nécessaire.  
Test : `npm run lint` doit sortir code 0.  
Confiance : élevée.

## Matrice des flux critiques

| Flux | UI | Backend | Base | Run | Gestion erreur / statut |
|---|---|---|---|---|---|
| Beats prévus | `ProductionBeatsWorkshop` | `beats-plan`, `beats-persist` | `beats` | partiel | manque garde `locked` |
| Validation beats | présente | `governance-update` | `beats.validation_status` | non systématique | service-role sans auth |
| Génération chapitre | Production / Runs | `chapter-generate` | `chapters`, `chapter_versions` | partiel | garde beats/lock OK, snapshot ancien KO |
| Runs agents | `RunsPage` | `run-execute` | `runs`, `run_outputs`, `audit_findings` | oui | `rewrite_tasks` non liées |
| pgvector | Indexes + agents | `vector-search`, ingest science only | `vector_chunks`, RPC | `retrieval_logs` | cohérent localement, distant non vérifié |
| Lock / reopen | bouton présent | `chapter-lock` + service direct ancien | `chapters.locked` | event seulement | pas de contrôle auth démontré |
| Rewrite tasks | panneaux présents | agent / run / manuel | `rewrite_tasks` | cassé pour linkage run | validation humaine conservée |
| Audio | page + composer | upload / transcribe / structure | `audio_notes`, `audio_transcripts` | non | live annoncé trop largement |
| Export | page live txt/md/json | `export-text` | `exports` | non | contenu manuel, presets démo |

## Points non vérifiables localement

- État réel Supabase distant et migrations effectivement appliquées.
- Secrets Edge Functions présents ou absents.
- Configuration déployée `verify_jwt`.
- Exécution réelle OpenAI, OneDrive, Storage et pgvector.
- Tests manuels navigateur.
- Build Vite, non exécuté en mode lecture seule.

Vérification recommandée :

1. Depuis un client anonyme, appeler les Edge Functions d'écriture et vérifier `401/403`.
2. Depuis REST anon, tester la lecture de `chapters`, `run_outputs`, `rewrite_tasks`.
3. Avec un utilisateur autorisé, rejouer un flux complet : beats persistés, validation, génération, run, rewrite task, lock.
4. Avec OpenAI configuré mais bucket audio absent, vérifier les badges Audio.
5. Avec embeddings absents, vérifier que pgvector reste `ready_no_embeddings` ou `pending_pgvector`.

## Plan de correction ordonné

Correctifs immédiats :

1. Bloquer les écritures Edge Functions sans authentification/autorisation.
2. Finaliser la fermeture des policies `anon` : ajouter la migration au commit, vérifier les lectures anonymes et le comportement avec session authentifiée.
3. Garder les protections `locked` sur tous les chemins beats/governance et ajouter les tests de non-régression.
4. Rendre atomique le snapshot de version avant génération : ne jamais remplacer `chapters.full_text` si le snapshot échoue.
5. Garder la liaison `rewrite_tasks` aux runs via `metadata.run_id` et ajouter le test d'affichage dans Runs.

Améliorations nécessaires :

6. Remplacer les statuts live statiques par `connection-status`.
7. Ajouter tests contractuels Production / Runs / Audio / pgvector.
8. Réduire les erreurs lint sur les modules critiques, puis globalement.
9. Clarifier les imports `dummyData` restants dans les pages non démo.

## Conclusion

Conclusion : **NO-GO**.

Le dépôt contient une chaîne fonctionnelle ambitieuse et plusieurs garde-fous déjà amorcés, notamment sur `chapter-generate`, pgvector science-only et la désactivation de réécriture autonome. Mais l'absence de contrôle d'autorisation démontré sur les Edge Functions service-role et l'ouverture anonyme de tables sensibles empêchent un test utilisateur réel en sécurité.
