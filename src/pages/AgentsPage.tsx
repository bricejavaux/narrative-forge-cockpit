import { useState } from 'react';
import { agents } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import { Bot, X, Sliders, Brain, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, DollarSign, Clock, Database } from 'lucide-react';

const categories = ['Tous', 'génération', 'audit', 'diagnostic', 'réécriture', 'style', 'export'];

function SliderParam({ label, value, min = 0, max = 100 }: { label: string; value: number; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary/80 rounded-full" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [filter, setFilter] = useState('Tous');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.id ?? null);
  const filtered = filter === 'Tous' ? agents : agents.filter((a) => a.category === filter);
  const agent = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="animate-slide-in space-y-6">
      <div>
        <p className="editorial-eyebrow">Intelligence</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Agent Studio</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Chaque agent est un module d'intelligence orchestré par OpenAI. Inspectez son objectif,
          ses indexes consommés, sa mémoire, et ajustez son comportement par texte ou voix.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              filter === cat ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat === 'Tous' ? 'Tous' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className={`${agent ? 'col-span-5' : 'col-span-12'} grid ${agent ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3 auto-rows-min`}>
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              className={`text-left cockpit-card cursor-pointer hover:border-primary/40 transition-all ${
                selectedAgent === a.id ? 'cockpit-glow-cyan' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-primary" strokeWidth={1.75} />
                  <span className="font-display text-[14px] text-foreground" style={{ fontWeight: 500 }}>{a.name}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-foreground/70 mb-2 leading-snug">{a.objective}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">{a.simulatedCost}</span>
                <StatusBadge status={a.criticality === 'haute' ? 'high' : a.criticality === 'moyenne' ? 'medium' : 'low'} />
                {a.rewriteRights && <span className="text-amber">écriture</span>}
              </div>
            </button>
          ))}
        </div>

        {agent && (
          <aside className="col-span-7 space-y-4 animate-slide-in">
            <div className="cockpit-card-elevated space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="editorial-eyebrow mb-0.5 capitalize">{agent.category}</p>
                  <h2 className="text-2xl editorial-heading text-foreground">{agent.name}</h2>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary"><X size={16} /></button>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{agent.objective}</p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><DollarSign size={9} /> Coût simulé</p>
                  <p className="text-sm font-mono text-foreground mt-0.5">{agent.simulatedCost}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><Clock size={9} /> Latence</p>
                  <p className="text-sm font-mono text-foreground mt-0.5">~2.4s</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><Database size={9} /> Modèle</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">OpenAI — sélection future · non branché</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <p className="editorial-eyebrow mb-1">Niveau de permission</p>
                <p className="text-xs text-foreground">
                  {agent.permissionLevel === 'read-only' && 'Lecture seule — diagnostic uniquement'}
                  {agent.permissionLevel === 'recommendation' && 'Recommandation — propose, n\'écrit pas'}
                  {agent.permissionLevel === 'targeted-rewrite-with-validation' && 'Réécriture ciblée — validation humaine requise'}
                  {agent.permissionLevel === 'deep-rewrite-with-validation' && 'Réécriture profonde — approbation auteur obligatoire'}
                  {!agent.permissionLevel && '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg border border-border p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1 mb-1"><ArrowDownToLine size={10} /> Inputs attendus</p>
                  <p className="text-foreground/80">Contexte narratif, fiches liées, dernières versions</p>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1 mb-1"><ArrowUpFromLine size={10} /> Outputs</p>
                  <p className="text-foreground/80">
                    {agent.category === 'audit' ? 'Findings, scores, recommandations'
                      : agent.category === 'réécriture' ? 'Diff de réécriture, justifications'
                      : 'Brouillon structuré + métadonnées'}
                  </p>
                </div>
              </div>

              <div>
                <p className="editorial-eyebrow mb-1.5">Indexes consultés</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.futureIndexes.map((idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                      {idx}
                    </span>
                  ))}
                </div>
              </div>

              {agent.rewriteRights && (
                <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 p-2.5 text-xs text-foreground">
                  <AlertTriangle size={12} className="text-amber mt-0.5" />
                  Cet agent dispose des droits de réécriture — validation humaine requise.
                </div>
              )}
            </div>

            {/* Sliders */}
            <div className="cockpit-card space-y-3">
              <div className="flex items-center gap-2">
                <Sliders size={13} className="text-primary" />
                <h3 className="editorial-eyebrow">Paramètres comportementaux</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <SliderParam label="Tempo" value={65} />
                <SliderParam label="Compression" value={30} />
                <SliderParam label="Densité scientifique" value={55} />
                <SliderParam label="Amplitude émotionnelle" value={70} />
                <SliderParam label="Brutalité des pivots" value={45} />
                <SliderParam label="Degré de mystère" value={72} />
                <SliderParam label="Tolérance répétition" value={20} />
                <SliderParam label="Fragmentation POV" value={35} />
                <SliderParam label="Intensité réécriture" value={agent.rewriteRights ? 55 : 0} />
                <SliderParam label="Délai avant payoff" value={60} />
              </div>
            </div>

            {/* Memory & evolution */}
            <div className="cockpit-card space-y-3">
              <div className="flex items-center gap-2">
                <Brain size={13} className="text-accent" />
                <h3 className="editorial-eyebrow">Mémoire & évolution</h3>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { date: '2026-04-12', note: 'Auteur : "moins d\'adverbes, plus de gestes physiques"', via: 'voix' },
                  { date: '2026-04-08', note: 'Recalibrage de la densité scientifique (-15%)', via: 'texte' },
                  { date: '2026-04-02', note: 'Ajustement du seuil de validation humaine', via: 'texte' },
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border/60 last:border-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">{h.date}</span>
                    <p className="flex-1 text-foreground/80">{h.note}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.via}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tuning composer */}
            <NoteComposer target={`Tuning · ${agent.name}`} />
          </aside>
        )}
      </div>
    </div>
  );
}
