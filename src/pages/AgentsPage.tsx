import { useState } from 'react';
import { agents, type Agent } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Bot, ChevronRight, X, Sliders } from 'lucide-react';

const categories = ['Tous', 'génération', 'audit', 'diagnostic', 'réécriture', 'style', 'export'];

function SliderParam({ label, value, min = 0, max = 100 }: { label: string; value: number; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full">
        <div className="h-full bg-primary rounded-full" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [filter, setFilter] = useState('Tous');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const filtered = filter === 'Tous' ? agents : agents.filter(a => a.category === filter);
  const agent = agents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Agent Studio</h1>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {cat === 'Tous' ? 'Tous' : cat}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className={`${selectedAgent ? 'w-1/2' : 'w-full'} grid ${selectedAgent ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3 auto-rows-min`}>
          {filtered.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a.id)}
              className={`cockpit-card cursor-pointer hover:border-primary/30 transition-all ${selectedAgent === a.id ? 'border-primary/40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-primary" />
                  <span className="font-display font-semibold text-sm text-foreground">{a.name}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{a.objective}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{a.simulatedCost}</span>
                <StatusBadge status={a.criticality === 'haute' ? 'high' : a.criticality === 'moyenne' ? 'medium' : 'low'} />
                {a.rewriteRights && <span className="text-amber text-[10px]">✏️ écriture</span>}
              </div>
              {a.lastRun && <p className="text-[10px] text-muted-foreground mt-2 font-mono">Dernier run: {a.lastRun}</p>}
            </div>
          ))}
        </div>

        {agent && (
          <div className="w-1/2 cockpit-card space-y-4 animate-slide-in h-fit sticky top-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">{agent.name}</h2>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={agent.status} />
              <StatusBadge status={agent.category} />
              {agent.rewriteRights && <StatusBadge status="écriture autorisée" />}
            </div>

            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">{agent.objective}</p>
              <div className="flex gap-4 text-xs">
                <span className="font-mono text-foreground">Coût: {agent.simulatedCost}</span>
                {agent.lastRun && <span className="text-muted-foreground">Run: {agent.lastRun}</span>}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground uppercase tracking-wider">Indexes consultés</span>
              <div className="flex flex-wrap gap-1">
                {agent.futureIndexes.map(idx => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-surface-2 text-cyan font-mono text-[10px]">{idx}</span>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Paramètres (simulés)</h3>
              <SliderParam label="Longueur cible" value={3500} min={1000} max={6000} />
              <SliderParam label="Longueur min." value={2500} min={500} max={5000} />
              <SliderParam label="Longueur max." value={5000} min={2000} max={8000} />
              <SliderParam label="Variance autorisée" value={15} />
              <SliderParam label="Tempo" value={65} />
              <SliderParam label="Respiration" value={40} />
              <SliderParam label="Compression" value={30} />
              <SliderParam label="Densité scientifique" value={55} />
              <SliderParam label="Amplitude émotionnelle" value={70} />
              <SliderParam label="Brutalité des pivots" value={45} />
              <SliderParam label="Délai avant payoff" value={60} />
              <SliderParam label="Degré de mystère" value={72} />
              <SliderParam label="Tolérance répétition" value={20} />
              <SliderParam label="Fragmentation POV" value={35} />
              <SliderParam label="Fragmentation temporelle" value={25} />
              <SliderParam label="Poids science" value={50} />
              <SliderParam label="Poids politique" value={30} />
              <SliderParam label="Poids intime" value={40} />
              <SliderParam label="Intensité réécriture" value={55} />

              <div className="space-y-2 pt-2">
                {[
                  ['Autorisation réécriture', agent.rewriteRights],
                  ['Validation humaine requise', true],
                  ['Journalisation obligatoire', true],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{label as string}</span>
                    <div className={`w-8 h-4 rounded-full ${val ? 'bg-emerald' : 'bg-surface-3'} relative cursor-not-allowed`}>
                      <div className={`w-3 h-3 rounded-full bg-foreground absolute top-0.5 transition-all ${val ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
