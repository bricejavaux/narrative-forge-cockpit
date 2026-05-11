import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Plug, User, Sparkles } from 'lucide-react';
import { project } from '@/data/dummyData';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

export default function Header() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);

  const openaiOk = !!readiness?.openai?.api_key_configured;
  const onedriveOk = !!readiness?.onedrive?.oauth_configured;
  const supabaseOk = !!readiness?.supabase?.project_connected && !!readiness?.supabase?.tables_created;
  const pgvectorPending = !readiness?.indexes?.pgvector_ready;
  const audioPipelinePending = readiness?.openai?.transcription_pipeline_status !== 'transcription_live';

  // Critical capabilities still to finalize (per spec)
  const gaps = [
    pgvectorPending && 'pgvector',
    audioPipelinePending && 'audio_transcription_pipeline',
    'run_persistence',
    'chapter_full_text',
    'autonomous_rewrite',
    'pdf_docx_epub',
  ].filter(Boolean) as string[];

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
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-mono"
          title={`OpenAI: ${openaiOk ? 'live' : 'absent'} · OneDrive: ${onedriveOk ? 'live' : 'absent'} · Supabase: ${supabaseOk ? 'actif' : 'absent'}`}
        >
          <Sparkles size={11} />
          {modeLabel}
        </div>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          title={`Capacités à finaliser : ${gaps.join(', ')}`}
        >
          <Plug size={12} />
          <span>
            <span className={gaps.length > 0 ? 'text-amber' : 'text-emerald-600'}>{gaps.length}</span> capacités à finaliser
          </span>
        </button>

        <button
          className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Notifications — future (alertes d'activité, auth requise)"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
        </button>

        <button
          className="flex items-center gap-2 p-1 rounded-full hover:bg-secondary transition-colors"
          title="Profil utilisateur — future (Supabase Auth optionnel/non configuré)"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
            <User size={14} className="text-foreground/70" />
          </div>
        </button>
      </div>
    </header>
  );
}
