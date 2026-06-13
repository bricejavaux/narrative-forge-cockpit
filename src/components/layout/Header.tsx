import { useEffect, useState } from 'react';
import { ChevronDown, Plug, Sparkles, FlaskConical } from 'lucide-react';
import { project } from '@/data/dummyData';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';
import CapabilitiesModal, { buildCapabilities } from '@/components/shared/CapabilitiesModal';
import { getProductionMode, PRODUCTION_MODE_LABEL, PRODUCTION_MODE_TOOLTIP } from '@/lib/productionMode';

export default function Header() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [counts, setCounts] = useState<{ canon: number; characters: number } | null>(null);
  const [capsOpen, setCapsOpen] = useState(false);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    supabaseService.getProductionCounts()
      .then(c => setCounts({ canon: c.canon_count, characters: c.characters_count }))
      .catch(() => setCounts(null));
  }, []);

  const openaiOk = !!readiness?.openai?.api_key_configured;
  const onedriveOk = !!readiness?.onedrive?.oauth_configured;
  const supabaseOk = !!readiness?.supabase?.project_connected && !!readiness?.supabase?.tables_created;

  // Single source of truth — same helper as Dashboard/Modal.
  // Count only real blockers (production_test + chapter_production), exclude `future` intentionals.
  const caps = buildCapabilities(readiness, counts);
  const gaps = caps.filter(c => c.phase !== 'future' && c.status !== 'live').map(c => c.key);


  const liveCount = (openaiOk ? 1 : 0) + (onedriveOk ? 1 : 0) + (supabaseOk ? 1 : 0);
  const modeLabel = !readiness
    ? 'Vérification…'
    : liveCount >= 3 ? 'Live partiel'
    : liveCount >= 1 ? 'Mode hybride : live + mock'
    : 'Mock fallback';

  return (
    <header className="h-16 bg-card/70 backdrop-blur-sm border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-5">
        <button
          className="flex items-center gap-2 group"
          title="Projet actif : Les Portes du Monde. Sélecteur préparé pour multi-projet."
        >
          <span className="font-display text-base text-foreground truncate max-w-[260px]" style={{ fontWeight: 500 }}>
            {project.name}
          </span>
          <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title="Tome actif : Tome I. Sélecteur préparé pour multi-tome (canon/personnages/indexes par tome)."
        >
          <span>{project.currentTome}</span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(() => {
          const pm = getProductionMode();
          const cls = pm === 'production_test'
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
            : pm === 'production_locked'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
              : 'border-slate-500/40 bg-slate-500/10 text-slate-600';
          return (
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono ${cls}`}
              title={PRODUCTION_MODE_TOOLTIP[pm]}
            >
              <FlaskConical size={11} /> {PRODUCTION_MODE_LABEL[pm]}
            </div>
          );
        })()}
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-mono"
          title={`OpenAI: ${openaiOk ? 'live' : 'absent'} · OneDrive: ${onedriveOk ? 'live' : 'absent'} · Supabase: ${supabaseOk ? 'actif' : 'absent'}`}
        >
          <Sparkles size={11} />
          {modeLabel}
        </div>


        <button
          onClick={() => setCapsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          title="Voir les capacités à finaliser"
        >
          <Plug size={12} />
          <span>
            <span className={gaps.length > 0 ? 'text-amber' : 'text-emerald-600'}>{gaps.length}</span> capacités à finaliser
          </span>
        </button>
        <CapabilitiesModal open={capsOpen} onClose={() => setCapsOpen(false)} />

      </div>
    </header>
  );
}
