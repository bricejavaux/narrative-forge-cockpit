## Pre-connection stabilization pass

This is a large structural pass before connecting OpenAI, Supabase and OneDrive. I'll keep all existing routes, the editorial pastel design and reusable components untouched, and focus on data correction, explicit linking, richer simulation and code structure.

### Scope summary

1. **Canon corrections in characters & chapters**
   - Rewrite Brice's secret (Lagrange-4 04:17 witness, ΔS non-noisy, regulation-like behavior, chose silence — no "Pinch-off from inside")
   - Rewrite Amina (science & dignity, not SAS doctor)
   - Rewrite Karim (UN treaty weaver, not intelligence)
   - Rewrite Mila (finance / fund / term sheet / automated tolls / capture)
   - Refine secondaries: Jonas Rieck as Movery chief security; Anvers syndical leader; SAS operator (separate); Éléa & Alice
   - Apply requested macro/micro chapter scale corrections (ch1 micro, ch4 macro, ch7 macro, ch8 mixte, ch10 macro, ch12 macro, etc.)

2. **Explicit object linking**
   - Add `linkedChapterIds`, `linkedCharacterIds`, `linkedArcIds`, `linkedAssetIds`, `linkedAudioNoteIds` to canon rules, characters, arcs, audio notes
   - Populate explicit links (Lagrange-4, Walvis Bay, SAS, Trust, Trace) instead of slice-based generic links
   - Update `CanonPage`, `CharactersPage`, `ArchitecturePage` to consume explicit IDs

3. **Diagnostics rewrite**
   - Replace "tome 2" / "conspiration" copy with project-specific language
   - Each score block shows: why this score, narrative risk, recommendation, linked chapters/arcs/audio, proposed rewrite task
   - Add dimensions: Lagrange-4 → Walvis Bay hierarchy, macro/micro alternation, one tech detail per scene, cost per activation, phrase-couteau ending, B+ Trace non-humanized, system log consistency

4. **Architecture enrichment**
   - Chapters table: macro/micro, main arc, cost type, technical detail focus, phrase-couteau status, audio review
   - Beats tab: 3–5 simulated beats per selected chapter
   - Revelations/Payoffs: setup, payoff, delay, risk, status, related arc
   - Consequences: open consequences by chapter (political/social/physical/biosecurity/family)

5. **Audio & reviews enrichment**
   - Filters: target type / status / treatment status
   - "Remarks not yet taken into account" panel
   - Text + voice review available on each item

6. **Assets & Indexes**
   - Explicit OneDrive sources: `articulation.txt`, `personnages.txt`, `cover.jpg`, `follett/chroma.sqlite3`, `science_portals/chroma.sqlite3`, `sf_portals_fiction/chroma.sqlite3`, simulated EPUB/PDF refs
   - Chroma files labelled as OneDrive technical archive (not active Supabase index), with "migration/re-vectorization required" status
   - Indexes: linked assets, linked agents, freshness, status, pending refresh, queue, migration strategy
   - Two future technical options: re-vectorize from sources / extract chunks+embeddings from existing Chroma archives

7. **Settings readiness sections**
   - Supabase / OpenAI / OneDrive readiness
   - Audio retention, transcription validation, index refresh, rewrite governance, run logging, human validation, export priority
   - Note the 3-layer architecture (Supabase active / OneDrive sources & archives / OpenAI intelligence)

8. **Code restructure (non-breaking)**
   - Split `src/data/dummyData.ts` into per-domain files in `src/data/` (project, connectors, chapters, characters, arcs, canon, agents, runs, diagnostics, audioNotes, assets, indexes, exports)
   - Keep `src/data/dummyData.ts` as a barrel re-export so existing pages keep importing unchanged
   - Create `src/types/` with shared interfaces
   - Create mocked service stubs (no network): `openaiService.ts`, `supabaseService.ts`, `oneDriveService.ts`, `audioTranscriptionService.ts`, `indexingService.ts`, `exportService.ts`

9. **Data quality vitest tests**
   - Every chapter has a main arc
   - Every critical canon rule has an index
   - Every character has role/function/trajectory/linked chapters
   - Every agent references existing future indexes
   - Every audio note has a target
   - Every explicit linked ID points to an existing object

### Out of scope
- No real API connections (OpenAI, Supabase, OneDrive)
- No real transcription / vector search / export
- No visual redesign — current pastel editorial design preserved
- No route/layout changes

### Technical details

- Backward compatibility kept via `src/data/dummyData.ts` barrel: pages don't need import path changes
- New explicit-link fields are additive; existing slice-based code paths are replaced where the linking is used
- Services are typed stubs that return mocked promises so future wiring is a swap, not a rewrite

This is a sizable pass touching ~15 files. Ready to execute on approval.