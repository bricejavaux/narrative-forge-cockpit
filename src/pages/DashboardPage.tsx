import {
  BarChart3, BookOpen, AlertTriangle, Plug, Play, TrendingDown,
  FileText, Mic, Download, Upload, DollarSign, Clock, Activity, Zap
} from 'lucide-react';
import WarningBanner from '@/components/shared/WarningBanner';
import KpiCard from '@/components/shared/KpiCard';
import ConnectorStatusCard from '@/components/shared/ConnectorStatusCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import { project, connectors, chapters, arcs, recentActivity, audioNotes, runs } from '@/data/dummyData';

const criticalWarnings = [
  { text: 'OpenAI API — non branchée. Pas de génération, audit ni transcription.', severity: 'critical' as const },
  { text: 'Supabase (DB / Auth / Storage) — non branché. Pas de persistance ni d\'auth.', severity: 'critical' as const },
  { text: 'OneDrive — non branché. Référentiel documentaire long terme inaccessible.', severity: 'critical' as const },
  { text: 'Indexes vectoriels — simulés. Pas de recherche sémantique réelle.', severity: 'warning' as const },
  { text: 'Whisper / transcription — simulé. Notes audio non transcrites.', severity: 'warning' as const },
  { text: 'Exports texte / markdown / JSON — moteur simulé.', severity: 'info' as const },
];

export default function DashboardPage() {
  const weakChapters = chapters.filter(c => c.score < 60);
  const riskArcs = arcs.filter(a => a.status === 'warning' || a.status === 'critical');

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <span className="text-xs font-mono text-muted-foreground">Dernière mise à jour : 2026-04-14 10:30</span>
      </div>

      <WarningBanner warnings={criticalWarnings} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Score Tome" value={project.globalScore} icon={BarChart3} color="cyan" subtitle="/ 100" />
        <KpiCard label="Chapitres" value={project.totalChapters} icon={BookOpen} color="violet" />
        <KpiCard label="Alertes" value={project.criticalAlerts} icon={AlertTriangle} color="destructive" />
        <KpiCard label="Dette Narrative" value={project.narrativeDebt} icon={TrendingDown} color="amber" subtitle="points de dette" />
        <KpiCard label="Audio non traités" value={project.untreatedAudioComments} icon={Mic} color="rose" />
        <KpiCard label="Connecteurs" value={`${connectors.filter(c => c.status === 'not_connected').length} / ${connectors.length}`} icon={Plug} color="destructive" subtitle="déconnectés" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Santé narrative */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
            <Activity size={16} className="text-cyan" />
            Santé Narrative
          </h2>
          
          {/* Arcs à risque */}
          <div className="cockpit-card space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Arcs à risque</h3>
            {riskArcs.map(arc => (
              <div key={arc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={arc.status} />
                  <span className="text-sm text-foreground">{arc.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24"><ScoreBar value={arc.progress} /></div>
                  <span className="text-xs text-muted-foreground">{arc.riskLevel}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chapitres faibles */}
          <div className="cockpit-card space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Chapitres faibles (score &lt; 60)</h3>
            {weakChapters.map(ch => (
              <div key={ch.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-8">Ch.{ch.number}</span>
                  <span className="text-sm text-foreground">{ch.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20"><ScoreBar value={ch.score} /></div>
                  {ch.mainAlert && <span className="text-xs text-destructive">{ch.mainAlert}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Derniers runs */}
          <div className="cockpit-card space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Derniers Runs</h3>
            {runs.slice(0, 4).map(run => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Play size={12} className="text-cyan" />
                  <span className="text-sm text-foreground">{run.name}</span>
                  <StatusBadge status={run.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{run.findings} findings</span>
                  <span className="font-mono">{run.cost}</span>
                  <span>{run.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Système */}
          <h2 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
            <Zap size={16} className="text-amber" />
            Santé Système
          </h2>

          <div className="cockpit-card space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Coût simulé</span>
              <span className="font-mono text-foreground">{project.simulatedCost}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Latence simulée</span>
              <span className="font-mono text-foreground">{project.simulatedLatency}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dernier import</span>
              <span className="font-mono text-foreground">{project.lastImport}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dernier export</span>
              <span className="font-mono text-foreground">{project.lastExport}</span>
            </div>
          </div>

          {/* Connecteurs résumé */}
          <div className="cockpit-card space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Connecteurs</h3>
            {connectors.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>

          {/* Activité récente */}
          <div className="cockpit-card space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Activité Récente</h3>
            {recentActivity.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <div className="mt-0.5">
                  {a.type === 'run' && <Play size={10} className="text-cyan" />}
                  {a.type === 'audio' && <Mic size={10} className="text-rose" />}
                  {a.type === 'edit' && <FileText size={10} className="text-violet" />}
                  {a.type === 'import' && <Upload size={10} className="text-emerald" />}
                  {a.type === 'export' && <Download size={10} className="text-primary" />}
                  {a.type === 'alert' && <AlertTriangle size={10} className="text-destructive" />}
                </div>
                <div>
                  <p className="text-xs text-foreground">{a.action}</p>
                  <p className="text-[10px] text-muted-foreground">{a.target} · {a.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
