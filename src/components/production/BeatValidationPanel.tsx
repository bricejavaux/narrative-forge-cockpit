import { useEffect, useState } from 'react';
import { beatsService, type Beat } from '@/services/beatsService';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function BeatValidationPanel({ chapterId }: { chapterId: string }) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setBeats(await beatsService.listForChapter(chapterId, 'planned'));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [chapterId]);

  const addBeat = async () => {
    await beatsService.create({
      chapter_id: chapterId,
      title: `Beat ${beats.length + 1}`,
      beat_number: beats.length + 1,
      beat_type: 'planned',
    });
    refresh();
  };

  const validatedCount = beats.filter((b) => b.validation_status === 'validated').length;
  const allValidated = beats.length > 0 && validatedCount === beats.length;

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="editorial-eyebrow">Beats prévus · validation</h3>
        <span className="text-[11px] font-mono text-muted-foreground">{validatedCount}/{beats.length} validés</span>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {!loading && beats.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun beat prévu. Ajoutez les unités narratives avant la génération.</p>
      )}
      <ul className="space-y-2">
        {beats.map((b) => {
          const missing: string[] = [];
          if (!b.objective) missing.push('objectif');
          if (!b.consequence) missing.push('conséquence');
          if (!b.narrative_function) missing.push('fonction');
          return (
            <li key={b.id} className="border border-border rounded p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">#{b.beat_number ?? '?'} — {b.title}</span>
                <div className="flex gap-1">
                  <button
                    title="Valider"
                    onClick={async () => { await beatsService.validate(b.id); refresh(); }}
                    className={`p-1 rounded ${b.validation_status === 'validated' ? 'text-emerald-600' : 'text-muted-foreground hover:text-emerald-600'}`}
                  ><CheckCircle2 size={13} /></button>
                  <button
                    title="Supprimer"
                    onClick={async () => { await beatsService.remove(b.id); refresh(); }}
                    className="p-1 text-muted-foreground hover:text-rose-600"
                  ><Trash2 size={13} /></button>
                </div>
              </div>
              {b.objective && <p className="text-muted-foreground">Objectif : {b.objective}</p>}
              {missing.length > 0 && (
                <p className="text-amber-700 text-[10px]">Champs manquants : {missing.join(', ')}</p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <button onClick={addBeat} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus size={12} /> Ajouter un beat
        </button>
        <button
          disabled={beats.length === 0 || allValidated}
          onClick={async () => { await beatsService.validateAllForChapter(chapterId); refresh(); }}
          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
        >
          {allValidated ? 'Tout validé' : 'Tout valider'}
        </button>
      </div>
    </div>
  );
}
