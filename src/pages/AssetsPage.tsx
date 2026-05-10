import { useEffect, useState } from 'react';
import { assets, connectors } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Cloud, ArrowRight, RefreshCcw, Database, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { oneDriveService } from '@/services/oneDriveService';

const sections = ['Tous les assets', 'Référentiel OneDrive', 'Pipeline d\'ingestion'];

export default function AssetsPage() {
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [syncing, setSyncing] = useState(false);
  const [driveMode, setDriveMode] = useState<'mock' | 'live' | 'degraded' | 'unknown'>('unknown');
  const [driveError, setDriveError] = useState<string | undefined>();
  const [expectedFiles, setExpectedFiles] = useState<Array<{ path: string; found: boolean }>>([]);

  const onedrive = connectors.find((c) => c.id === 'onedrive')!;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await oneDriveService.checkConnection();
      setDriveMode((r.mode as any) ?? 'unknown');
      setDriveError(r.drive_error);
      const ef = await oneDriveService.findExpectedFiles();
      setExpectedFiles(ef);
    } catch (e) {
      setDriveMode('degraded');
      setDriveError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { handleSync(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="editorial-eyebrow">Atelier</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Assets</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:border-primary/40 hover:text-foreground text-muted-foreground transition-colors"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            Synchroniser OneDrive
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:border-primary/40 hover:text-foreground text-muted-foreground transition-colors">
            <Database size={12} /> Re-indexer
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <CheckCircle2 size={12} /> Valider intégration
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeSection === s
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {syncing && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center gap-2 text-foreground">
          <Loader2 size={12} className="animate-spin text-primary" />
          Synchronisation simulée — récupération OneDrive · chunking · tagging · ingestion vers indexes…
        </div>
      )}

      {activeSection === 'Tous les assets' && (
        <div className="cockpit-card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nom</th>
                <th className="text-left py-3 px-3 font-medium">Type</th>
                <th className="text-left py-3 px-3 font-medium">Source</th>
                <th className="text-left py-3 px-3 font-medium">Taille</th>
                <th className="text-left py-3 px-3 font-medium">Intégration</th>
                <th className="text-left py-3 px-3 font-medium">Indexation</th>
                <th className="text-left py-3 px-3 font-medium">Index cible</th>
                <th className="text-left py-3 px-3 font-medium">V.</th>
                <th className="text-left py-3 px-4 font-medium">Import</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="py-2.5 px-4 text-foreground">{a.name}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={a.type} /></td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{a.source}</td>
                  <td className="py-2.5 px-3 text-xs font-mono">{a.size}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={a.integrationStatus} /></td>
                  <td className="py-2.5 px-3"><StatusBadge status={a.indexationStatus} /></td>
                  <td className="py-2.5 px-3 text-xs font-mono text-primary">{a.targetIndex}</td>
                  <td className="py-2.5 px-3 font-mono text-xs">v{a.version}</td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{a.importDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'Référentiel OneDrive' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="cockpit-card-elevated md:col-span-2 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cloud size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl text-foreground" style={{ fontWeight: 500 }}>OneDrive</h3>
                  <p className="text-xs text-muted-foreground">Référentiel documentaire long terme — unique</p>
                </div>
              </div>
              <StatusBadge status={onedrive.status} />
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed">{onedrive.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="editorial-eyebrow mb-1">Rôle</p>
                <p className="text-foreground">Mémoire longue · corpus monde · archives</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="editorial-eyebrow mb-1">Index alimentés</p>
                <p className="text-foreground font-mono">long_memory_index · world_index</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="editorial-eyebrow mb-1">Corpus simulés</p>
                <p className="text-foreground font-mono">12 dossiers · 84 documents</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="editorial-eyebrow mb-1">Dernier sync</p>
                <p className="text-foreground font-mono">jamais — non branché</p>
              </div>
            </div>

            <button className="w-full py-2.5 text-xs rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              Connecter OneDrive — future connexion
            </button>
          </div>

          <div className="cockpit-card space-y-3">
            <h4 className="editorial-eyebrow">Architecture cible</h4>
            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-foreground">OneDrive</p>
                <p className="text-[11px] text-muted-foreground">Référentiel documentaire</p>
              </div>
              <div className="text-center text-muted-foreground">↓</div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <p className="font-medium text-foreground">Supabase</p>
                <p className="text-[11px] text-muted-foreground">Couche narrative active</p>
              </div>
              <div className="text-center text-muted-foreground">↓</div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5">
                <p className="font-medium text-foreground">OpenAI</p>
                <p className="text-[11px] text-muted-foreground">Orchestration & intelligence</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'Pipeline d\'ingestion' && (
        <div className="cockpit-card">
          <h3 className="editorial-heading text-foreground mb-6 text-lg">Pipeline d'ingestion documentaire</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
            {['Import OneDrive', 'Conversion', 'Chunking', 'Tagging', 'Structuration', 'Choix d\'index', 'Archivage'].map((step, i) => (
              <div key={step} className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/60 border border-border flex items-center justify-center text-xs font-mono text-foreground">
                    {i + 1}
                  </div>
                  <span className="text-[11px] text-muted-foreground text-center max-w-[90px]">{step}</span>
                </div>
                {i < 6 && <ArrowRight size={14} className="text-border" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-4">* Pipeline simulé — nécessite OneDrive + Supabase + OpenAI</p>
        </div>
      )}
    </div>
  );
}
