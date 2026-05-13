import { useEffect, useState } from 'react';
import { beatsService } from '@/services/beatsService';

export default function BeatComparisonPanel({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof beatsService.compare>> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    beatsService.compare(chapterId).then(setData).finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <div className="cockpit-card text-xs text-muted-foreground">Comparaison en cours…</div>;
  if (!data) return null;

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="editorial-eyebrow">Audit de couverture des beats</h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          {data.planned_count} prévus · {data.observed_count} observés
        </span>
      </div>
      {data.matches.length === 0 && (
        <p className="text-xs text-muted-foreground">Pas de beats à comparer — créez des beats prévus puis extrayez les beats observés.</p>
      )}
      <ul className="space-y-1.5 text-xs">
        {data.matches.map((m, i) => (
          <li key={i} className="flex items-center justify-between border border-border rounded px-2 py-1">
            <span className="text-foreground">{m.planned.title}</span>
            <span className={`font-mono text-[10px] ${m.coverage === 'covered' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {m.coverage}
            </span>
          </li>
        ))}
      </ul>
      {data.unplanned.length > 0 && (
        <div>
          <p className="editorial-eyebrow mb-1">Beats observés non prévus</p>
          <ul className="space-y-1 text-xs">
            {data.unplanned.map((o) => (
              <li key={o.id} className="text-amber-700">+ {o.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
