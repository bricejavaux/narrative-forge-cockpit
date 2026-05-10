import { useState } from 'react';
import { indexes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Database, AlertTriangle, RefreshCcw, Loader2, CheckCircle2 } from 'lucide-react';

export default function IndexesPage() {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refresh = (id: string) => {
    setRefreshingId(id);
    setTimeout(() => setRefreshingId(null), 1600);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Atelier</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Indexes vectoriels</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Chaque index est dédié à une finalité narrative. Alimenté par OneDrive et Supabase,
          consulté par les agents OpenAI selon leur objectif.
        </p>
      </div>

      {/* Queue */}
      <div className="cockpit-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="editorial-eyebrow">File d'indexation simulée</h3>
          <span className="text-[11px] text-muted-foreground font-mono">3 jobs en attente · 1 actif</span>
        </div>
        <div className="space-y-2">
          {[
            { name: 'draft_index · réingestion Ch.8 v5', status: 'active' },
            { name: 'style_index · rafraîchissement complet', status: 'pending' },
            { name: 'audio_memory_index · 9 nouvelles notes', status: 'pending' },
            { name: 'world_index · diff canon v3', status: 'pending' },
          ].map((j, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              {j.status === 'active' ? (
                <Loader2 size={12} className="animate-spin text-primary" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber" />
              )}
              <span className="flex-1 text-foreground font-mono">{j.name}</span>
              <span className="text-muted-foreground">{j.status === 'active' ? 'en cours' : 'en attente'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {indexes.map((idx) => (
          <div key={idx.id} className={`cockpit-card space-y-3 ${idx.warning ? 'border-amber/30' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-primary" strokeWidth={1.75} />
                <span className="font-mono text-sm text-foreground">{idx.name}</span>
              </div>
              <StatusBadge status={idx.status} />
            </div>

            <p className="text-xs text-foreground/75 leading-relaxed">{idx.purpose}</p>

            <div className="space-y-1.5 text-xs pt-2 border-t border-border">
              <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="text-foreground">{idx.docTypes}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taille</span><span className="font-mono text-foreground">{idx.simulatedSize}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fraîcheur</span><span className="font-mono text-foreground">{idx.simulatedFreshness}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground">{idx.owner}</span></div>
              {idx.migrationStrategy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stratégie</span>
                  <span className="font-mono text-foreground/80">
                    {idx.migrationStrategy === 'native-supabase' && 'native Supabase'}
                    {idx.migrationStrategy === 're-vectorize-source' && 're-vectoriser depuis source'}
                    {idx.migrationStrategy === 'extract-chroma' && 'extraire chunks Chroma'}
                    {idx.migrationStrategy === 'pending-decision' && 'décision en attente'}
                  </span>
                </div>
              )}
            </div>

            {idx.linkedAssetIds && idx.linkedAssetIds.length > 0 && (
              <div>
                <p className="editorial-eyebrow mb-1">Assets liés</p>
                <div className="flex flex-wrap gap-1">
                  {idx.linkedAssetIds.map((a) => (
                    <span key={a} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="editorial-eyebrow mb-1">Agents consommateurs</p>
              <div className="flex flex-wrap gap-1">
                {idx.futureAgents.map((a) => (
                  <span key={a} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">{a}</span>
                ))}
              </div>
            </div>

            {idx.warning && (
              <div className="flex items-start gap-1.5 text-xs text-amber bg-amber/5 border border-amber/20 rounded-lg p-2">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                {idx.warning}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => refresh(idx.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {refreshingId === idx.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
                Rafraîchir
              </button>
              <button className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                <CheckCircle2 size={11} /> Valider
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Options techniques pour Chroma OneDrive */}
      <div className="cockpit-card space-y-3">
        <div>
          <h3 className="editorial-eyebrow">Archives Chroma OneDrive — options techniques</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Les fichiers <span className="font-mono">follett/chroma.sqlite3</span>, <span className="font-mono">science_portals/chroma.sqlite3</span> et <span className="font-mono">sf_portals_fiction/chroma.sqlite3</span> sont des archives techniques OneDrive — pas des indexes Supabase actifs. Deux trajectoires possibles :
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="font-display text-sm text-foreground">Option A — Re-vectoriser depuis les sources</p>
            <p className="text-[11px] text-muted-foreground">Repartir des documents originaux (.txt, .pdf, .epub) et reconstruire les indexes natifs Supabase. Garantit cohérence d'embeddings et de chunking.</p>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="font-display text-sm text-foreground">Option B — Extraire chunks + embeddings Chroma</p>
            <p className="text-[11px] text-muted-foreground">Lire les .sqlite3 existants, exporter chunks & vecteurs, ré-injecter dans Supabase. Plus rapide, dépendant du modèle d'origine.</p>
          </div>
        </div>
        <p className="text-[11px] text-amber font-mono">Décision technique à arbitrer avant branchement Supabase.</p>
      </div>
    </div>
  );
}

