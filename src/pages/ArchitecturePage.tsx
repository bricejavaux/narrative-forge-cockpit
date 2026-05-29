import { lazy, Suspense } from 'react';
import NoteComposer from '@/components/shared/NoteComposer';
import ChapterPlanFromArticulationPanel from '@/components/shared/ChapterPlanFromArticulationPanel';
import BeatsPlanPanel from '@/components/shared/BeatsPlanPanel';
import { isDemoMode } from '@/lib/productionMode';

// Demo view is lazy-loaded so that `dummyData` is NEVER imported by the
// Production Test bundle entry. The Architecture page in Production Test
// is fully Supabase-driven (chapter plan + planned beats).
const ArchitectureDemoView = lazy(() => import('./ArchitectureDemoView'));

export default function ArchitecturePage() {
  const demo = isDemoMode();

  if (demo) {
    return (
      <Suspense fallback={<div className="text-xs text-muted-foreground p-6">Chargement vue Demo…</div>}>
        <ArchitectureDemoView />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Pilotage narratif · Production Test</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Architecture Tome</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Aucune donnée fictive — plan chapitres et beats prévus proviennent uniquement de Supabase.
        </p>
      </div>
      <ChapterPlanFromArticulationPanel />
      <BeatsPlanPanel />
      <NoteComposer target="architecture · plan chapitres" />
    </div>
  );
}
