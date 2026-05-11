import { useEffect, useState } from 'react';
import {
  BarChart3, BookOpen, AlertTriangle, Plug, Play, TrendingDown,
  FileText, Mic, Download, Upload, DollarSign, Clock, Activity, Zap
} from 'lucide-react';
import WarningBanner from '@/components/shared/WarningBanner';
import ConnectionReadinessPanel from '@/components/shared/ConnectionReadinessPanel';
import ImportReconcilePanel from '@/components/shared/ImportReconcilePanel';
import OneDriveRepositoryPanel from '@/components/shared/OneDriveRepositoryPanel';
import DataFlowDoctrineBanner from '@/components/shared/DataFlowDoctrineBanner';
import KpiCard from '@/components/shared/KpiCard';
import ConnectorStatusCard from '@/components/shared/ConnectorStatusCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ScoreBar from '@/components/shared/ScoreBar';
import { project, connectors, chapters, arcs, recentActivity, audioNotes, runs } from '@/data/dummyData';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

function buildWarnings(r: ConnectionReadiness | null) {
  const w: Array<{ text: string; severity: 'info' | 'warning' | 'critical' }> = [];
  if (!r) return w;
  if (r.onedrive.oauth_configured) {
    w.push({ text: 'OneDrive — connecté en lecture. Téléchargement réel des sources actif.', severity: 'info' });
  } else {
    w.push({ text: 'OneDrive non branché — sources en mode mock/fallback.', severity: 'warning' });
  }
  if (r.openai.api_key_configured) {
    w.push({ text: `OpenAI runtime live — model: ${r.openai.model ?? 'défaut'}.`, severity: 'info' });
  } else {
    w.push({ text: 'OPENAI_API_KEY — à configurer en secret Edge Function pour activer extraction, structuration et diagnostics.', severity: 'warning' });
  }
  if (r.supabase.project_connected && r.supabase.tables_created) {
    w.push({ text: 'Supabase actif — tables créées. Écritures sensibles via Edge Functions (service role).', severity: 'info' });
  }
  if (!r.supabase.rls_policies_configured) {
    w.push({ text: 'RLS activé sans policies frontend — lectures/écritures directes limitées, sensible passe par Edge Functions.', severity: 'warning' });
  }
  if (!r.indexes.pgvector_ready) {
    w.push({ text: 'pgvector — pending. Paquets vectoriels OneDrive prêts, ingestion non activée.', severity: 'warning' });
  }
  if (!r.openai.transcription_available) {
    w.push({ text: 'Pipeline audio (Whisper) — pending tant que l\'upload/download audio n\'est pas câblé.', severity: 'warning' });
  }
  return w;
}

export default function DashboardPage() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);

  const weakChapters = chapters.filter(c => c.score < 60);
  const riskArcs = arcs.filter(a => a.status === 'warning' || a.status === 'critical');
  const criticalWarnings = buildWarnings(readiness);

  const liveCount =
    (readiness?.openai?.api_key_configured ? 1 : 0) +
    (readiness?.onedrive?.oauth_configured ? 1 : 0) +
    (readiness?.supabase?.project_connected && readiness?.supabase?.tables_created ? 1 : 0);
  const gapsCount =
    (!readiness?.openai?.api_key_configured ? 1 : 0) +
    (!readiness?.onedrive?.oauth_configured ? 1 : 0) +
    (!readiness?.indexes?.pgvector_ready ? 1 : 0) +
    (readiness?.openai?.transcription_pipeline_status &&
      readiness.openai.transcription_pipeline_status !== 'transcription_live' ? 1 : 0);
  const modeLabel = !readiness ? 'Vérification…'
    : liveCount >= 3 ? 'Live partiel — mock résiduel'
    : liveCount >= 1 ? 'Mode hybride : live + mock'
    : 'Mock fallback';
  const lastChecked = readiness?.checked_at ? new Date(readiness.checked_at) : new Date();

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/5 border-primary/30 text-primary">{modeLabel}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">Vérifié : {lastChecked.toLocaleString()}</span>
      </div>

      <WarningBanner warnings={criticalWarnings} />

      <DataFlowDoctrineBanner compact />

      <ConnectionReadinessPanel compact />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OneDriveRepositoryPanel />
        <ImportReconcilePanel />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Score Tome" value={project.globalScore} icon={BarChart3} color="cyan" subtitle="/ 100" />
        <KpiCard label="Chapitres" value={project.totalChapters} icon={BookOpen} color="violet" />
        <KpiCard label="Alertes" value={project.criticalAlerts} icon={AlertTriangle} color="destructive" />
        <KpiCard label="Dette Narrative" value={project.narrativeDebt} icon={TrendingDown} color="amber" subtitle="points de dette" />
        <KpiCard label="Audio non traités" value={project.untreatedAudioComments} icon={Mic} color="rose" />
        <KpiCard label="Capacités à finaliser" value={gapsCount} icon={Plug} color={gapsCount > 0 ? 'amber' : 'cyan'} subtitle={`${liveCount} live`} />
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
