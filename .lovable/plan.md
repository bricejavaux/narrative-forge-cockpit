## Phase 2C — Nettoyage UI & clarté opérationnelle

La spec est très large (15 sections). Plutôt que tout toucher d'un coup et risquer des régressions, je propose **3 vagues** alignées sur les 3 contrôles que tu cites explicitement : **Dashboard nettoyé**, **Production utilisable**, **Audio clarifié**.

Les autres sections (Agents registry complet, Runs, Diagnostics, Exports auto, Settings sliders persistés, Indexes/pgvector roadmap) viendront en **vagues 4–5**, après validation visuelle des 3 premières.

---

### Vague 1 — Dashboard cockpit + Header (cette itération)

**Header (`src/components/layout/Header.tsx`)**
- Retirer la cloche notifications.
- Retirer le badge "capacités à finaliser" si bruyant — ou simplifier à un compteur cliquable propre.
- Garder : projet/tome, Production Test badge, badge readiness (live partiel / hybride / mock).

**DashboardPage (`src/pages/DashboardPage.tsx`)**
- Supprimer : NextBestActionPanel, fake narrative health, weak chapters mock, arcs at risk mock, recent runs mock, cost/latency mock, doublons de la chaîne de production.
- Garder uniquement :
  1. Bandeau readiness (OpenAI / Supabase / OneDrive / pgvector pending / audio status)
  2. ConnectionReadinessPanel (fusionné si doublon avec "Sources")
  3. OneDriveRepositoryPanel
  4. SupabaseRepositoryPanel (avec diagnostic technique replié par défaut, pas d'alerte rouge si tout est OK ou empty)
  5. ProductionFlowPanel compact (une seule chaîne, cliquable)
  6. Blocker list compact (groupé : bloque Production Test / bloque Chapter Production / futur)
  7. Latest real events (import_jobs réels) — sinon empty state, jamais de fake.

**SupabaseRepositoryPanel ajustements**
- Statut `live` (vert) quand tables core readable même si count=0 ≠ alerte.
- Bandeau rouge seulement si table requise vraiment en erreur RLS/missing.

---

### Vague 2 — Production Page workshop

**ProductionPage (`src/pages/ProductionPage.tsx`)**
- Une seule chaîne visuelle (12 étapes), cliquable, surlignant l'étape sélectionnée.
- Retirer dummy chapters (`mockChapters` fallback) — afficher empty state propre si pas de chapters live.
- Améliorer ChapterProductionBoard : couleurs statut (vert/ambre/rouge/bleu/gris) sur beats, audit, lock.
- Section "Planned Beats" enrichie :
  - bouton "Générer beats — chapitre sélectionné"
  - bouton "Générer beats — tous chapitres" (avec confirmation)
  - bouton "Valider tous les beats du chapitre"
  - bouton "Auditer beats du chapitre"
- Sélecteur de mode (recommandé : "Balanced narrative beats" badge).

---

### Vague 3 — Audio honnête

**AudioPage + MicButton**
- Détecter si MediaRecorder est réellement câblé. Sinon :
  - MicButton retiré ou désactivé avec tooltip "Upload audio uniquement".
  - Statut Whisper passe à `pending` au lieu de `live` tant que pipeline n'a pas tourné end-to-end.
- Séparer visuellement :
  - **Capture** : texte / upload fichier / micro navigateur (si dispo)
  - **Cible** : Canon / Character / Chapter / Beat / Diagnostic
  - **Structuration** : OpenAI → JSON + résumé humain
  - **Validation humaine** : accept / edit / reject
  - **Application** : patch / tâche / commentaire

---

### Vagues 4–5 (itérations suivantes, hors scope ici)

- Agents registry complet (21 agents par défaut, statuts testable/requires).
- Runs page recentrée sur logs/batch.
- Diagnostics actionnables (accept/reject/create task).
- Exports auto depuis Supabase.
- Settings sliders persistés + retrait alerte .env obsolète.
- Pgvector roadmap visible (lecture seule).

---

### Ce que je vais faire dans CETTE réponse

Seulement la **Vague 1** (Dashboard + Header). C'est le changement le plus visible et le moins risqué, et il pose la doctrine UI pour les suivantes. Une fois validé visuellement, on enchaîne Vague 2 puis Vague 3 dans des itérations courtes.

**Fichiers touchés vague 1 :**
- `src/components/layout/Header.tsx` (retrait cloche)
- `src/pages/DashboardPage.tsx` (retraits + restructuration)
- `src/components/shared/SupabaseRepositoryPanel.tsx` (statut live si OK, pas d'alerte fausse)

Confirme et j'enchaîne immédiatement.
