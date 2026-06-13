import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ReviewType = {
  key: string;
  label: string;
  targetType: string;
  description: string;
};

const REVIEW_TYPES: ReviewType[] = [
  { key: 'chapter_v1', label: 'Relecture chapitre v1', targetType: 'chapter', description: 'Première lecture du brouillon généré.' },
  { key: 'chapter_v2', label: 'Relecture chapitre v2', targetType: 'chapter', description: 'Deuxième passe après ajustements mineurs.' },
  { key: 'chapter_after_rewrite', label: 'Relecture après réécriture', targetType: 'chapter', description: 'Validation post-rewrite_task.' },
  { key: 'beats', label: 'Relecture beats', targetType: 'beat', description: 'Validation des beats prévus / observés.' },
  { key: 'canon', label: 'Relecture canon', targetType: 'canon_object', description: 'Commentaires sur les objets canon.' },
  { key: 'character', label: 'Relecture personnage', targetType: 'character', description: 'Notes sur une fiche personnage.' },
  { key: 'diagnostic', label: 'Relecture diagnostic', targetType: 'diagnostic', description: 'Réaction au diagnostic chapitre / tome.' },
  { key: 'meta_tome', label: 'Relecture méta-tome', targetType: 'tome', description: 'Audit global d\'un tome.' },
  { key: 'run', label: 'Relecture run', targetType: 'run', description: 'Commentaires sur un run d\'agent.' },
];

export default function AudioReviewTypesPanel() {
  const [audioNotesCount, setAudioNotesCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('audio_notes').select('id', { count: 'exact', head: true })
      .then(r => setAudioNotesCount(r.count ?? 0));
  }, []);
  const hasLive = (audioNotesCount ?? 0) > 0;

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">Types de relecture</h3>
          <p className="text-[11px] text-muted-foreground">
            Chaque session expose : <span className="font-mono">target_type · target_id · target_version · review_round · status · transcription_status · structured_status · validation_status · linked_rewrite_tasks · created_at</span>.
          </p>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${hasLive ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}`}>
          {hasLive ? `${audioNotesCount} note(s) en base` : 'aucune note en base'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {REVIEW_TYPES.map(rt => (
          <div key={rt.key} className="rounded border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-display font-semibold text-foreground">{rt.label}</p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-secondary/50 text-muted-foreground">{rt.targetType}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{rt.description}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              status: <span className="text-amber-700">en attente de session live</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Si le texte complet du chapitre n'est pas importé, la relecture intégrale est indisponible —
        seules les notes ponctuelles sont possibles.
      </p>
    </div>
  );
}
