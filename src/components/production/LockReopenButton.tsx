import { Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

export default function LockReopenButton({
  locked,
  onLock,
  onReopen,
  disabled,
}: {
  locked: boolean;
  onLock: (reason: string) => void | Promise<void>;
  onReopen: (reason: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="relative inline-block">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs ${
          locked
            ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/5'
            : 'border-border text-muted-foreground hover:text-foreground'
        } disabled:opacity-50`}
      >
        {locked ? <Lock size={11} /> : <Unlock size={11} />}
        {locked ? 'Verrouillé' : 'Verrouiller'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 p-3 bg-card border border-border rounded shadow-lg z-20 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {locked ? 'Réouvrir — déclenche une analyse d’impact' : 'Verrouiller — stable pour l’étape suivante'}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (obligatoire)"
            className="w-full text-xs p-1.5 border border-border rounded bg-surface-2"
            rows={2}
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground px-2 py-1">Annuler</button>
            <button
              disabled={!reason.trim()}
              onClick={async () => {
                if (locked) await onReopen(reason); else await onLock(reason);
                setReason('');
                setOpen(false);
              }}
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
            >
              {locked ? 'Réouvrir' : 'Verrouiller'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
