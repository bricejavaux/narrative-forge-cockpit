import { Lock } from 'lucide-react';

const CORPORA = [
  {
    name: 'follett',
    title: 'follett — corpus privé de style',
    reason: 'Ingestion désactivée tant que droits / usage ne sont pas validés.',
  },
  {
    name: 'sf_portals_fiction',
    title: 'sf_portals_fiction — fiction de référence',
    reason: 'Ingestion désactivée tant que droits / usage ne sont pas validés.',
  },
];

export default function BlockedCorpusCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {CORPORA.map((c) => (
        <div key={c.name} className="cockpit-card border-dashed opacity-90 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="editorial-heading text-foreground text-sm flex items-center gap-1.5">
              <Lock size={12} className="text-muted-foreground" />
              {c.title}
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">
              non ingéré volontairement
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{c.reason}</p>
          <p className="text-[10px] text-muted-foreground/70 font-mono">
            corpus={c.name} · ingestion bloquée côté Edge Function (HTTP 403 doctrine)
          </p>
        </div>
      ))}
    </div>
  );
}
