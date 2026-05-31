import { useEffect, useState } from 'react';
import { productionFlowService, type StageState } from '@/services/productionFlowService';
import ProductionFlowDiagram from '@/components/production/ProductionFlowDiagram';
import ChapterProductionBoard, { ChapterBoardLegend } from '@/components/production/ChapterProductionBoard';
import LockReopenButton from '@/components/production/LockReopenButton';
import ProductionBeatsWorkshop from '@/components/production/ProductionBeatsWorkshop';
import { chapterProductionService } from '@/services/chapterProductionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function ProductionPage() {
  const [stages, setStages] = useState<StageState[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);

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
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

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
              <button key={c.id} onClick={() => setSelectedChapter(c)} className="text-left">
                <ChapterProductionBoard
                  chapter={c}
                  stageStatuses={(c.metadata as any) ?? {}}
                  selected={selectedChapter?.id === c.id}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unified Beats Workshop — single source of truth for beat workflow */}
      {chapters.length > 0 && (
        <ProductionBeatsWorkshop
          chapters={chapters}
          selectedChapter={selectedChapter}
          onSelectChapter={setSelectedChapter}
          chapterHasFullText={!!selectedChapter?.full_text}
        />
      )}

      {/* Compact selected-chapter summary (read-only + lock control only) */}
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
      )}
    </div>
  );
}
