import { indexes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Database, AlertTriangle } from 'lucide-react';

export default function IndexesPage() {
  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Indexes Vectoriels</h1>
      <p className="text-sm text-muted-foreground">Chaque index est dédié à une finalité spécifique et sera alimenté par des sources et agents distincts.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {indexes.map(idx => (
          <div key={idx.id} className={`cockpit-card space-y-3 ${idx.warning ? 'border-amber/20' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-cyan" />
                <span className="font-display font-semibold text-sm text-foreground font-mono">{idx.name}</span>
              </div>
              <StatusBadge status={idx.status} />
            </div>

            <p className="text-xs text-muted-foreground">{idx.purpose}</p>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="text-foreground">{idx.docTypes}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taille simulée</span><span className="font-mono text-foreground">{idx.simulatedSize}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fraîcheur</span><span className="font-mono text-foreground">{idx.simulatedFreshness}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dernière MAJ</span><span className="font-mono text-foreground">{idx.lastUpdate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Propriétaire</span><span className="text-foreground">{idx.owner}</span></div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Agents futurs</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {idx.futureAgents.map(a => (
                  <span key={a} className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] text-muted-foreground">{a}</span>
                ))}
              </div>
            </div>

            {idx.warning && (
              <div className="flex items-center gap-1.5 text-xs text-amber">
                <AlertTriangle size={12} />
                {idx.warning}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
