import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * Banner shown on Canon-related pages to explain that any canon edit
 * may impact the production pipeline (architecture, beats, chapters, characters).
 * No automatic propagation — human validation required.
 */
export default function CanonImpactBanner() {
  return (
    <div className="cockpit-card border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-700 mt-0.5 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <p className="text-xs text-foreground">
            Cette modification peut impacter l'architecture du tome (chapitres, beats, arcs, personnages).
          </p>
          <p className="text-[11px] text-muted-foreground">
            Aucune propagation automatique. Toute modification structurelle nécessite une validation humaine.
          </p>
          <div className="flex gap-2 pt-1">
            <Link to="/production" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Voir le pipeline production <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
