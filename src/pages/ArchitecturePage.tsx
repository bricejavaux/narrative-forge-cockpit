import { useState } from 'react';
import { chapters, arcs, beats, payoffs, consequences } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import NoteComposer from '@/components/shared/NoteComposer';
import { Mic, Check, X, AlertTriangle } from 'lucide-react';

const tabs = ['Arcs globaux', 'Chapitres', 'Beats', 'Révélations', 'Payoffs', 'Conséquences', 'Timeline réelle', 'Ordre du récit'];

function ScaleBadge({ scale }: { scale?: string }) {
  if (!scale) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    macro: 'bg-primary/10 text-primary border-primary/20',
    micro: 'bg-rose/10 text-rose border-rose/20',
    mixte: 'bg-amber/10 text-amber border-amber/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${map[scale] || ''}`}>
      {scale}
    </span>
  );
}

function PhraseCouteauIcon({ status }: { status?: string }) {
  if (status === 'present') return <Check size={12} className="text-emerald" />;
  if (status === 'missing') return <X size={12} className="text-destructive" />;
  if (status === 'todo') return <AlertTriangle size={12} className="text-amber" />;
  return <span className="text-muted-foreground text-xs">—</span>;
}

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('Chapitres');
  const [selectedChapterForBeats, setSelectedChapterForBeats] = useState('ch01');

  const beatsForChapter = beats.filter((b) => b.chapterId === selectedChapterForBeats);
  const chaptersWithBeats = chapters.filter((c) => beats.some((b) => b.chapterId === c.id));

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Pilotage narratif</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Architecture Tome</h1>
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
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Titre</th>
                <th className="text-left py-2 px-2">Échelle</th>
                <th className="text-left py-2 px-2">Arc principal</th>
                <th className="text-left py-2 px-2">Coût</th>
                <th className="text-left py-2 px-2">Détail technique</th>
                <th className="text-center py-2 px-2">Phrase-couteau</th>
                <th className="text-left py-2 px-2">Statut</th>
                <th className="text-left py-2 px-2">Score</th>
                <th className="text-center py-2 px-2">Audio</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map(ch => (
                <tr key={ch.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                  <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{ch.number}</td>
                  <td className="py-2 px-2 text-foreground">{ch.title}</td>
                  <td className="py-2 px-2"><ScaleBadge scale={ch.scale} /></td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[180px] truncate">{ch.mainArc?.split('—')[0].trim()}</td>
                  <td className="py-2 px-2 text-xs text-foreground/80 max-w-[140px] truncate">{ch.costType || '—'}</td>
                  <td className="py-2 px-2 text-xs text-foreground/70 max-w-[160px] truncate">{ch.technicalDetail || '—'}</td>
                  <td className="py-2 px-2 text-center"><PhraseCouteauIcon status={ch.phraseCouteau} /></td>
                  <td className="py-2 px-2"><StatusBadge status={ch.status} /></td>
                  <td className="py-2 px-2"><div className="w-14"><ScoreBar value={ch.score} /></div></td>
                  <td className="py-2 px-2 text-center">
                    {ch.audioReviewStatus === 'done' && <Mic size={11} className="text-emerald inline" />}
                    {ch.audioReviewStatus === 'in_progress' && <Mic size={11} className="text-amber inline" />}
                    {ch.audioReviewStatus === 'pending' && <Mic size={11} className="text-rose/70 inline" />}
                    {ch.audioReviewStatus === 'none' && <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
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
              {arc.unresolvedQuestions && arc.unresolvedQuestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="editorial-eyebrow mb-1.5">Questions ouvertes</p>
                  <ul className="text-xs text-foreground/80 space-y-1">
                    {arc.unresolvedQuestions.map((q, i) => <li key={i}>· {q}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Payoff : <span className="text-foreground">{arc.payoffStatus}</span></p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Beats' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 cockpit-card space-y-1">
            <p className="editorial-eyebrow mb-2">Chapitres avec beats simulés</p>
            {chaptersWithBeats.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChapterForBeats(ch.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedChapterForBeats === ch.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                Ch.{ch.number} · {ch.title.length > 22 ? ch.title.slice(0, 22) + '…' : ch.title}
              </button>
            ))}
          </div>
          <div className="col-span-9 cockpit-card">
            <h3 className="editorial-eyebrow mb-3">Beats — {chapters.find(c => c.id === selectedChapterForBeats)?.title}</h3>
            <ol className="relative border-l border-border ml-2 space-y-3">
              {beatsForChapter.map((b) => (
                <li key={b.id} className="ml-4">
                  <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-card border-2 border-primary/40" />
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">#{b.order}</span>
                    <span className="text-sm text-foreground font-medium">{b.title}</span>
                    <ScaleBadge scale={b.scale} />
                  </div>
                  <p className="text-xs text-foreground/75">{b.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'Révélations' && (
        <div className="cockpit-card space-y-3">
          <h3 className="editorial-eyebrow">Révélations majeures — distribution B+ et doctrine</h3>
          <p className="text-xs text-muted-foreground">Chaque révélation est ancrée dans un arc et tracée jusqu'à son payoff.</p>
          <div className="divide-y divide-border mt-2">
            {payoffs.slice(0, 4).map((p) => (
              <div key={p.id} className="py-2.5 flex items-start gap-3">
                <StatusBadge status={p.status} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    Setup Ch.{p.setupChapter} → {p.payoffChapter} · {p.delay} · arc {p.arcId.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-amber mt-0.5">Risque : {p.risk}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Payoffs' && (
        <div className="cockpit-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-2">Payoff</th>
                <th className="text-left py-2 px-2">Setup</th>
                <th className="text-left py-2 px-2">Payoff prévu</th>
                <th className="text-left py-2 px-2">Délai</th>
                <th className="text-left py-2 px-2">Statut</th>
                <th className="text-left py-2 px-2">Arc</th>
                <th className="text-left py-2 px-2">Risque</th>
              </tr>
            </thead>
            <tbody>
              {payoffs.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 px-2 text-foreground max-w-[300px]">{p.label}</td>
                  <td className="py-2 px-2 font-mono text-xs text-muted-foreground">Ch.{p.setupChapter}</td>
                  <td className="py-2 px-2 font-mono text-xs text-foreground">{p.payoffChapter}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{p.delay}</td>
                  <td className="py-2 px-2"><StatusBadge status={p.status} /></td>
                  <td className="py-2 px-2 font-mono text-xs">{p.arcId.toUpperCase()}</td>
                  <td className="py-2 px-2 text-xs text-amber max-w-[200px]">{p.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Conséquences' && (
        <div className="cockpit-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-2">Chapitre</th>
                <th className="text-left py-2 px-2">Politique</th>
                <th className="text-left py-2 px-2">Social</th>
                <th className="text-left py-2 px-2">Physique</th>
                <th className="text-left py-2 px-2">Biosécurité</th>
                <th className="text-left py-2 px-2">Famille / intime</th>
              </tr>
            </thead>
            <tbody>
              {consequences.map((c) => {
                const ch = chapters.find((x) => x.id === c.chapterId)!;
                return (
                  <tr key={c.chapterId} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-xs text-foreground">Ch.{ch.number}</td>
                    <td className="py-2 px-2 text-xs text-foreground/80">{c.political}</td>
                    <td className="py-2 px-2 text-xs text-foreground/80">{c.social}</td>
                    <td className="py-2 px-2 text-xs text-foreground/80">{c.physical}</td>
                    <td className="py-2 px-2 text-xs text-foreground/80">{c.biosecurity}</td>
                    <td className="py-2 px-2 text-xs text-foreground/80">{c.family}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap */}
      {(activeTab === 'Chapitres' || activeTab === 'Arcs globaux') && (
        <div className="cockpit-card">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Heatmap Arc × Chapitre (avec marqueur d'échelle)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">Arc</th>
                  {chapters.map(ch => (
                    <th key={ch.id} className="p-2 text-center font-mono text-muted-foreground">
                      <div>Ch.{ch.number}</div>
                      <div className="mt-0.5"><ScaleBadge scale={ch.scale} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arcs.map(arc => (
                  <tr key={arc.id}>
                    <td className="p-2 text-muted-foreground truncate max-w-[150px]">{arc.name.split('—')[0].trim()}</td>
                    {chapters.map(ch => {
                      const present = ch.arcIds.includes(arc.id);
                      const intensity = present ? Math.round((ch.tension + ch.score) / 2) : 0;
                      let bg = 'bg-secondary/40';
                      if (present) {
                        if (intensity >= 80) bg = 'bg-primary/30';
                        else if (intensity >= 60) bg = 'bg-primary/20';
                        else if (intensity >= 40) bg = 'bg-primary/10';
                        else bg = 'bg-primary/5';
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

      {!['Chapitres', 'Arcs globaux', 'Beats', 'Révélations', 'Payoffs', 'Conséquences'].includes(activeTab) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Vue "{activeTab}" — simulée</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Future connexion requise</p>
        </div>
      )}

      <NoteComposer target={`architecture · ${activeTab}`} />
    </div>
  );
}
