import { exports_ } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { FileOutput, Download, AlertTriangle } from 'lucide-react';

const categories = ['Tous', 'travail', 'éditorial', 'audit', 'publication', 'visuel'];

import { useState } from 'react';

export default function ExportsPage() {
  const [filter, setFilter] = useState('Tous');
  const filtered = filter === 'Tous' ? exports_ : exports_.filter(e => e.category === filter);

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Exports</h1>

      <div className="flex gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(exp => (
          <div key={exp.id} className={`cockpit-card space-y-3 ${exp.engineStatus === 'not_connected' ? 'border-destructive/20' : 'border-amber/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileOutput size={14} className="text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">{exp.name}</span>
              </div>
              <StatusBadge status={exp.engineStatus} />
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span className="font-mono text-foreground">{exp.format}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><StatusBadge status={exp.category} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="text-foreground">{exp.destination}</span></div>
              {exp.lastGeneration && <div className="flex justify-between"><span className="text-muted-foreground">Dernière génération</span><span className="font-mono text-foreground">{exp.lastGeneration}</span></div>}
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dépendances requises</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {exp.dependencies.map(d => (
                  <span key={d} className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded border border-border text-muted-foreground cursor-not-allowed opacity-60">
              <Download size={12} /> Exporter — simulé
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
