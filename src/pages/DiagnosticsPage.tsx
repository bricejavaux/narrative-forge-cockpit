import { useState } from 'react';
import { chapters, arcs, characters, audioNotes } from '@/data/dummyData';
import ScoreBar from '@/components/shared/ScoreBar';
import StatusBadge from '@/components/shared/StatusBadge';
import MicButton from '@/components/shared/MicButton';
import NoteComposer from '@/components/shared/NoteComposer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Sparkles, Wand2, ArrowRight, ChevronDown, ChevronRight, Lightbulb, AlertTriangle } from 'lucide-react';

const subViews = ['Score global', 'Par chapitre', 'Par arc', 'Par personnage', 'Hiérarchie L4 / Walvis Bay', 'Alternance macro/micro', 'Détail par scène', 'Coût par activation', 'Phrase-couteau', 'Trace non-humanisée', 'Brice — ingénieur → gardien', 'Audio review coverage'];

const chartGrid = 'hsl(220 14% 89%)';
const chartText = 'hsl(220 10% 45%)';
const chartTooltipBg = 'hsl(0 0% 100%)';
const colorPrimary = 'hsl(195 32% 50%)';
const colorViolet = 'hsl(258 28% 60%)';
const colorRose = 'hsl(350 30% 62%)';

export default function DiagnosticsPage() {
  const [activeView, setActiveView] = useState(subViews[0]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const chapterData = chapters.map((ch) => ({
    name: `Ch.${ch.number}`,
    score: ch.score, tension: ch.tension, sciDensity: ch.sciDensity, emotion: ch.emotion,
  }));

  const openAudioCount = audioNotes.filter((a) => a.treatmentStatus === 'open').length;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Intelligence</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Lecture multi-dimensionnelle de la santé narrative. Chaque score est accompagné de son
          interprétation, des risques détectés et de recommandations actionnables.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {subViews.map((v) => (
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

      {activeView === 'Score global' && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 cockpit-card-elevated">
              <p className="editorial-eyebrow">Score tome</p>
              <p className="text-5xl editorial-heading text-foreground mt-2">72<span className="text-2xl text-muted-foreground">/100</span></p>
              <div className="mt-3"><ScoreBar value={72} /></div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Le tome 2 présente une <span className="text-foreground">progression solide</span> mais une
                <span className="text-amber"> dette dramatique élevée sur l'arc politique</span> et trois chapitres en
                dessous du seuil de validation.
              </p>
            </div>
            <div className="col-span-8 cockpit-card">
              <h3 className="editorial-eyebrow mb-3">Score par chapitre</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chapterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 11 }} stroke={chartGrid} />
                  <YAxis tick={{ fill: chartText, fontSize: 11 }} stroke={chartGrid} />
                  <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartGrid}`, borderRadius: 10, color: 'hsl(222 18% 18%)', fontSize: 12, boxShadow: '0 4px 16px hsl(220 25% 20% / 0.08)' }} />
                  <Bar dataKey="score" fill={colorPrimary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explanation panel */}
          <div className="cockpit-card space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber" />
              <h3 className="editorial-eyebrow">Interprétation & risques narratifs</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="editorial-eyebrow mb-1.5">Pourquoi ce score</p>
                <p className="text-foreground/80 leading-relaxed">
                  Le score global combine 7 dimensions pondérées : cohérence canon (20%), tension (15%),
                  densité scientifique (12%), payoff (15%), rythme (12%), personnages (15%), style (11%).
                </p>
              </div>
              <div>
                <p className="editorial-eyebrow mb-1.5">Risques détectés</p>
                <ul className="space-y-1 text-foreground/80">
                  <li className="flex gap-1.5"><AlertTriangle size={11} className="text-destructive mt-1 shrink-0" /> Ch.9 sous le seuil (45/100)</li>
                  <li className="flex gap-1.5"><AlertTriangle size={11} className="text-amber mt-1 shrink-0" /> Arc politique en progression lente</li>
                  <li className="flex gap-1.5"><AlertTriangle size={11} className="text-amber mt-1 shrink-0" /> Payoff conspiration manquant</li>
                </ul>
              </div>
              <div>
                <p className="editorial-eyebrow mb-1.5">Recommandations</p>
                <ul className="space-y-1 text-foreground/80">
                  <li>→ Réécriture profonde Ch.9 (priorité haute)</li>
                  <li>→ Beat de payoff à insérer Ch.10–11</li>
                  <li>→ Audit cohérence Ch.7–9</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <Wand2 size={12} /> Générer les recommandations
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight size={12} /> Ouvrir les chapitres à risque
              </button>
              <MicButton label="Relecture vocale du diagnostic" size="sm" />
            </div>
          </div>

          {/* Transverse note composer */}
          <NoteComposer target="diagnostic global du tome" compact />

          {/* Multi-line */}
          <div className="cockpit-card">
            <h3 className="editorial-eyebrow mb-3">Courbes multidimensionnelles</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chapterData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 11 }} stroke={chartGrid} />
                <YAxis tick={{ fill: chartText, fontSize: 11 }} stroke={chartGrid} />
                <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartGrid}`, borderRadius: 10, color: 'hsl(222 18% 18%)', fontSize: 12, boxShadow: '0 4px 16px hsl(220 25% 20% / 0.08)' }} />
                <Line type="monotone" dataKey="tension" stroke={colorViolet} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sciDensity" stroke={colorPrimary} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="emotion" stroke={colorRose} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent inline-block" /> Tension</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block" /> Densité scientifique</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose inline-block" /> Émotion</span>
            </div>
          </div>
        </div>
      )}

      {activeView === 'Par chapitre' && (
        <div className="cockpit-card divide-y divide-border">
          {chapters.map((ch) => (
            <div key={ch.id} className="py-3">
              <button
                onClick={() => setExpanded(expanded === ch.id ? null : ch.id)}
                className="w-full flex items-center gap-4 text-left"
              >
                {expanded === ch.id ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                <span className="font-mono text-xs text-muted-foreground w-10">Ch.{ch.number}</span>
                <span className="text-sm text-foreground w-56 truncate">{ch.title}</span>
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div><p className="text-[10px] text-muted-foreground">Score</p><ScoreBar value={ch.score} /></div>
                  <div><p className="text-[10px] text-muted-foreground">Tension</p><ScoreBar value={ch.tension} color="violet" /></div>
                  <div><p className="text-[10px] text-muted-foreground">Sci.</p><ScoreBar value={ch.sciDensity} color="cyan" /></div>
                  <div><p className="text-[10px] text-muted-foreground">Émotion</p><ScoreBar value={ch.emotion} color="rose" /></div>
                </div>
                {ch.mainAlert && <span className="text-xs text-destructive truncate max-w-[160px]">{ch.mainAlert}</span>}
              </button>
              {expanded === ch.id && (
                <div className="ml-10 mt-3 grid grid-cols-3 gap-4 text-xs animate-slide-in">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="editorial-eyebrow mb-1">Diagnostic</p>
                    <p className="text-foreground/80 leading-relaxed">
                      {ch.score >= 80 ? 'Chapitre solide. Tension bien calibrée, payoff lisible.' :
                       ch.score >= 60 ? 'Chapitre fonctionnel, quelques ajustements de rythme conseillés.' :
                       'Chapitre fragile. Score sous le seuil — réécriture profonde recommandée.'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="editorial-eyebrow mb-1">Recommandations</p>
                    <ul className="text-foreground/80 space-y-0.5">
                      <li>→ Style pass</li>
                      <li>→ Audit cohérence cross-chapitres</li>
                      {ch.score < 60 && <li>→ Réécriture profonde</li>}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="editorial-eyebrow mb-1">Actions</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button className="px-2 py-1 rounded bg-card border border-border text-[11px] hover:border-primary/40">Ouvrir le chapitre</button>
                      <button className="px-2 py-1 rounded bg-card border border-border text-[11px] hover:border-primary/40">Lancer audit</button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <NoteComposer target={`Ch.${ch.number} · ${ch.title}`} compact />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeView === 'Audio review coverage' && (
        <div className="space-y-4">
          <div className="cockpit-card">
            <h3 className="editorial-eyebrow mb-3">Couverture audio des chapitres</h3>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div key={ch.id} className="flex items-center gap-4 py-1.5 border-b border-border/60 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground w-10">Ch.{ch.number}</span>
                  <span className="text-sm text-foreground w-56 truncate">{ch.title}</span>
                  <StatusBadge status={ch.hasAudio ? 'done' : 'open'} />
                  <span className="text-xs text-muted-foreground">{ch.hasAudio ? 'Relu oralement' : 'Pas de relecture audio'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cockpit-card">
            <h3 className="editorial-eyebrow mb-3">Remarques audio</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-2xl font-display text-amber" style={{ fontWeight: 500 }}>{openAudioCount}</p>
                <p className="editorial-eyebrow mt-1">Ouvertes</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-2xl font-display text-primary" style={{ fontWeight: 500 }}>{audioNotes.filter((a) => a.treatmentStatus === 'in_progress').length}</p>
                <p className="editorial-eyebrow mt-1">En cours</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-2xl font-display text-emerald" style={{ fontWeight: 500 }}>{audioNotes.filter((a) => a.treatmentStatus === 'done').length}</p>
                <p className="editorial-eyebrow mt-1">Traitées</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!['Score global', 'Par chapitre', 'Audio review coverage'].includes(activeView) && (
        <div className="cockpit-card p-12 text-center">
          <Sparkles size={20} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">Vue "{activeView}" — données simulées</p>
          <p className="text-xs text-muted-foreground/70 mt-2 font-mono">Nécessite Supabase + OpenAI</p>
        </div>
      )}
    </div>
  );
}
