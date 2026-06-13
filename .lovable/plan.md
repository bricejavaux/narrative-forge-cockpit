# Patch de consolidation — Narrative Forge Cockpit

Portée : stabilisation pour passage en test réel. **Pas** de refonte UI, **pas** de dummy data réintroduite, **pas** de bouton sans handler.

Le patch est livré en 7 lots cohérents. Chaque lot est atomique : si un lot casse quelque chose, on peut le rollback sans toucher les autres.

---

## Lot A — Source unique de vérité : statut chapitre + capacités

**Problème** : le Chapter Production Board reste gris parce que chaque composant recalcule son propre statut, et les compteurs « capacités à finaliser » divergent entre Header / Dashboard / Modal.

**Action** :
- Créer `src/lib/chapterProductionStatus.ts` exportant `getChapterProductionStatus(chapter, beats, auditFindings, rewriteTasks, exports)` retournant `Record<StageId, ProductionStatus>` avec les règles exactes de la spec §2.
- Créer `src/lib/capabilitiesReadiness.ts` exportant `getCapabilitiesReadiness(readiness)` retournant `{ blocking_production_test, blocking_chapter_production, future_intentional, live, disabled_intentional }`.
- Brancher `ChapterProductionBoard`, `ProductionFlowPanel`, `Dashboard` et `Header` sur ces deux fonctions. Supprimer les calculs locaux divergents.
- `CapabilitiesModal` et le badge Header lisent le même objet.

**Acceptation** : board passe au vert dès qu'il y a des beats persistés ; compteur Header = compteur Modal = compteur Dashboard.

---

## Lot B — Dashboard et Architecture : retirer la fabrication

**Dashboard** :
- Retirer profil utilisateur, cloche, « prochaines actions » non actionnables, doublons production flow, tout bouton de fabrication directe.
- Garder : connexions, OneDrive repo, Supabase repo (badge live), production flow (même calcul que Production), capacités à finaliser, derniers événements.
- Cartes = navigation simple vers la page concernée.

**Architecture Tome** :
- Bannière en haut : « Aucune génération ni persistance ici. Production = atelier de fabrication. »
- Retirer / désactiver les boutons « Preview OpenAI », « Persister », « Refresh » qui déclenchent du backend.
- Garder « Rafraîchir les données » (relecture Supabase pure) et ajouter un CTA principal « Ouvrir dans Production ».

---

## Lot C — Production : workflow beats sans bug

**Atelier beats** ordonné : Prévisualiser → Éditer → Persister → Valider → Auditer.

Corrections dans `ProductionBeatsWorkshop` :
- Preview n'écrit jamais en base ; un nouveau preview **remplace** le preview précédent du chapitre (clear state avant push).
- Le batch « Prévisualiser tous les chapitres » est déplacé en zone globale (haut de page), retiré de la zone détail.
- Au changement de chapitre : `useEffect([chapterId])` qui reset `previewBeats` et refetch `persistedBeats` pour le chapitre courant uniquement.
- Édition manuelle d'un beat : champs `title, objective, narrative_function, tension, consequence, canon_links, status` éditables.
- Suppression : si beat non persisté → retire du preview ; si persisté → DELETE en base + run.
- Supprimer la 2e liste de beats redondante en bas.
- Retirer les flèches haut/bas (faux affordance) sauf si on les branche réellement à un reorder persisté — décision : on les retire.

---

## Lot D — Runs traçables partout

**Backend** : standardiser `runs` + `run_outputs` pour toutes les actions listées §4. Migration : aucune (schéma déjà OK), uniquement enrichir `run-execute` et `beats-persist`/`beats-plan`/`audit-plan`/`chapter-generate` pour qu'ils écrivent un `run_output` systématique.

**Frontend** :
- Créer helper `src/services/runLinkService.ts` : `withRunLink(action)` retourne `{ runId, outputs[] }` et déclenche un toast avec lien « Voir le run » qui route vers `/runs?run=<id>`.
- `RunsPage` : ouvrir le détail à partir du query param. Afficher inputs / agent / modèle / contexte / output / erreur.
- Retirer le label « résultats non sauvegardés » dès lors que la fonction écrit dans runs/run_outputs.
- Boutons sans backend réel = `disabled` avec tooltip explicite, jamais cachés trompeusement.

---

## Lot E — Agents : modèle persisté + cockpit complet

**Bug central** : changer le modèle ne persiste pas, on retombe sur `gpt-4.1-mini`.

- Vérifier `agentsService.updateAgent` : doit faire un `UPDATE agents SET model = ...` ; à défaut, le créer (edge function `agents-update` si nécessaire pour passer par service role).
- `run-execute` : résolution modèle = `payload.model ?? agent.model ?? default` (déjà fait au Batch 4, vérifier que `agent.model` est bien lu depuis la table à chaque run).
- Liste de modèles : `gpt-4.1-mini`, `gpt-4.1`, `gpt-4.1-nano` (centralisée dans `src/lib/openaiModels.ts`).
- Agent Studio (panneau dans `AgentsPage`) : nom, statut, objectif, modèle (select persisté), prompt système (textarea), script JSON, index bindings, bouton « Tester » (crée run), bouton « Voir dans Runs ».
- Section « Futurs / désactivés » séparée.

---

## Lot F — pgvector : bindings live + génération avec contexte

- `connection-status` (déjà fait au Batch 1) expose `pgvector.status`. Vérifier que `agent_index_bindings` est lu et que le statut binding = `live` si l'index a des embeddings > 0, sinon `pending_pgvector`.
- `IndexesPage` : pour chaque index, afficher corpus, chunks, embeddings, dernière ingestion, statut, bouton test recherche. `follett` et `sf_portals_fiction` restent bloqués (déjà OK).
- `chapter-generate` : appeler `vector-search` pour récupérer le contexte des bindings de `agent_chapter_writer` ; si pgvector indispo, continuer la génération avec un flag `vector_context_used: false` dans le run_output.

---

## Lot G — Génération chapitre : garde-fous + version

`chapter-generate` :
- Refuse si aucun beat `status=validated` pour le chapitre → 409 avec message.
- Refuse si `chapter.locked = true` → 409.
- Crée une ligne `chapter_versions` avec le texte généré.
- Met à jour `chapters.full_text` uniquement après succès.
- Écrit un `run` + `run_output` avec `word_count`, `version_id`, `vector_context_used`, `beats_total`, `beats_validated`.
- Réponse renvoie `run_id` et `version_id` ; l'UI affiche « Voir run » + « Voir chapitre généré ».

Garde-fous équivalents côté UI (bouton désactivé + raison).

---

## Sections couvertes en passant (pas de lot dédié)

- **§8 Diagnostics** : ajouter bouton « Créer commande corrective » sur chaque finding → crée `rewrite_task` (déjà partiellement fait, à compléter sur Diagnostics).
- **§9 Audio** : rendre les cartes de notes persistées cliquables → ouvre un panneau détail avec transcription, structuration, actions. Pas de changement du pipeline.
- **§11 Nettoyage** : retirer mentions « dummy », anciens mocks, badges « requires OpenAI » quand la clé est présente.

---

## Hors scope explicite

- Pas de refonte design / palette.
- Pas de re-ingestion de `follett` ou `sf_portals_fiction`.
- Pas d'auto-rewrite : la validation humaine reste obligatoire partout.
- Pas de nouvelle table ; uniquement `chapter_versions` (existe déjà).

---

## Détails techniques

**Fichiers principalement touchés** :
- `src/lib/chapterProductionStatus.ts` (nouveau)
- `src/lib/capabilitiesReadiness.ts` (nouveau)
- `src/components/production/ChapterProductionBoard.tsx`
- `src/components/production/ProductionBeatsWorkshop.tsx`
- `src/components/shared/ProductionFlowPanel.tsx`
- `src/components/shared/CapabilitiesModal.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ArchitecturePage.tsx`
- `src/pages/ProductionPage.tsx`
- `src/pages/AgentsPage.tsx`
- `src/pages/RunsPage.tsx`
- `src/pages/IndexesPage.tsx`
- `src/pages/DiagnosticsPage.tsx`
- `src/pages/AudioPage.tsx`
- `src/services/agentsService.ts`
- `src/services/runLinkService.ts` (nouveau)
- `supabase/functions/run-execute/index.ts`
- `supabase/functions/chapter-generate/index.ts`
- `supabase/functions/beats-persist/index.ts`, `beats-plan/index.ts`, `audit-plan/index.ts` (ajout run_output systématique)

**Migrations** : aucune.

---

## Plan de livraison

Je propose de livrer en 2 vagues :
- **Vague 1** : Lots A + B + C (UX stabilisée, board correct, plus de boutons fantômes).
- **Vague 2** : Lots D + E + F + G (runs partout, modèle persisté, génération chapitre complète).

Confirme **« go vague 1 »**, **« go vague 2 »** ou **« go all »**.