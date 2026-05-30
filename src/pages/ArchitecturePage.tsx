import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import NoteComposer from '@/components/shared/NoteComposer';
import ChapterPlanFromArticulationPanel from '@/components/shared/ChapterPlanFromArticulationPanel';
import { isDemoMode } from '@/lib/productionMode';
import { ArrowRight } from 'lucide-react';

// Demo view is lazy-loaded so that `dummyData` is NEVER imported by the
// Production Test bundle entry.
const ArchitectureDemoView = lazy(() => import('./ArchitectureDemoView'));

export default function ArchitecturePage() {
  if (isDemoMode()) {
    return (
      <Suspense fallback={<div className="text-xs text-muted-foreground p-6">Chargement vue Demo…</div>}>
        <ArchitectureDemoView />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Pilotage narratif · Analyse seule</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Architecture Tome</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          Analyse structurelle et visualisation du tome. Aucune génération ni persistance de beats ici :
          toute action de fabrication (beats, validation, audit, génération, verrouillage) se déroule dans <strong>Production</strong>.
        </p>
      </div>

      <ChapterPlanFromArticulationPanel />

      <div className="cockpit-card flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="editorial-eyebrow">Actions de production</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pour générer / valider / auditer / verrouiller les beats et chapitres, ouvrez la page Production.
          </p>
        </div>
        <Link to="/production"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90">
          Ouvrir dans Production <ArrowRight size={12} />
        </Link>
      </div>

      <NoteComposer target="architecture · analyse structurelle" targetType="architecture" />
    </div>
  );
}
