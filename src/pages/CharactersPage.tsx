import { useState } from 'react';
import { characters, chapters, audioNotes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import MicButton from '@/components/shared/MicButton';
import NoteComposer from '@/components/shared/NoteComposer';
import { User, X, Heart, Sparkles, Mic, MessageSquare, History } from 'lucide-react';

const views = ['Liste', 'Matrice de relations', 'Timeline émotionnelle', 'Présence par chapitre', 'Alertes de continuité'];

export default function CharactersPage() {
  const [activeView, setActiveView] = useState(views[0]);
  const [selectedChar, setSelectedChar] = useState<string | null>(characters[0]?.id ?? null);
  const char = characters.find((c) => c.id === selectedChar);
  const charChapters = char ? chapters.slice(0, 5) : [];
  const charAudio = char ? audioNotes.filter((a) => a.targetType === 'personnage').slice(0, 2) : [];

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="editorial-eyebrow">Narration</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Personnages</h1>
        </div>
        <MicButton label="Note vocale personnage" />
      </div>

      <div className="flex gap-1 border-b border-border">
        {views.map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeView === v ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {activeView === 'Liste' && (
        <div className="grid grid-cols-12 gap-6">
          <div className={`${char ? 'col-span-5' : 'col-span-12'} grid ${char ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4 auto-rows-min`}>
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChar(c.id)}
                className={`text-left cockpit-card cursor-pointer hover:border-primary/40 transition-all ${
                  selectedChar === c.id ? 'cockpit-glow-cyan' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
                    <User size={18} className="text-foreground/70" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] text-foreground truncate" style={{ fontWeight: 500 }}>{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Poids narratif</span><span className="font-mono text-foreground">{c.narrativeWeight}</span></div>
                  <ScoreBar value={c.narrativeWeight} color="cyan" />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Dette dramatique</span><span className="font-mono text-foreground">{c.dramaticDebt}</span></div>
                  <ScoreBar value={c.dramaticDebt} max={15} color="amber" />
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
                  {c.audioNotes > 0 && <span className="flex items-center gap-1"><Mic size={10} className="text-rose/70" /> {c.audioNotes}</span>}
                  <span className="flex items-center gap-1"><MessageSquare size={10} /> {c.recentComments}</span>
                </div>
              </button>
            ))}
          </div>

          {char && (
            <aside className="col-span-7 space-y-4 animate-slide-in">
              {/* Executive summary */}
              <div className="cockpit-card-elevated space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
                      <User size={22} className="text-foreground/70" />
                    </div>
                    <div>
                      <p className="editorial-eyebrow mb-0.5">{char.role}</p>
                      <h2 className="text-2xl editorial-heading text-foreground">{char.name}</h2>
                    </div>
                  </div>
                  <button onClick={() => setSelectedChar(null)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary">
                    <X size={16} />
                  </button>
                </div>

                <p className="text-sm text-foreground/85 leading-relaxed">{char.function}</p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                    <p className="text-2xl font-display text-foreground" style={{ fontWeight: 500 }}>{char.dramaticDebt}</p>
                    <p className="editorial-eyebrow mt-0.5">Dette dramatique</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                    <p className="text-2xl font-display text-foreground" style={{ fontWeight: 500 }}>{char.narrativeWeight}</p>
                    <p className="editorial-eyebrow mt-0.5">Poids narratif</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                    <p className="text-2xl font-display text-foreground" style={{ fontWeight: 500 }}>{char.exposureLevel}%</p>
                    <p className="editorial-eyebrow mt-0.5">Exposition</p>
                  </div>
                </div>
              </div>

              {/* Key traits */}
              <div className="cockpit-card space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-primary" />
                  <h3 className="editorial-eyebrow">Traits clés & tensions</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                  {[
                    ['Objectif apparent', char.apparentGoal],
                    ['Objectif réel', char.realGoal],
                    ['Faille', char.flaw],
                    ['Secret', char.secret],
                    ['Interdit', char.forbidden],
                    ['Seuil de rupture', char.breakingPoint],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="editorial-eyebrow mb-0.5">{label}</p>
                      <p className="text-foreground/85 leading-snug">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emotional trajectory */}
              <div className="cockpit-card space-y-3">
                <div className="flex items-center gap-2">
                  <Heart size={13} className="text-rose" />
                  <h3 className="editorial-eyebrow">Trajectoire émotionnelle</h3>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {char.emotionalTrajectory.split('→').map((step, i, arr) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs text-foreground">
                        {step.trim()}
                      </div>
                      {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked chapters */}
              <div className="cockpit-card space-y-2">
                <h3 className="editorial-eyebrow">Chapitres liés · présence</h3>
                <div className="flex flex-wrap gap-1.5">
                  {charChapters.map((c) => (
                    <span key={c.id} className="px-2 py-1 rounded text-xs font-mono border border-border bg-secondary/40 text-foreground">
                      Ch.{c.number}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent audio + history */}
              {charAudio.length > 0 && (
                <div className="cockpit-card space-y-2">
                  <div className="flex items-center gap-2">
                    <History size={13} className="text-violet" />
                    <h3 className="editorial-eyebrow">Dernières notes & commentaires</h3>
                  </div>
                  {charAudio.map((a) => (
                    <div key={a.id} className="text-xs py-1.5 border-b border-border/60 last:border-0">
                      <p className="text-foreground">{a.proposedAction}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {a.date} · {a.duration} · <StatusBadge status={a.transcriptionStatus} />
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Note composer */}
              <NoteComposer target={char.name} />
            </aside>
          )}
        </div>
      )}

      {activeView === 'Matrice de relations' && (
        <div className="cockpit-card">
          <h3 className="editorial-eyebrow mb-4">Matrice de relations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {characters.map((c) => <th key={c.id} className="p-2 text-muted-foreground font-normal truncate max-w-[80px]">{c.name.split(' ').pop()}</th>)}
                </tr>
              </thead>
              <tbody>
                {characters.map((c, i) => (
                  <tr key={c.id}>
                    <td className="p-2 text-muted-foreground font-mono">{c.name.split(' ').pop()}</td>
                    {characters.map((c2, j) => {
                      if (i === j) return <td key={c2.id} className="p-2 text-center text-muted-foreground">—</td>;
                      const intensity = Math.abs((i * 7 + j * 3) % 5);
                      const colors = ['bg-secondary/40', 'bg-primary/8', 'bg-primary/15', 'bg-accent/15', 'bg-rose/15'];
                      const labels = ['faible', 'tension', 'alliance', 'conflit', 'secret'];
                      return <td key={c2.id} className={`p-2 text-center rounded ${colors[intensity]}`}>
                        <span className="text-[10px] text-foreground/70">{labels[intensity]}</span>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView !== 'Liste' && activeView !== 'Matrice de relations' && (
        <div className="cockpit-card p-12 text-center">
          <p className="text-muted-foreground text-sm">Vue "{activeView}" — simulée</p>
          <p className="text-xs text-muted-foreground/70 mt-2 font-mono">Nécessite Supabase + OpenAI</p>
        </div>
      )}
    </div>
  );
}
