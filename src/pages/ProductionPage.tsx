import { useEffect, useState } from 'react';
import { productionFlowService, type StageState } from '@/services/productionFlowService';
import ProductionFlowDiagram from '@/components/production/ProductionFlowDiagram';
// StageCard duplicate grid removed — single chain via ProductionFlowDiagram
import ChapterProductionBoard from '@/components/production/ChapterProductionBoard';
import BeatValidationPanel from '@/components/production/BeatValidationPanel';
import BeatComparisonPanel from '@/components/production/BeatComparisonPanel';
import RewriteTasksPanel from '@/components/production/RewriteTasksPanel';
import LockReopenButton from '@/components/production/LockReopenButton';
import BeatsPlanPanel from '@/components/shared/BeatsPlanPanel';
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
      supabase.from('chapters').select('id, number, title, locked, production_status, metadata').order('number', { ascending: true }).limit(50),
    ]);
    setStages(s);
    const live = ch.data ?? [];
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
          Canon → Architecture → Plan → Beats prévus → Validation → Génération → Beats observés → Audit → Réécriture ciblée → Verrouillage → Audit méta-tome → Export.
          Les beats sont d'abord <strong>une entrée</strong> de la génération, puis <strong>une sortie</strong> de l'analyse.
        </p>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Chargement de l'état pipeline…</p>}

      <ProductionFlowDiagram stages={stages} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stages.map((s) => <StageCard key={s.stage} state={s} />)}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-sm text-foreground">Chapter Production Board</h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {chapters.length} chapitre(s) en base
          </span>
        </div>
        {chapters.length === 0 ? (
          <div className="cockpit-card p-6 text-center text-xs text-muted-foreground">
            Aucun chapitre persisté. Importer d'abord le plan depuis Architecture → « Plan depuis articulation.txt ».
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {chapters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChapter(c)}
                className={`text-left ${selectedChapter?.id === c.id ? 'ring-2 ring-primary/40 rounded-lg' : ''}`}
              >
                <ChapterProductionBoard chapter={c} stageStatuses={(c.metadata as any) ?? {}} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Planned Beats workshop — always shown when chapters exist */}
      {chapters.length > 0 && <BeatsPlanPanel />}

      {selectedChapter && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-foreground">
              Chapitre sélectionné — Ch.{selectedChapter.number} {selectedChapter.title}
            </h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <BeatValidationPanel chapterId={selectedChapter.id} />
            <BeatComparisonPanel chapterId={selectedChapter.id} />
            <RewriteTasksPanel chapterId={selectedChapter.id} />
          </div>
        </div>
      )}
    </div>
  );
}
