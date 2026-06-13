import { useEffect, useRef, useState } from 'react';
import { productionFlowService, type StageState } from '@/services/productionFlowService';
import ProductionFlowDiagram from '@/components/production/ProductionFlowDiagram';
import ChapterProductionBoard, { ChapterBoardLegend } from '@/components/production/ChapterProductionBoard';
import LockReopenButton from '@/components/production/LockReopenButton';
import ProductionBeatsWorkshop from '@/components/production/ProductionBeatsWorkshop';
import { chapterProductionService } from '@/services/chapterProductionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Play, Loader2, ExternalLink } from 'lucide-react';
import type { ProductionStatus } from '@/lib/productionDoctrine';
import { getChapterProductionStatus, type StageMap } from '@/lib/chapterProductionStatus';

export default function ProductionPage() {
  const [stages, setStages] = useState<StageState[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [stageStatusesByChapterId, setStageStatusesByChapterId] = useState<Record<string, StageMap>>({});
  const [smokeRunning, setSmokeRunning] = useState(false);
  const [smokeResult, setSmokeResult] = useState<{ run_id?: string; error?: string } | null>(null);
  const workshopRef = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [s, ch] = await Promise.all([
      productionFlowService.computeFlowState(),
      supabase.from('chapters')
        .select('id, number, title, locked, production_status, metadata, full_text, scale, main_arc')
        .order('number', { ascending: true }).limit(50),
    ]);
    setStages(s);
    const live = (ch.data ?? []) as any[];
    setChapters(live);
    if (live.length > 0 && !selectedChapter) setSelectedChapter(live[0]);
    if (live.length === 0) setSelectedChapter(null);

    // Compute per-chapter stage statuses from real Supabase data
    if (live.length > 0) {
      const ids = live.map((c) => c.id);
      const [plannedRows, observedRows, findingRows, taskRows] = await Promise.all([
        supabase.from('beats')
          .select('id, chapter_id, status, validation_status, title, objective, narrative_function, consequence')
          .in('chapter_id', ids).eq('beat_type', 'planned').neq('status', 'deleted'),
        supabase.from('beats').select('id, chapter_id').in('chapter_id', ids).eq('beat_type', 'observed'),
        supabase.from('audit_findings').select('id, target_id, status').eq('target_type', 'chapter').in('target_id', ids),
        supabase.from('rewrite_tasks').select('id, target_id, status').eq('target_type', 'chapter').in('target_id', ids),
      ]);
      const byCh: Record<string, StageMap> = {};
      for (const c of live) {
        const pl = (plannedRows.data ?? []).filter((r: any) => r.chapter_id === c.id);
        const complete = pl.filter((r: any) => r.title && r.objective && r.narrative_function && r.consequence).length;
        const validated = pl.filter((r: any) => r.validation_status === 'validated').length;
        const obs = (observedRows.data ?? []).filter((r: any) => r.chapter_id === c.id).length;
        const fAll = (findingRows.data ?? []).filter((r: any) => r.target_id === c.id);
        const fClosed = fAll.filter((r: any) => ['accepted', 'closed', 'task_created', 'acceptable_as_is', 'ignored'].includes(r.status)).length;
        const tAll = (taskRows.data ?? []).filter((r: any) => r.target_id === c.id);
        const tDone = tAll.filter((r: any) => ['done', 'accepted', 'applied'].includes(r.status)).length;
        const tOpen = tAll.filter((r: any) => ['pending', 'open', 'in_progress'].includes(r.status)).length;
        byCh[c.id] = getChapterProductionStatus(c, {
          planned: { total: pl.length, complete, validated },
          observed: obs,
          findings: { total: fAll.length, closed: fClosed },
          rewriteTasks: { total: tAll.length, done: tDone, open: tOpen },
        });
      }
      setStageStatusesByChapterId(byCh);
    } else {
      setStageStatusesByChapterId({});
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const selectChapter = (c: any) => {
    setSelectedChapter(c);
    setSmokeResult(null);
    setTimeout(() => workshopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const runChapterSmokeTest = async () => {
    if (!selectedChapter) return;
    const statuses = stageStatusesByChapterId[selectedChapter.id];
    const hasPlanned = statuses && statuses.planned_beats && statuses.planned_beats !== 'not_started';
    if (!hasPlanned) {
      setSmokeResult({ error: 'Beats persistés requis' });
      return;
    }
    setSmokeRunning(true); setSmokeResult(null);
    try {
      // Find an audit_planned_beats agent
      const { data: agents } = await supabase.from('agents').select('id, external_id, name')
        .ilike('external_id', '%audit_planned_beats%').eq('is_active', true).limit(1);
      const agent = agents?.[0];
      const { data: plannedBeats } = await supabase.from('beats').select('*')
        .eq('chapter_id', selectedChapter.id).eq('beat_type', 'planned').neq('status', 'deleted');
      const { data, error } = await supabase.functions.invoke('run-execute', {
        body: {
          run_type: agent ? 'audit_planned_beats' : 'run_selected_agent',
          agent_id: agent?.id ?? null,
          target_type: 'chapter',
          target_id: selectedChapter.id,
          mode: 'live',
          instruction: `Audit beats persistés du chapitre #${selectedChapter.number} — ${selectedChapter.title}`,
          payload: { chapter: selectedChapter, planned_beats: plannedBeats ?? [] },
        },
      });
      if (error || (data as any)?.error) {
        setSmokeResult({ error: error?.message ?? (data as any)?.error ?? 'erreur run-execute' });
      } else {
        const run_id = (data as any)?.run_id;
        setSmokeResult({ run_id });
        toast({ title: 'Run créé', description: run_id ? `Run ${String(run_id).slice(0, 8)} créé` : 'Run lancé' });
      }
    } catch (e) {
      setSmokeResult({ error: e instanceof Error ? e.message : String(e) });
    } finally { setSmokeRunning(false); }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Pipeline narrative</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Production Flow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Canon → Architecture → Plan → Beats prévus → Validation → Génération → Beats observés → Audit → Réécriture ciblée → Verrouillage → Export.
        </p>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Chargement de l'état pipeline…</p>}

      <ProductionFlowDiagram stages={stages} />

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-semibold text-sm text-foreground">Chapter Production Board</h2>
          <ChapterBoardLegend />
          <span className="text-[10px] font-mono text-muted-foreground">{chapters.length} chapitre(s) en base</span>
        </div>
        {chapters.length === 0 ? (
          <div className="cockpit-card p-6 text-center text-xs text-muted-foreground">
            Aucun chapitre persisté. Importer d'abord le plan depuis Architecture → « Plan depuis articulation.txt ».
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {chapters.map((c) => (
              <button key={c.id} onClick={() => selectChapter(c)} className="text-left">
                <ChapterProductionBoard
                  chapter={c}
                  stageStatuses={stageStatusesByChapterId[c.id]}
                  selected={selectedChapter?.id === c.id}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {chapters.length > 0 && (
        <div ref={workshopRef}>
          <ProductionBeatsWorkshop
            chapters={chapters}
            selectedChapter={selectedChapter}
            onSelectChapter={setSelectedChapter}
            chapterHasFullText={!!selectedChapter?.full_text}
          />
        </div>
      )}

      {selectedChapter && (
        <div className="cockpit-card p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="editorial-eyebrow mr-2">Chapitre sélectionné</span>
            <span className="font-mono">#{selectedChapter.number}</span>{' '}
            <span className="text-foreground">{selectedChapter.title}</span>
            <span className="ml-2 text-[10px]">
              · status: <span className="font-mono">{selectedChapter.production_status ?? '—'}</span>
              {selectedChapter.locked && <span className="ml-2 text-destructive font-mono">verrouillé</span>}
              {selectedChapter.full_text && <span className="ml-2 text-emerald-700 font-mono">full_text présent</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const st = stageStatusesByChapterId[selectedChapter.id];
              const hasPlanned = st && st.planned_beats && st.planned_beats !== 'not_started';
              return (
                <button
                  onClick={runChapterSmokeTest}
                  disabled={!hasPlanned || smokeRunning}
                  title={!hasPlanned ? 'Beats persistés requis' : 'Lance un audit live sur ce chapitre'}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-40"
                >
                  {smokeRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  Tester agent sur ce chapitre
                </button>
              );
            })()}
            {smokeResult?.run_id && (
              <Link to={`/runs?run_id=${smokeResult.run_id}`} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                <ExternalLink size={11} /> Voir résultat dans Runs
              </Link>
            )}
            {smokeResult?.error && (
              <span className="text-[11px] text-destructive font-mono">{smokeResult.error}</span>
            )}
            <LockReopenButton
              locked={!!selectedChapter.locked}
              onLock={async (r) => {
                await chapterProductionService.lock(selectedChapter.id, r);
                toast({ title: 'Chapitre verrouillé', description: r });
                refresh();
              }}
              onReopen={async (r) => {
                await chapterProductionService.reopen(selectedChapter.id, r);
                toast({ title: 'Chapitre réouvert', description: r });
                refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
