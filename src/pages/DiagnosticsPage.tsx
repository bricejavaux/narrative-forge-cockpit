import { useState } from 'react';
import { chapters, arcs, characters, audioNotes } from '@/data/dummyData';
import ScoreBar from '@/components/shared/ScoreBar';
import StatusBadge from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const subViews = ['Score global', 'Par chapitre', 'Par arc', 'Par personnage', 'Répétitions', 'Révélations', 'Escalade', 'Charge cognitive', 'Densité scientifique', 'Avant/après réécriture', 'Audio review coverage'];

export default function DiagnosticsPage() {
  const [activeView, setActiveView] = useState(subViews[0]);

  const chapterData = chapters.map(ch => ({
    name: `Ch.${ch.number}`,
    score: ch.score,
    tension: ch.tension,
    sciDensity: ch.sciDensity,
    emotion: ch.emotion,
  }));

  const openAudioCount = audioNotes.filter(a => a.treatmentStatus === 'open').length;

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Diagnostics</h1>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {subViews.map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeView === v ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {v}
          </button>
        ))}
      </div>

      {activeView === 'Score global' && (
        <div className="space-y-4">
          <div className="cockpit-card">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Score par chapitre</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chapterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 16%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215 15% 50%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215 15% 50%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: 8, color: 'hsl(210 20% 90%)' }} />
                <Bar dataKey="score" fill="hsl(187 80% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="cockpit-card">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Courbes multidimensionnelles</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chapterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 16%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215 15% 50%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215 15% 50%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: 8, color: 'hsl(210 20% 90%)' }} />
                <Line type="monotone" dataKey="tension" stroke="hsl(270 50% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sciDensity" stroke="hsl(187 80% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="emotion" stroke="hsl(330 50% 55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet inline-block" /> Tension</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan inline-block" /> Densité sci.</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose inline-block" /> Émotion</span>
            </div>
          </div>
        </div>
      )}

      {activeView === 'Par chapitre' && (
        <div className="cockpit-card">
          <div className="space-y-3">
            {chapters.map(ch => (
              <div key={ch.id} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                <span className="font-mono text-xs text-muted-foreground w-10">Ch.{ch.number}</span>
                <span className="text-sm text-foreground w-48 truncate">{ch.title}</span>
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <div><span className="text-[10px] text-muted-foreground">Score</span><ScoreBar value={ch.score} /></div>
                  <div><span className="text-[10px] text-muted-foreground">Tension</span><ScoreBar value={ch.tension} color="violet" /></div>
                  <div><span className="text-[10px] text-muted-foreground">Sci.</span><ScoreBar value={ch.sciDensity} color="cyan" /></div>
                  <div><span className="text-[10px] text-muted-foreground">Émotion</span><ScoreBar value={ch.emotion} color="rose" /></div>
                </div>
                {ch.mainAlert && <span className="text-xs text-destructive truncate max-w-[180px]">{ch.mainAlert}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'Audio review coverage' && (
        <div className="space-y-4">
          <div className="cockpit-card">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Couverture audio des chapitres</h3>
            <div className="space-y-2">
              {chapters.map(ch => (
                <div key={ch.id} className="flex items-center gap-4">
                  <span className="font-mono text-xs text-muted-foreground w-10">Ch.{ch.number}</span>
                  <span className="text-sm text-foreground w-48 truncate">{ch.title}</span>
                  <StatusBadge status={ch.hasAudio ? 'done' : 'open'} />
                  <span className="text-xs text-muted-foreground">{ch.hasAudio ? 'Relu oralement' : 'Pas de relecture audio'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cockpit-card">
            <h3 className="text-sm font-display font-semibold text-foreground mb-3">Remarques audio</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-amber">{openAudioCount}</span><p className="text-[10px] text-muted-foreground">Ouvertes</p></div>
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-cyan">{audioNotes.filter(a => a.treatmentStatus === 'in_progress').length}</span><p className="text-[10px] text-muted-foreground">En cours</p></div>
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-emerald">{audioNotes.filter(a => a.treatmentStatus === 'done').length}</span><p className="text-[10px] text-muted-foreground">Traitées</p></div>
            </div>
          </div>
        </div>
      )}

      {!['Score global', 'Par chapitre', 'Audio review coverage'].includes(activeView) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Vue "{activeView}" — données simulées</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Nécessite Supabase + OpenAI pour les diagnostics réels</p>
        </div>
      )}
    </div>
  );
}
