// Demo-only fixture catalogue. NEVER imported by Production Test paths.
// Kept for visual reference; no persistent calls.
import { useState } from 'react';
import { agents } from '@/data/dummyData';
import { Bot, X, AlertTriangle } from 'lucide-react';

const categories = ['Tous', 'génération', 'audit', 'diagnostic', 'réécriture', 'style', 'export'];

export default function AgentsDemoCatalogue() {
  const [filter, setFilter] = useState('Tous');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.id ?? null);
  const filtered = filter === 'Tous' ? agents : agents.filter((a) => a.category === filter);
  const agent = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="space-y-3 opacity-90">
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              filter === cat ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className={`${agent ? 'col-span-5' : 'col-span-12'} grid ${agent ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-2 auto-rows-min`}>
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              className={`text-left rounded border px-2 py-1.5 transition-colors ${
                selectedAgent === a.id ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Bot size={11} className="text-primary" />
                <span className="font-display text-xs text-foreground">{a.name}</span>
                <span className="ml-auto text-[9px] font-mono px-1 py-0.5 rounded border bg-slate-500/10 text-slate-600 border-slate-500/30">
                  demo
                </span>
              </div>
              <p className="text-[11px] text-foreground/70 leading-snug">{a.objective}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                {a.simulatedCost} · {a.category}
              </p>
            </button>
          ))}
        </div>

        {agent && (
          <aside className="col-span-7 cockpit-card space-y-2 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="editorial-eyebrow capitalize">{agent.category}</p>
                <h2 className="text-lg editorial-heading text-foreground">{agent.name}</h2>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary">
                <X size={14} />
              </button>
            </div>
            <p className="text-foreground/85 leading-relaxed">{agent.objective}</p>
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 flex items-start gap-1.5">
              <AlertTriangle size={11} className="mt-0.5" />
              Fixture démo — pour exécuter ou configurer un agent réel, utilisez le panneau « Agents persistés » au-dessus.
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
