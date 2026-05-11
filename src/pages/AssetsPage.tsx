import { useEffect, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import VectorPackagesPanel from '@/components/shared/VectorPackagesPanel';
import { Cloud, RefreshCcw, Database, CheckCircle2, Loader2, AlertTriangle, FileText, Image as ImageIcon, Archive, Download } from 'lucide-react';
import { oneDriveService, type OneDriveCheckResult } from '@/services/oneDriveService';
import { ONEDRIVE_REPOSITORY } from '@/lib/runtimeMode';
import { indexingService } from '@/services/indexingService';

const sections = ['Sources actives', 'Paquets vectoriels (06_vector_sources)', 'Archives Chroma'];

type CoreAsset = {
  key: string;
  name: string;
  path: string;
  type: 'text' | 'image';
  target: string;
  description: string;
};

const CORE_ASSETS: CoreAsset[] = [
  {
    key: 'articulation',
    name: 'articulation.txt',
    path: 'Documents/Projet Roman/Les_Arches/01_sources/articulation.txt',
    type: 'text',
    target: 'canon_objects · global_arcs · chapters',
    description: 'Source narrative principale — articulation du roman, canon, arcs.',
  },
  {
    key: 'personnages',
    name: 'personnages.txt',
    path: 'Documents/Projet Roman/Les_Arches/01_sources/personnages.txt',
    type: 'text',
    target: 'characters',
    description: 'Fiche personnages — rôles, fonctions, objectifs, failles, secrets.',
  },
  {
    key: 'cover',
    name: 'cover.jpg',
    path: 'Documents/Projet Roman/Les_Arches/05_covers/cover.jpg',
    type: 'image',
    target: 'visual assets',
    description: 'Couverture — usage interne uniquement.',
  },
];

export default function AssetsPage() {
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [syncing, setSyncing] = useState(false);
  const [drive, setDrive] = useState<OneDriveCheckResult | null>(null);
  const [expectedFiles, setExpectedFiles] = useState<Array<{ path: string; found: boolean }>>([]);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSync = async () => {
    setSyncing(true);
    setSyncSummary(null);
    try {
      const r = await oneDriveService.checkConnection();
      setDrive(r);
      const ef = await oneDriveService.findExpectedFiles();
      setExpectedFiles(ef);
      const s = await indexingService.syncVectorPackages();
      if (s?.mode === 'live' && Array.isArray(s.synced)) {
        const ok = s.synced.filter((x: any) => x.ok).length;
        setSyncSummary(`Métadonnées vectorielles synchronisées : ${ok}/${s.synced.length} corpus.`);
      } else if (s?.mode === 'mock') {
        setSyncSummary('OneDrive non autorisé — métadonnées vectorielles non rafraîchies.');
      } else if (s?.error) {
        setSyncSummary(`Sync vectorielle : ${s.error}`);
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setDrive({ mode: 'degraded', structure: { root: ONEDRIVE_REPOSITORY.root, folders: [] }, drive_error: e instanceof Error ? e.message : 'unknown' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { handleSync(); /* eslint-disable-next-line */ }, []);

  const findFile = (relPath: string) => {
    // relPath e.g. "01_sources/articulation.txt"
    if (!drive) return null;
    const [folder, ...rest] = relPath.split('/');
    const name = rest.join('/');
    const f = drive.structure.folders.find((x) => x.path === folder);
    if (!f) return null;
    const found = (f.files ?? []).includes(name);
    return { found, size: f.sizes?.[name] };
  };

  const driveMode = drive?.mode ?? 'unknown';

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="editorial-eyebrow">Atelier</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Assets</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Source : <span className="font-mono">OneDrive</span> · Données actives : <span className="font-mono">Supabase</span> · Export OneDrive : manuel uniquement.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            driveMode === 'live' ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
            : driveMode === 'degraded' ? 'border-rose-500/40 text-rose-600 bg-rose-500/5'
            : 'border-amber/40 text-amber bg-amber/5'
          }`}>
            OneDrive : {driveMode}
          </span>
          <button
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            Rafraîchir dépôt OneDrive
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
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

      {drive?.drive_error && (
        <div className="rounded-xl border border-amber/30 bg-amber/5 p-3 text-xs flex items-center gap-2 text-amber">
          <AlertTriangle size={12} /> {drive.drive_error}
        </div>
      )}
      {syncSummary && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
          {syncSummary}
        </div>
      )}

      {activeSection === 'Sources actives' && (
        <div className="space-y-4">
          <div className="cockpit-card-elevated">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Cloud size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg text-foreground" style={{ fontWeight: 500 }}>Fichiers sources OneDrive</h3>
                <p className="text-xs text-muted-foreground">Articulation, personnages, couverture — points d'entrée du roman.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CORE_ASSETS.map((a) => {
                const rel = a.path.replace('Documents/Projet Roman/Les_Arches/', '');
                const probe = findFile(rel);
                const ok = probe?.found ?? expectedFiles.find((f) => f.path === rel)?.found ?? false;
                const Icon = a.type === 'image' ? ImageIcon : FileText;
                return (
                  <div key={a.key} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-muted-foreground" />
                        <span className="font-mono text-sm text-foreground">{a.name}</span>
                      </div>
                      {ok ? (
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={12} className="text-amber" />
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground truncate" title={a.path}>{a.path}</p>
                    <p className="text-[11px] text-foreground/80">{a.description}</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="rounded border border-border bg-card/50 p-1.5">
                        <p className="editorial-eyebrow mb-0.5">cible</p>
                        <p className="text-foreground font-mono truncate" title={a.target}>{a.target}</p>
                      </div>
                      <div className="rounded border border-border bg-card/50 p-1.5">
                        <p className="editorial-eyebrow mb-0.5">taille</p>
                        <p className="text-foreground font-mono">{probe?.size ? `${probe.size.toLocaleString()} o` : '—'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-card/50 text-muted-foreground">
                        Source : OneDrive
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary">
                        Active : Supabase
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground italic mt-3">
              Les imports passent par <span className="font-mono">Tableau de bord → Import & Réconciliation</span>. Aucune écriture automatique.
            </p>
          </div>

          {expectedFiles.length > 0 && (
            <div className="cockpit-card">
              <p className="editorial-eyebrow mb-2">Fichiers attendus</p>
              <ul className="text-[11px] font-mono space-y-0.5">
                {expectedFiles.map((f) => (
                  <li key={f.path} className="flex items-center gap-1.5">
                    {f.found ? <CheckCircle2 size={10} className="text-emerald-600" /> : <AlertTriangle size={10} className="text-amber" />}
                    <span className={f.found ? 'text-foreground' : 'text-muted-foreground'}>{f.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeSection === 'Paquets vectoriels (06_vector_sources)' && (
        <div className="space-y-3">
          <div className="cockpit-card text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-mono text-foreground">06_vector_sources/</span> regroupe les corpus préparés pour ingestion vectorielle future.
              Pour chaque corpus : manifest, inventaire, chunks préparés.
            </p>
            <p>
              <span className="text-amber font-mono">pgvector : pending</span> — aucune ingestion automatique. Les chunks restent dans OneDrive, seuls les méta-données sont matérialisées dans Supabase.
            </p>
          </div>
          <VectorPackagesPanel />
        </div>
      )}

      {activeSection === 'Archives Chroma' && (
        <div className="cockpit-card space-y-3">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-muted-foreground" />
            <h3 className="font-display text-lg text-foreground" style={{ fontWeight: 500 }}>
              Archives Chroma — <span className="font-mono text-sm">03_chroma_archives/</span>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Archives techniques héritées (.sqlite3). <span className="text-amber font-mono">Pas des indexes actifs.</span> Conservées pour traçabilité.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ONEDRIVE_REPOSITORY.expectedFiles.chromaSubfolders.map((name) => (
              <div key={name} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Database size={12} className="text-muted-foreground" />
                  <span className="font-mono text-sm text-foreground">{name}</span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">03_chroma_archives/{name}/</p>
                <div className="flex gap-1.5 flex-wrap">
                  <StatusBadge status="archived" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber/30 bg-amber/5 text-amber">
                    pgvector : pending
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Décision technique : re-vectoriser depuis sources OU extraire chunks/embeddings Chroma. Voir page <span className="font-mono">Indexes</span>.
          </p>
        </div>
      )}
    </div>
  );
}
