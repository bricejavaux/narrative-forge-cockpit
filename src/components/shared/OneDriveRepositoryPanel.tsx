import { useEffect, useState } from 'react';
import { Folder, FileText, Image as ImageIcon, Archive, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { oneDriveService } from '@/services/oneDriveService';
import { ONEDRIVE_REPOSITORY } from '@/lib/runtimeMode';

export default function OneDriveRepositoryPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof oneDriveService.checkConnection>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await oneDriveService.checkConnection());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const modeBadge = !data ? null : (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
        data.mode === 'live'
          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
          : data.mode === 'degraded'
          ? 'border-amber-500/40 text-amber-600 bg-amber-500/5'
          : 'border-border text-muted-foreground bg-secondary/40'
      }`}
    >
      {data.mode}
    </span>
  );

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="editorial-eyebrow">Référentiel OneDrive</p>
          <h3 className="text-lg editorial-heading text-foreground">{ONEDRIVE_REPOSITORY.root}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Source documentaire long terme. Supabase reste la couche active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modeBadge}
          <button onClick={refresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3" /> Rafraîchir
          </button>
        </div>
      </div>

      {loading && !data && <div className="text-sm text-muted-foreground">Inspection du dépôt…</div>}
      {err && <div className="text-sm text-amber-600">Erreur : {err}</div>}

      {data && (
        <div className="space-y-2">
          {data.structure.folders.map((folder) => {
            const expectedFiles =
              folder.path === ONEDRIVE_REPOSITORY.paths.sources
                ? ONEDRIVE_REPOSITORY.expectedFiles.sources
                : folder.path === ONEDRIVE_REPOSITORY.paths.covers
                ? ONEDRIVE_REPOSITORY.expectedFiles.covers
                : [];
            const isChroma = folder.path === ONEDRIVE_REPOSITORY.paths.chromaArchives;
            return (
              <div key={folder.path} className="rounded-md border border-border/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isChroma ? (
                      <Archive className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Folder className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-mono text-foreground">{folder.path}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {(folder.files?.length ?? 0)} fichier(s)
                    {folder.subfolders ? ` · ${folder.subfolders.length} archives` : ''}
                  </span>
                </div>

                {(folder.files?.length || expectedFiles.length || folder.subfolders?.length) ? (
                  <div className="mt-2 space-y-1 pl-6">
                    {expectedFiles.map((f) => {
                      const found = folder.files?.includes(f);
                      const Icon = f.endsWith('.jpg') ? ImageIcon : FileText;
                      return (
                        <div key={f} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono text-foreground">{f}</span>
                          </div>
                          {found ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      );
                    })}
                    {folder.files
                      ?.filter((f) => !expectedFiles.includes(f))
                      .map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span className="font-mono">{f}</span>
                        </div>
                      ))}
                    {folder.subfolders?.map((s) => (
                      <div key={s} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Archive className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono text-foreground">{s}/</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">archive Chroma · pgvector pending</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <p className="text-[11px] text-muted-foreground italic pt-2">
            Les archives Chroma sont conservées pour traçabilité. Elles ne sont pas interrogées par l'application —
            une décision technique reste à prendre entre re-vectorisation depuis les sources et extraction des
            embeddings existants.
          </p>
        </div>
      )}
    </div>
  );
}
