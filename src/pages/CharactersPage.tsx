import { useState } from 'react';
import { characters } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import MicButton from '@/components/shared/MicButton';
import { Users, User, GitBranch, Heart, BarChart2, AlertTriangle, Mic, X } from 'lucide-react';

const views = ['Liste', 'Matrice de relations', 'Timeline émotionnelle', 'Présence par chapitre', 'Alertes de continuité'];

export default function CharactersPage() {
  const [activeView, setActiveView] = useState(views[0]);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const char = characters.find(c => c.id === selectedChar);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Personnages</h1>
        <MicButton label="Note audio personnage" />
      </div>

      <div className="flex gap-1 border-b border-border pb-2">
        {views.map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeView === v ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {v}
          </button>
        ))}
      </div>

      {activeView === 'Liste' && (
        <div className="flex gap-6">
          <div className={`${selectedChar ? 'w-1/2' : 'w-full'} grid ${selectedChar ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4 auto-rows-min`}>
            {characters.map(c => (
              <div key={c.id} onClick={() => setSelectedChar(c.id)}
                className={`cockpit-card cursor-pointer hover:border-primary/30 transition-all ${selectedChar === c.id ? 'border-primary/40 cockpit-glow-cyan' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-foreground">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Poids narratif</span><span className="font-mono text-foreground">{c.narrativeWeight}</span></div>
                  <ScoreBar value={c.narrativeWeight} color="cyan" />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Dette dramatique</span><span className="font-mono text-foreground">{c.dramaticDebt}</span></div>
                  <ScoreBar value={c.dramaticDebt} max={15} color="amber" />
                  <div className="flex items-center gap-2 mt-2">
                    {c.audioNotes > 0 && <span className="text-xs text-rose flex items-center gap-1"><Mic size={10} /> {c.audioNotes}</span>}
                    <span className="text-xs text-muted-foreground">{c.recentComments} commentaires</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {char && (
            <div className="w-1/2 cockpit-card space-y-4 animate-slide-in h-fit sticky top-20">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-lg text-foreground">{char.name}</h2>
                <button onClick={() => setSelectedChar(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={char.role} />
                <span className="text-xs font-mono text-muted-foreground">Exposition: {char.exposureLevel}%</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Fonction', char.function],
                  ['Objectif apparent', char.apparentGoal],
                  ['Objectif réel', char.realGoal],
                  ['Faille', char.flaw],
                  ['Secret', char.secret],
                  ['Interdit', char.forbidden],
                  ['Trajectoire émotionnelle', char.emotionalTrajectory],
                  ['Seuil de rupture', char.breakingPoint],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    <p className="text-xs text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-surface-2 rounded">
                  <span className="text-lg font-display font-bold text-cyan">{char.dramaticDebt}</span>
                  <p className="text-[10px] text-muted-foreground">Dette</p>
                </div>
                <div className="text-center p-2 bg-surface-2 rounded">
                  <span className="text-lg font-display font-bold text-violet">{char.narrativeWeight}</span>
                  <p className="text-[10px] text-muted-foreground">Poids</p>
                </div>
                <div className="text-center p-2 bg-surface-2 rounded">
                  <span className="text-lg font-display font-bold text-rose">{char.audioNotes}</span>
                  <p className="text-[10px] text-muted-foreground">Audio</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                <MicButton label="Dicter une faille" size="sm" />
                <MicButton label="Dicter un secret" size="sm" />
                <MicButton label="Dicter une évolution" size="sm" />
                <MicButton label="Commentaire continuité" size="sm" />
              </div>

              <div className="text-xs text-muted-foreground font-mono pt-2">
                Index futur: <span className="text-cyan">{char.futureIndex}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'Matrice de relations' && (
        <div className="cockpit-card">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Matrice de Relations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {characters.map(c => <th key={c.id} className="p-2 text-muted-foreground font-normal truncate max-w-[80px]">{c.name.split(' ').pop()}</th>)}
                </tr>
              </thead>
              <tbody>
                {characters.map((c, i) => (
                  <tr key={c.id}>
                    <td className="p-2 text-muted-foreground font-mono">{c.name.split(' ').pop()}</td>
                    {characters.map((c2, j) => {
                      if (i === j) return <td key={c2.id} className="p-2 text-center">—</td>;
                      const intensity = Math.abs((i * 7 + j * 3) % 5);
                      const colors = ['bg-surface-2', 'bg-cyan/10', 'bg-cyan/20', 'bg-violet/20', 'bg-rose/20'];
                      const labels = ['faible', 'tension', 'alliance', 'conflit', 'secret'];
                      return <td key={c2.id} className={`p-2 text-center rounded ${colors[intensity]}`}>
                        <span className="text-[10px]">{labels[intensity]}</span>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 font-mono">* Données simulées — matrice non connectée</p>
        </div>
      )}

      {activeView !== 'Liste' && activeView !== 'Matrice de relations' && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Vue "{activeView}" — simulée</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Nécessite Supabase + OpenAI pour les données réelles</p>
        </div>
      )}
    </div>
  );
}
