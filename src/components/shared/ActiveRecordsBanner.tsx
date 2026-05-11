import { useEffect, useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { supabaseService, type ActiveCanonObject, type ActiveCharacter } from '@/services/supabaseService';

type Mode = 'canon' | 'characters';

export default function ActiveRecordsBanner({ mode, onSelect }: { mode: Mode; onSelect?: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [canon, setCanon] = useState<ActiveCanonObject[]>([]);
  const [chars, setChars] = useState<ActiveCharacter[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (mode === 'canon') setCanon(await supabaseService.getActiveCanonObjects());
      else setChars(await supabaseService.getActiveCharacters());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode]);

  const total = mode === 'canon' ? canon.length : chars.length;
  const needsReview = mode === 'canon'
    ? canon.filter((c) => c.needs_review || c.validation_status === 'pending').length
    : chars.filter((c) => c.needs_review || c.validation_status === 'pending').length;
  const needsIndex = mode === 'canon' ? canon.filter((c) => c.needs_index_refresh).length : 0;

  return (
    <div className={`rounded-xl border p-3 mb-4 text-xs ${total > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-secondary/30'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database size={13} className={total > 0 ? 'text-emerald-600' : 'text-muted-foreground'} />
          <span className="font-mono text-foreground">
            Supabase actif · {total} {mode === 'canon' ? 'objet(s) canon' : 'personnage(s)'}
          </span>
          {total === 0 ? (
            <span className="text-muted-foreground italic">— mock_fallback (démo) en attente d'import OneDrive</span>
          ) : (
            <>
              <span className="text-amber font-mono">{needsReview} à valider</span>
              {mode === 'canon' && needsIndex > 0 && <span className="text-violet font-mono">{needsIndex} index refresh requis</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button onClick={() => setExpanded((x) => !x)} className="text-[11px] text-muted-foreground hover:text-foreground">
              {expanded ? 'Masquer' : 'Voir la liste'}
            </button>
          )}
          <button onClick={load} className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Rafraîchir
          </button>
        </div>
      </div>

      {expanded && total > 0 && (
        <div className="mt-3 pt-3 border-t border-border max-h-64 overflow-y-auto space-y-1">
          {mode === 'canon'
            ? canon.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect?.(c.id)}
                  className="w-full flex items-center justify-between text-left px-2 py-1 rounded hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {c.validation_status === 'validated' ? (
                      <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={10} className="text-amber shrink-0" />
                    )}
                    <span className="text-foreground truncate">{c.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">· {c.category}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">v{c.version} · {c.validation_status}</span>
                </button>
              ))
            : chars.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect?.(c.id)}
                  className="w-full flex items-center justify-between text-left px-2 py-1 rounded hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {c.validation_status === 'validated' ? (
                      <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={10} className="text-amber shrink-0" />
                    )}
                    <span className="text-foreground truncate">{c.name}</span>
                    {c.role && <span className="text-[10px] text-muted-foreground font-mono">· {c.role}</span>}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">{c.validation_status}</span>
                </button>
              ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic mt-2">
        Source : <span className="font-mono">OneDrive</span> · Données actives : <span className="font-mono">Supabase</span>. Les modifications enrichissent Supabase.
      </p>
    </div>
  );
}
