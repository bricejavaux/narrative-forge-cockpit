import { useState } from 'react';
import { chapters, arcs } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import MicButton from '@/components/shared/MicButton';
import { Mic, AlertTriangle } from 'lucide-react';

const tabs = ['Arcs globaux', 'Chapitres', 'Scènes', 'Beats', 'Timeline réelle', 'Ordre du récit', 'Révélations', 'Payoffs', 'Conséquences'];

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('Chapitres');

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Architecture Tome</h1>
        <MicButton label="Note sur l'architecture" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeTab === tab ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Chapitres' && (
        <div className="cockpit-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Titre</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Score</th>
                <th className="text-left py-2 px-3">Tension</th>
                <th className="text-left py-2 px-3">Sci. Densité</th>
                <th className="text-left py-2 px-3">Émotion</th>
                <th className="text-left py-2 px-3">Alerte</th>
                <th className="text-left py-2 px-3">V.</th>
                <th className="text-left py-2 px-3">Audio</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {chapters.map(ch => (
                <tr key={ch.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                  <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{ch.number}</td>
                  <td className="py-2 px-3 text-foreground">{ch.title}</td>
                  <td className="py-2 px-3"><StatusBadge status={ch.status} /></td>
                  <td className="py-2 px-3"><div className="w-16"><ScoreBar value={ch.score} /></div></td>
                  <td className="py-2 px-3"><div className="w-16"><ScoreBar value={ch.tension} color="violet" /></div></td>
                  <td className="py-2 px-3"><div className="w-16"><ScoreBar value={ch.sciDensity} color="cyan" /></div></td>
                  <td className="py-2 px-3"><div className="w-16"><ScoreBar value={ch.emotion} color="rose" /></div></td>
                  <td className="py-2 px-3 text-xs text-destructive max-w-[200px] truncate">{ch.mainAlert || '—'}</td>
                  <td className="py-2 px-3 font-mono text-xs">v{ch.version}</td>
                  <td className="py-2 px-3">{ch.hasAudio && <Mic size={12} className="text-rose" />}</td>
                  <td className="py-2 px-3"><MicButton size="sm" label="" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Arcs globaux' && (
        <div className="space-y-4">
          {arcs.map(arc => (
            <div key={arc.id} className="cockpit-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-semibold text-foreground">{arc.name}</h3>
                  <StatusBadge status={arc.type} />
                  <StatusBadge status={arc.status} />
                </div>
                <span className="text-xs text-muted-foreground">{arc.riskLevel}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-xs text-muted-foreground">Progression</span><ScoreBar value={arc.progress} color="cyan" size="md" /></div>
                <div><span className="text-xs text-muted-foreground">Tension</span><ScoreBar value={arc.tension} color="violet" size="md" /></div>
                <div><span className="text-xs text-muted-foreground">Chapitres</span><p className="text-sm font-mono text-foreground mt-1">{arc.chapters.join(', ')}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      {(activeTab === 'Chapitres' || activeTab === 'Arcs globaux') && (
        <div className="cockpit-card">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Heatmap Arc × Chapitre</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">Arc</th>
                  {chapters.map(ch => <th key={ch.id} className="p-2 text-center font-mono text-muted-foreground">Ch.{ch.number}</th>)}
                </tr>
              </thead>
              <tbody>
                {arcs.map(arc => (
                  <tr key={arc.id}>
                    <td className="p-2 text-muted-foreground truncate max-w-[150px]">{arc.name.split('—')[0].trim()}</td>
                    {chapters.map(ch => {
                      const present = ch.arcIds.includes(arc.id);
                      const intensity = present ? Math.round((ch.tension + ch.score) / 2) : 0;
                      let bg = 'bg-surface-2';
                      if (present) {
                        if (intensity >= 80) bg = 'bg-cyan/40';
                        else if (intensity >= 60) bg = 'bg-cyan/25';
                        else if (intensity >= 40) bg = 'bg-cyan/15';
                        else bg = 'bg-cyan/8';
                      }
                      return <td key={ch.id} className={`p-2 text-center ${bg} border border-border/30`}>
                        {present ? <span className="text-[10px] text-foreground">{intensity}</span> : ''}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Révélations' && (
        <div className="cockpit-card space-y-4">
          <h3 className="font-display font-semibold text-foreground">Révélations & Payoffs</h3>
          {[
            { rev: 'Signal d\'origine humaine', chapter: 8, payoff: 'Ch. 12 (planifié)', status: 'pending', delay: '4 chapitres' },
            { rev: 'Données mission Aether', chapter: 3, payoff: 'Non planifié', status: 'warning', delay: 'Indéfini' },
            { rev: 'Programme Ombre Stellaire', chapter: 5, payoff: 'Ch. 9 (planifié)', status: 'critical', delay: 'Retardé' },
            { rev: 'IA ARIA consciente', chapter: 7, payoff: 'Ch. 15 (planifié)', status: 'active', delay: '8 chapitres' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                <span className="text-sm text-foreground">{item.rev}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Posée Ch.{item.chapter}</span>
                <span>Payoff: {item.payoff}</span>
                <span className={item.status === 'critical' ? 'text-destructive' : ''}>{item.delay}</span>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground font-mono">* Données simulées</p>
        </div>
      )}

      {!['Chapitres', 'Arcs globaux', 'Révélations'].includes(activeTab) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Vue "{activeTab}" — simulée</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Future connexion requise</p>
        </div>
      )}
    </div>
  );
}
