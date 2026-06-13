import { useState } from 'react';
import { Loader2, Sparkles, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SciencePortalsIngestionPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState('trou de ver stabilité énergie');
  const [topK, setTopK] = useState(5);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const ingest = async (dry: boolean) => {
    setBusy(true); setErr(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('vector-ingest-science-portals', {
        body: { corpus_name: 'science_portals', embedding_model: 'text-embedding-3-small', dry_run: dry },
      });
      if (error) throw error;
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const search = async () => {
    setSearching(true); setSearchResult(null); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('vector-search', {
        body: { query, index_name: 'science_index', corpus: 'science_portals', top_k: topK, min_similarity: 0.2 },
      });
      if (error) throw error;
      setSearchResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setSearching(false); }
  };

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="editorial-heading text-foreground text-base">science_portals — ingestion & test</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 border-amber-500/30">
          ingestion contrôlée — follett & sf_portals_fiction bloqués
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => ingest(true)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          Dry-run
        </button>
        <button
          onClick={() => ingest(false)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          Ingest science_portals (embed_and_store)
        </button>
      </div>

      {err && <p className="text-[11px] text-rose">{err}</p>}
      {result && (
        <details open className="text-[11px]">
          <summary className="cursor-pointer text-muted-foreground">Résultat ingestion ({result?.ok ? 'ok' : 'failed'})</summary>
          <pre className="bg-muted/40 rounded p-2 max-h-48 overflow-auto font-mono text-[10px]">{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <p className="editorial-eyebrow flex items-center gap-1"><Search size={10} /> Tester la recherche</p>
        <div className="flex flex-wrap gap-2 items-end">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ex. trou de ver stabilité énergie"
            className="flex-1 min-w-[200px] rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <label className="text-[10px] text-muted-foreground flex items-center gap-1">
            top_k
            <input
              type="number" min={1} max={20}
              value={topK}
              onChange={(e) => setTopK(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-14 rounded border border-border bg-background px-1 py-0.5 text-xs"
            />
          </label>
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {searching ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
            Rechercher
          </button>
        </div>
        {searchResult && (
          <details open className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground">
              Résultat — mode {searchResult?.mode ?? 'unknown'} · {searchResult?.retrieved_chunks?.length ?? 0} chunk(s)
            </summary>
            {Array.isArray(searchResult?.retrieved_chunks) && searchResult.retrieved_chunks.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {searchResult.retrieved_chunks.map((c: any, i: number) => (
                  <li key={i} className="border border-border rounded p-1.5">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      [{i + 1}] {c.source_file ?? c.chunk_id} · sim={typeof c.similarity === 'number' ? c.similarity.toFixed(3) : '—'}
                    </p>
                    <p className="text-[11px] text-foreground mt-0.5 line-clamp-4">{c.text_excerpt ?? c.text ?? ''}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="bg-muted/40 rounded p-2 max-h-48 overflow-auto font-mono text-[10px]">{JSON.stringify(searchResult, null, 2)}</pre>
            )}
          </details>
        )}
      </div>
    </div>
  );
}
